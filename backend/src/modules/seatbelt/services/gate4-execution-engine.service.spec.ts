import { Test, TestingModule } from '@nestjs/testing';
import { Gate4ExecutionEngineService } from './gate4-execution-engine.service';
import { Order } from '../seatbelt.types';

describe('Gate4ExecutionEngineService', () => {
  let service: Gate4ExecutionEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Gate4ExecutionEngineService],
    }).compile();

    service = module.get<Gate4ExecutionEngineService>(Gate4ExecutionEngineService);
  });

  describe('validate', () => {
    const validOrder: Order = {
      symbol: 'SPY',
      side: 'buy',
      qty: 10,
      orderType: 'market',
      price: 450,
    };

    it('Test 1: should PASS when order schema is valid and price is reasonable', async () => {
      const result = await service.validate(validOrder, 450);

      expect(result.valid).toBe(true);
      expect(result.gate).toBe('gate4');
      expect(result.reason).toContain('valid');
      expect(result.timestamp).toBeDefined();
    });

    it('Test 2: should FAIL when order symbol is missing', async () => {
      const invalid = { ...validOrder, symbol: '' };
      const result = await service.validate(invalid, 450);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('symbol');
      expect(result.gate).toBe('gate4');
    });

    it('Test 3: should FAIL when order qty is zero or negative', async () => {
      const invalid = { ...validOrder, qty: 0 };
      const result = await service.validate(invalid, 450);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('qty');
    });

    it('Test 4: should FAIL when orderType is not supported', async () => {
      const invalid = { ...validOrder, orderType: 'unsupported_type' };
      const result = await service.validate(invalid, 450);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not supported');
      expect(result.gate).toBe('gate4');
    });

    it('Test 5: should FAIL when price is a typo (>20% deviation)', async () => {
      const order = { ...validOrder, price: 600 }; // 33% higher than reference 450
      const result = await service.validate(order, 450);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('typo');
      expect(result.reason).toContain('33');
    });

    it('Test 6: should PASS when price is within tolerance (±20%)', async () => {
      const order = { ...validOrder, price: 540 }; // 20% higher = at boundary
      const result = await service.validate(order, 450);

      expect(result.valid).toBe(true);
      expect(result.gate).toBe('gate4');
    });

    it('Test 7: should FAIL when side is invalid', async () => {
      const invalid = { ...validOrder, side: 'invalid' };
      const result = await service.validate(invalid, 450);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Invalid side');
    });

    it('Test 8: should handle null referencePrice gracefully (skip price check)', async () => {
      const order = { ...validOrder, price: 1000 }; // Huge deviation but no reference
      const result = await service.validate(order, undefined);

      expect(result.valid).toBe(true); // Should pass because no reference to compare
      expect(result.gate).toBe('gate4');
    });
  });

  describe('supported orderTypes', () => {
    const baseOrder: Order = {
      symbol: 'ETH',
      side: 'sell',
      qty: 5,
      price: 2500,
    };

    it('should accept market orderType', async () => {
      const result = await service.validate({ ...baseOrder, orderType: 'market' });
      expect(result.valid).toBe(true);
    });

    it('should accept limit orderType', async () => {
      const result = await service.validate({ ...baseOrder, orderType: 'limit' });
      expect(result.valid).toBe(true);
    });

    it('should accept stop orderType', async () => {
      const result = await service.validate({ ...baseOrder, orderType: 'stop' });
      expect(result.valid).toBe(true);
    });

    it('should accept stop_limit orderType', async () => {
      const result = await service.validate({ ...baseOrder, orderType: 'stop_limit' });
      expect(result.valid).toBe(true);
    });

    it('should reject unknown orderType', async () => {
      const result = await service.validate({ ...baseOrder, orderType: 'unknown' });
      expect(result.valid).toBe(false);
    });
  });
});
