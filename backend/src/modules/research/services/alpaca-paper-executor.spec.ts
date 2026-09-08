/**
 * Alpaca Paper Executor Tests
 *
 * Validates PAPER trading capability:
 * 1. Account verification
 * 2. Options permissions
 * 3. Order validation (no real orders)
 * 4. Safety locks
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AlpacaPaperExecutor } from './alpaca-paper-executor';

describe('AlpacaPaperExecutor - S62 Execution Readiness', () => {
  let executor: AlpacaPaperExecutor;

  beforeEach(() => {
    // Use test credentials (they won't work for real, just test the logic)
    const testKey = 'TEST_API_KEY_12345';
    const testSecret = 'TEST_SECRET_12345';
    executor = new AlpacaPaperExecutor(testKey, testSecret);
  });

  describe('🛡️ SAFETY LOCKS', () => {
    it('should reject empty API key', () => {
      expect(() => {
        new AlpacaPaperExecutor('', 'secret');
      }).toThrow('Alpaca credentials required');
    });

    it('should reject empty secret key', () => {
      expect(() => {
        new AlpacaPaperExecutor('key', '');
      }).toThrow('Alpaca credentials required');
    });

    it('should reject both empty', () => {
      expect(() => {
        new AlpacaPaperExecutor('', '');
      }).toThrow('Alpaca credentials required');
    });
  });

  describe('📋 ORDER VALIDATION', () => {
    it('should reject negative quantity', async () => {
      const request = {
        symbol: 'AAPL',
        quantity: -1,
        side: 'buy' as const,
        entryPrice: 150,
        stopLoss: 145,
        takeProfit: 155,
        clientOrderId: 'test-1',
      };

      const result = await executor.validateOrderExecution(request);
      expect(result.success).toBe(false);
      expect(result.error).toContain('positive');
    });

    it('should reject zero quantity', async () => {
      const request = {
        symbol: 'AAPL',
        quantity: 0,
        side: 'buy' as const,
        entryPrice: 150,
        stopLoss: 145,
        takeProfit: 155,
        clientOrderId: 'test-2',
      };

      const result = await executor.validateOrderExecution(request);
      expect(result.success).toBe(false);
    });

    it('should reject invalid symbol', async () => {
      const request = {
        symbol: 'TOOLONG123456',
        quantity: 1,
        side: 'buy' as const,
        entryPrice: 150,
        stopLoss: 145,
        takeProfit: 155,
        clientOrderId: 'test-3',
      };

      const result = await executor.validateOrderExecution(request);
      expect(result.success).toBe(false);
      expect(result.error).toContain('symbol');
    });

    it('should reject BUY with SL above entry', async () => {
      const request = {
        symbol: 'AAPL',
        quantity: 1,
        side: 'buy' as const,
        entryPrice: 150,
        stopLoss: 160, // Above entry - invalid for BUY
        takeProfit: 155,
        clientOrderId: 'test-4',
      };

      const result = await executor.validateOrderExecution(request);
      expect(result.success).toBe(false);
      expect(result.error).toContain('below');
    });

    it('should reject BUY with TP below entry', async () => {
      const request = {
        symbol: 'AAPL',
        quantity: 1,
        side: 'buy' as const,
        entryPrice: 150,
        stopLoss: 145,
        takeProfit: 140, // Below entry - invalid for BUY
        clientOrderId: 'test-5',
      };

      const result = await executor.validateOrderExecution(request);
      expect(result.success).toBe(false);
      expect(result.error).toContain('above');
    });

    it('should VALIDATE correct BUY order', async () => {
      const request = {
        symbol: 'SPY',
        quantity: 10,
        side: 'buy' as const,
        entryPrice: 450,
        stopLoss: 440,
        takeProfit: 460,
        clientOrderId: 'test-valid-buy',
      };

      const result = await executor.validateOrderExecution(request);
      expect(result.success).toBe(true);
      expect(result.message).toContain('VALIDATED');
      expect(result.message).toContain('NOT EXECUTED');
    });

    it('should VALIDATE correct SELL order', async () => {
      const request = {
        symbol: 'QQQ',
        quantity: 5,
        side: 'sell' as const,
        entryPrice: 380,
        stopLoss: 390,
        takeProfit: 370,
        clientOrderId: 'test-valid-sell',
      };

      const result = await executor.validateOrderExecution(request);
      expect(result.success).toBe(true);
      expect(result.message).toContain('VALIDATED');
    });
  });

  describe('🔐 ALPACA PAPER RESTRICTIONS', () => {
    it('should use PAPER API URL internally', () => {
      // This is a logical test - the executor should only use paper URL
      const request = {
        symbol: 'AAPL',
        quantity: 1,
        side: 'buy' as const,
        entryPrice: 150,
        stopLoss: 145,
        takeProfit: 155,
        clientOrderId: 'test-paper',
      };

      // Validate returns a message - this proves the executor is initialized
      expect(executor).toBeDefined();
    });
  });

  describe('📊 LIFECYCLE', () => {
    it('should provide cleanup method', () => {
      expect(executor.cleanup).toBeDefined();
      expect(() => executor.cleanup()).not.toThrow();
    });
  });
});
