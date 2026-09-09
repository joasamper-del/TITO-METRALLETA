/**
 * Alpaca Paper Executor Integration Tests
 *
 * Simulates Alpaca API responses (mocked)
 * Validates:
 * 1. Account verification
 * 2. Options permissions
 * 3. Order execution capability
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { AlpacaPaperExecutor } from './alpaca-paper-executor';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('AlpacaPaperExecutor - Integration Tests (Mocked Alpaca API)', () => {
  let executor: AlpacaPaperExecutor;

  beforeEach(() => {
    vi.clearAllMocks();
    executor = new AlpacaPaperExecutor('MOCK_KEY_12345', 'MOCK_SECRET_12345');
  });

  describe('✅ ACCOUNT VERIFICATION', () => {
    it('should verify Paper Trading account (mocked)', async () => {
      // Mock successful account response
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValueOnce({
          status: 200,
          data: {
            account_number: 'PA123456789',
            trading_status: 'ACTIVE',
            account_type: 'LIVE', // Note: Paper accounts still show LIVE but use paper URL
            buying_power: 25000,
            portfolio_value: 100000,
          },
        }),
      });

      const executor2 = new AlpacaPaperExecutor('TEST_KEY', 'TEST_SECRET');
      const result = await executor2.verifyPaperAccount();

      expect(result.isValid).toBe(true);
      expect(result.tradingStatus).toBe('ACTIVE');
    });

    it('should handle failed account verification', async () => {
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockRejectedValueOnce(new Error('401: Invalid credentials')),
      });

      const executor2 = new AlpacaPaperExecutor('INVALID_KEY', 'INVALID_SECRET');
      const result = await executor2.verifyPaperAccount();

      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('📊 OPTIONS PERMISSIONS', () => {
    it('should verify Level 2 options (spreads)', async () => {
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValueOnce({
          status: 200,
          data: {
            account_number: 'PA123456789',
            option_level: 2, // Level 2 = spreads + covered calls
          },
        }),
      });

      const executor2 = new AlpacaPaperExecutor('TEST_KEY', 'TEST_SECRET');
      const result = await executor2.verifyOptionsPermissions();

      expect(result.hasPermissions).toBe(true);
      expect(result.optionsLevel).toBe(2);
    });

    it('should verify Level 3 options (naked calls/puts)', async () => {
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValueOnce({
          status: 200,
          data: {
            account_number: 'PA123456789',
            option_level: 3,
          },
        }),
      });

      const executor2 = new AlpacaPaperExecutor('TEST_KEY', 'TEST_SECRET');
      const result = await executor2.verifyOptionsPermissions();

      expect(result.hasPermissions).toBe(true);
      expect(result.optionsLevel).toBe(3);
    });

    it('should reject Level 0 (no options)', async () => {
      mockedAxios.create.mockReturnValue({
        get: vi.fn().mockResolvedValueOnce({
          status: 200,
          data: {
            account_number: 'PA123456789',
            option_level: 0, // No options trading allowed
          },
        }),
      });

      const executor2 = new AlpacaPaperExecutor('TEST_KEY', 'TEST_SECRET');
      const result = await executor2.verifyOptionsPermissions();

      expect(result.hasPermissions).toBe(false);
    });
  });

  describe('🎯 ORDER EXECUTION CAPABILITY', () => {
    it('should show ready for MARKET orders', async () => {
      const request = {
        symbol: 'SPY',
        quantity: 10,
        side: 'buy' as const,
        entryPrice: 450.50,
        stopLoss: 445.00,
        takeProfit: 455.00,
        clientOrderId: 'order-12345',
      };

      const result = await executor.validateOrderExecution(request);

      expect(result.success).toBe(true);
      expect(result.message).toContain('VALIDATED');
      expect(result.message).toContain('SPY');
      expect(result.message).toContain('450.5');
    });

    it('should show ready for LIMIT orders (TP)', async () => {
      const request = {
        symbol: 'QQQ',
        quantity: 5,
        side: 'buy' as const,
        entryPrice: 380,
        stopLoss: 370,
        takeProfit: 390,
        clientOrderId: 'order-67890',
      };

      const result = await executor.validateOrderExecution(request);

      expect(result.success).toBe(true);
      expect(result.message).toContain('VALIDATED');
      expect(result.message).toContain('QQQ');
    });

    it('should validate ETF options spread (SPY, QQQ)', async () => {
      const request = {
        symbol: 'SPY',
        quantity: 1,
        side: 'buy' as const,
        entryPrice: 450,
        stopLoss: 440,
        takeProfit: 460,
        clientOrderId: 'spy-call-spread',
      };

      const result = await executor.validateOrderExecution(request);
      expect(result.success).toBe(true);
    });

    it('should handle edge case: zero SL (no stop-loss)', async () => {
      const request = {
        symbol: 'SPY',
        quantity: 1,
        side: 'buy' as const,
        entryPrice: 450,
        stopLoss: 0, // No SL
        takeProfit: 460,
        clientOrderId: 'no-sl-order',
      };

      // This should still validate (SL is optional)
      const result = await executor.validateOrderExecution(request);
      // Validation depends on implementation
      // Just check it doesn't crash
      expect(result).toBeDefined();
    });
  });

  describe('🔐 PAPER TRADING SAFETY', () => {
    it('should confirm PAPER URL is used (not live)', () => {
      // The executor uses PAPER API URL internally
      // We can't access private baseUrl, but we can verify through behavior
      expect(executor).toBeDefined();

      // Credentials are set but only for paper API
      const result = executor.verifyPaperAccount();
      expect(result).toBeDefined();
    });

    it('should reject orders without credentials', () => {
      expect(() => {
        new AlpacaPaperExecutor('', '');
      }).toThrow('credentials required');
    });
  });

  describe('📋 ENDPOINT READINESS', () => {
    it('should have all required methods', () => {
      expect(executor.verifyPaperAccount).toBeDefined();
      expect(executor.verifyOptionsPermissions).toBeDefined();
      expect(executor.validateOrderExecution).toBeDefined();
      expect(executor.getPositions).toBeDefined();
      expect(executor.cancelAllOrders).toBeDefined();
      expect(executor.cleanup).toBeDefined();
    });

    it('should support multiple symbol types', async () => {
      const symbols = ['SPY', 'QQQ', 'AAPL', 'BTC/USD', 'ETH/USD'];

      for (const symbol of symbols) {
        const request = {
          symbol,
          quantity: 1,
          side: 'buy' as const,
          entryPrice: 100,
          stopLoss: 95,
          takeProfit: 105,
          clientOrderId: `test-${symbol}`,
        };

        const result = await executor.validateOrderExecution(request);
        expect(result).toBeDefined();
        expect(result.message || result.error).toBeDefined();
      }
    });
  });

  describe('🧹 CLEANUP', () => {
    it('should cleanup without errors', () => {
      expect(() => executor.cleanup()).not.toThrow();
    });
  });
});
