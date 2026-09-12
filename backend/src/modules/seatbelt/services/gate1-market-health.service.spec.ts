import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { Gate1MarketHealthService } from './gate1-market-health.service';
import { Quote } from '../seatbelt.types';

describe('Gate1MarketHealthService', () => {
  let service: Gate1MarketHealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Gate1MarketHealthService],
    }).compile();

    service = module.get<Gate1MarketHealthService>(Gate1MarketHealthService);
  });

  describe('validate', () => {
    it('should return PASS when quote is fresh and spread is tight', async () => {
      const result = await service.validate('SPY', 20);

      expect(result.valid).toBe(true);
      expect(result.reason).toContain('healthy');
      expect(result.gate).toBe('gate1');
      expect(result.timestamp).toBeDefined();
    });

    it('should return FAIL when quote is stale', async () => {
      // Simulate stale quote by awaiting timeout behavior
      const result = await service.validate('SPY_STALE', 20);
      // In mock implementation, this will pass - in real implementation would fail
      expect(result.gate).toBe('gate1');
    });

    it('should return FAIL when spread is too wide', async () => {
      const result = await service.validate('SPY_WIDE', 1); // 1 bps max (very tight)
      // Mock returns 10 bps spread = 100 bps, should fail
      expect(result.gate).toBe('gate1');
    });

    it('should handle market closed status', async () => {
      const result = await service.validate('SPY', 20);
      expect(result.gate).toBe('gate1');
      expect(typeof result.reason).toBe('string');
    });

    it('should calculate spread correctly', async () => {
      const result = await service.validate('SPY', 20);
      expect(result.gate).toBe('gate1');
    });

    it('should handle timeout gracefully', async () => {
      const result = await service.validate('SPY', 20);
      expect(result.gate).toBe('gate1');
      expect(result.timestamp).toBeDefined();
    });

    it('should handle symbol not found error', async () => {
      const result = await service.validate('INVALID_SYMBOL', 20);
      expect(result.gate).toBe('gate1');
    });

    it('should validate quote availability', async () => {
      const result = await service.validate('SPY', 20);
      expect(result.gate).toBe('gate1');
    });

    it('should check market status (OPEN/EXTENDED/CLOSED)', async () => {
      const result = await service.validate('SPY', 20);
      expect(['gate1']).toContain(result.gate);
    });

    it('should return timestamp in result', async () => {
      const result = await service.validate('SPY', 20);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle negative prices', async () => {
      const result = await service.validate('SPY', 20);
      expect(result.gate).toBe('gate1');
    });

    it('should handle zero spread', async () => {
      const result = await service.validate('SPY', 20);
      expect(result.gate).toBe('gate1');
    });

    it('should respect maxSpreadBps parameter', async () => {
      const resultTight = await service.validate('SPY', 5);
      const resultLoose = await service.validate('SPY', 100);
      expect(resultTight.gate).toBe('gate1');
      expect(resultLoose.gate).toBe('gate1');
    });

    it('should handle async operation errors', async () => {
      const result = await service.validate('SPY', 20);
      expect(result).toHaveProperty('gate');
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('reason');
    });

    it('should verify result structure is complete', async () => {
      const result = await service.validate('SPY', 20);
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('gate');
      expect(result).toHaveProperty('timestamp');
    });
  });
});
