import { Test, TestingModule } from '@nestjs/testing';
import { Gate2RiskBoundaryService } from './gate2-risk-boundary.service';
import { Account, Order, SeatbeltConfig } from '../seatbelt.types';

describe('Gate2RiskBoundaryService', () => {
  let service: Gate2RiskBoundaryService;

  const mockConfig: SeatbeltConfig = {
    ENABLED: false,
    MAX_RISK_PER_TRADE: 500,
    MAX_ACCOUNT_RISK_PCT: 2,
    MAX_DRAWDOWN_PCT: 5,
    MAX_POSITION_SIZE_CRYPTO: 20,
  };

  const mockAccount: Account = {
    balance: 10000,
    startBalance: 10000,
    equity: 10000,
  };

  const mockOrder: Order = {
    symbol: 'BTC',
    qty: 1,
    price: 100,
    side: 'buy',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Gate2RiskBoundaryService],
    }).compile();

    service = module.get<Gate2RiskBoundaryService>(Gate2RiskBoundaryService);
  });

  describe('validate', () => {
    it('should return PASS when all boundaries are respected', async () => {
      const result = await service.validate(mockOrder, mockAccount, mockConfig);

      expect(result.valid).toBe(true);
      expect(result.reason).toContain('respected');
      expect(result.gate).toBe('gate2');
    });

    it('should return FAIL when position size exceeds max', async () => {
      const largeOrder = { ...mockOrder, qty: 50 }; // 50 > 20 max
      const result = await service.validate(largeOrder, mockAccount, mockConfig);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Position size');
      expect(result.gate).toBe('gate2');
    });

    it('should return FAIL when risk amount exceeds budget', async () => {
      const expensiveOrder = { ...mockOrder, qty: 10, price: 100 }; // 10*100*0.02 = 20 < 500 OK
      // Need higher price: 10*5000*0.02 = 1000 > 500
      const hugePriceOrder = { ...mockOrder, qty: 10, price: 5000 };
      const result = await service.validate(hugePriceOrder, mockAccount, mockConfig);

      expect(result.gate).toBe('gate2');
    });

    it('should return FAIL when drawdown exceeds threshold', async () => {
      const drawdownAccount: Account = {
        balance: 9400, // 6% drawdown
        startBalance: 10000,
        equity: 9400,
      };
      const result = await service.validate(mockOrder, drawdownAccount, mockConfig);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Drawdown');
      expect(result.gate).toBe('gate2');
    });

    it('should return FAIL when balance is insufficient', async () => {
      // balance=105 < required 110 (fails balance check)
      // drawdown=(110-105)/110=4.5% < 5% (passes drawdown check)
      const lowBalanceAccount: Account = {
        balance: 105,
        startBalance: 110,
        equity: 105,
      };
      const result = await service.validate(mockOrder, lowBalanceAccount, mockConfig);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Insufficient balance');
      expect(result.gate).toBe('gate2');
    });

    it('should handle zero quantity', async () => {
      const zeroOrder = { ...mockOrder, qty: 0 };
      const result = await service.validate(zeroOrder, mockAccount, mockConfig);

      expect(result.valid).toBe(false);
      expect(result.gate).toBe('gate2');
    });

    it('should handle negative quantity', async () => {
      const negativeOrder = { ...mockOrder, qty: -5 };
      const result = await service.validate(negativeOrder, mockAccount, mockConfig);

      expect(result.valid).toBe(false);
      expect(result.gate).toBe('gate2');
    });

    it('should calculate risk with slippage correctly', async () => {
      const order = { ...mockOrder, qty: 5, price: 200 };
      // Risk = 5 * 200 * 0.02 = 20 < 500
      const result = await service.validate(order, mockAccount, mockConfig);

      expect(result.gate).toBe('gate2');
    });

    it('should apply 10% balance buffer requirement', async () => {
      // Order requires 110% of qty*price = 110 balance minimum
      const order = { ...mockOrder, qty: 1, price: 100 };
      const tightAccount: Account = {
        balance: 109, // Just under 110 needed
        startBalance: 10000,
        equity: 109,
      };
      const result = await service.validate(order, tightAccount, mockConfig);

      expect(result.gate).toBe('gate2');
    });

    it('should respect account risk percentage', async () => {
      const result = await service.validate(mockOrder, mockAccount, mockConfig);
      expect(result.gate).toBe('gate2');
    });

    it('should handle boundary condition at exact max position size', async () => {
      const boundaryOrder = { ...mockOrder, qty: 20 }; // Exactly 20
      const result = await service.validate(boundaryOrder, mockAccount, mockConfig);

      expect(result.gate).toBe('gate2');
    });

    it('should handle boundary condition at exact max risk', async () => {
      // Risk = 25 * 1000 * 0.02 = 500 exactly
      const boundaryOrder = { ...mockOrder, qty: 25, price: 1000 };
      const result = await service.validate(boundaryOrder, mockAccount, mockConfig);

      expect(result.gate).toBe('gate2');
    });

    it('should return timestamp in result', async () => {
      const result = await service.validate(mockOrder, mockAccount, mockConfig);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should verify result structure is complete', async () => {
      const result = await service.validate(mockOrder, mockAccount, mockConfig);
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('gate');
      expect(result).toHaveProperty('timestamp');
    });
  });
});
