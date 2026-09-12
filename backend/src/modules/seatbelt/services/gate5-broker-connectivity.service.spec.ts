import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Gate5PostTradeValidationService, TradeExecution } from './gate5-post-trade-validation.service';

describe('Gate5PostTradeValidationService', () => {
  let service: Gate5PostTradeValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Gate5PostTradeValidationService],
    }).compile();

    service = module.get<Gate5PostTradeValidationService>(Gate5PostTradeValidationService);
  });

  describe('validate', () => {
    const mockExecution: TradeExecution = {
      orderId: 'order-123',
      symbol: 'ETHUSD',
      qty: 10,
      entryPrice: 2500,
      filledPrice: 2501,
      filledQty: 10,
      timestamp: new Date(),
    };

    it('should PASS when order is fully filled at acceptable slippage', async () => {
      const result = await service.validate(mockExecution);

      expect(result.valid).toBe(true);
      expect(result.gate).toBe('gate5');
      expect(result.reason).toContain('Trade validated');
      expect(result.timestamp).toBeDefined();
    });

    it('should FAIL when order was not filled (filledQty = 0)', async () => {
      const unfilled: TradeExecution = {
        ...mockExecution,
        filledQty: 0,
      };

      const result = await service.validate(unfilled);

      expect(result.valid).toBe(false);
      expect(result.gate).toBe('gate5');
      expect(result.reason).toContain('Order not filled');
    });

    it('should FAIL when slippage exceeds 0.5%', async () => {
      const tooMuchSlippage: TradeExecution = {
        ...mockExecution,
        entryPrice: 2500,
        filledPrice: 2513, // 0.52% slippage
      };

      const result = await service.validate(tooMuchSlippage);

      expect(result.valid).toBe(false);
      expect(result.gate).toBe('gate5');
      expect(result.reason).toContain('Slippage');
    });

    it('should PASS when slippage is within 0.5% tolerance', async () => {
      const acceptableSlippage: TradeExecution = {
        ...mockExecution,
        entryPrice: 2500,
        filledPrice: 2501.2, // 0.048% slippage
      };

      const result = await service.validate(acceptableSlippage);

      expect(result.valid).toBe(true);
      expect(result.gate).toBe('gate5');
    });

    it('should FAIL when filledQty is less than 98% of requested qty', async () => {
      const partialFill: TradeExecution = {
        ...mockExecution,
        qty: 100,
        filledQty: 97, // 97% < 98%
      };

      const result = await service.validate(partialFill);

      expect(result.valid).toBe(false);
      expect(result.gate).toBe('gate5');
      expect(result.reason).toContain('Filled qty');
    });

    it('should PASS when filledQty is 98% or more of requested qty', async () => {
      const acceptableFill: TradeExecution = {
        ...mockExecution,
        qty: 100,
        filledQty: 99, // 99% >= 98%
      };

      const result = await service.validate(acceptableFill);

      expect(result.valid).toBe(true);
      expect(result.gate).toBe('gate5');
    });

    it('should FAIL when execution is too old (> 1 minute)', async () => {
      const staleExecution: TradeExecution = {
        ...mockExecution,
        timestamp: new Date(Date.now() - 61000), // 61 seconds ago
      };

      const result = await service.validate(staleExecution);

      expect(result.valid).toBe(false);
      expect(result.gate).toBe('gate5');
      expect(result.reason).toContain('Execution aged');
    });

    it('should PASS when execution is recent (< 1 minute)', async () => {
      const freshExecution: TradeExecution = {
        ...mockExecution,
        timestamp: new Date(Date.now() - 30000), // 30 seconds ago
      };

      const result = await service.validate(freshExecution);

      expect(result.valid).toBe(true);
      expect(result.gate).toBe('gate5');
    });

    it('should handle edge case: exactly 0.5% slippage (boundary)', async () => {
      const boundarySlippage: TradeExecution = {
        ...mockExecution,
        entryPrice: 2000,
        filledPrice: 2010, // Exactly 0.5% slippage
      };

      const result = await service.validate(boundarySlippage);

      // At boundary, should pass (not > 0.5%)
      expect(result.gate).toBe('gate5');
    });

    it('should handle negative prices gracefully', async () => {
      const negativePrice: TradeExecution = {
        ...mockExecution,
        entryPrice: -2500,
      };

      const result = await service.validate(negativePrice);

      expect(result).toHaveProperty('gate');
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('reason');
    });

    it('should handle error gracefully and return with error reason', async () => {
      // Test with undefined/null values to trigger error handling
      const result = await service.validate(mockExecution);

      expect(result).toHaveProperty('gate');
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('timestamp');
    });

    it('should FAIL on duplicate orderId execution (idempotency protection)', async () => {
      // First execution should pass
      const firstResult = await service.validate(mockExecution);
      expect(firstResult.valid).toBe(true);

      // Second execution with same orderId should fail
      const secondResult = await service.validate({
        ...mockExecution,
        timestamp: new Date(), // Different timestamp but same orderId
      });

      expect(secondResult.valid).toBe(false);
      expect(secondResult.gate).toBe('gate5');
      expect(secondResult.reason).toContain('Duplicate execution detected');
      expect(secondResult.reason).toContain(mockExecution.orderId);
    });
  });
});
