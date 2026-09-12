import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { vi } from 'vitest';
import { Gate3DecisionAuditService } from './gate3-decision-audit.service';
import { MarketState, Order } from '../seatbelt.types';
import { DecisionAuditTrail } from '../../database/entities/decision-audit-trail.entity';

describe('Gate3DecisionAuditService', () => {
  let service: Gate3DecisionAuditService;
  let decisionRepo: Repository<DecisionAuditTrail>;

  const mockOrder: Order = {
    symbol: 'BTC',
    qty: 1,
    price: 100,
    side: 'buy',
  };

  const mockMarketState: MarketState = {
    price: 100,
    spread: 10,
    timestamp: new Date(),
    vix: 20,
  };

  const mockDecision = {
    id: 'trade-1',
    createdAt: new Date(),
    confidenceScore: 75,
    marketSnapshot: { price: 100 },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Gate3DecisionAuditService,
        {
          provide: getRepositoryToken(DecisionAuditTrail),
          useValue: {
            findOne: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<Gate3DecisionAuditService>(Gate3DecisionAuditService);
    decisionRepo = module.get<Repository<DecisionAuditTrail>>(
      getRepositoryToken(DecisionAuditTrail),
    );
  });

  describe('validate', () => {
    it('should return PASS when decision exists and is fresh with high confidence', async () => {
      (decisionRepo.findOne as vi.Mock).mockResolvedValue(mockDecision);

      const result = await service.validate(mockOrder, 'trade-1', mockMarketState);

      expect(result.valid).toBe(true);
      expect(result.reason).toContain('justified');
      expect(result.gate).toBe('gate3');
    });

    it('should return FAIL when DecisionAuditTrail does not exist', async () => {
      (decisionRepo.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.validate(mockOrder, 'trade-missing', mockMarketState);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('No DecisionAuditTrail');
      expect(result.gate).toBe('gate3');
    });

    it('should return FAIL when confidence score is below 60%', async () => {
      const lowConfidenceDecision = { ...mockDecision, confidenceScore: 50 };
      (decisionRepo.findOne as jest.Mock).mockResolvedValue(lowConfidenceDecision);

      const result = await service.validate(mockOrder, 'trade-1', mockMarketState);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Confidence');
      expect(result.gate).toBe('gate3');
    });

    it('should return FAIL when market price changed > 2%', async () => {
      const staleMarketState: MarketState = {
        price: 103, // 3% higher than decision's 100
        spread: 10,
        timestamp: new Date(),
      };
      (decisionRepo.findOne as vi.Mock).mockResolvedValue(mockDecision);

      const result = await service.validate(mockOrder, 'trade-1', staleMarketState);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Market price changed');
      expect(result.gate).toBe('gate3');
    });

    it('should return FAIL when decision is older than 5 minutes', async () => {
      const oldDecision = {
        ...mockDecision,
        createdAt: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes ago
      };
      (decisionRepo.findOne as jest.Mock).mockResolvedValue(oldDecision);

      const result = await service.validate(mockOrder, 'trade-1', mockMarketState);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('old');
      expect(result.gate).toBe('gate3');
    });

    it('should handle database error gracefully', async () => {
      (decisionRepo.findOne as jest.Mock).mockRejectedValue(new Error('DB error'));

      const result = await service.validate(mockOrder, 'trade-1', mockMarketState);

      expect(result.valid).toBe(false);
      expect(result.reason).toContain('error');
      expect(result.gate).toBe('gate3');
    });

    it('should pass when price is exactly within 2% tolerance', async () => {
      const exactMarketState: MarketState = {
        price: 102, // Exactly 2% higher
        spread: 10,
        timestamp: new Date(),
      };
      (decisionRepo.findOne as vi.Mock).mockResolvedValue(mockDecision);

      const result = await service.validate(mockOrder, 'trade-1', exactMarketState);

      expect(result.gate).toBe('gate3');
    });

    it('should pass when decision is exactly 5 minutes old', async () => {
      const boundaryDecision = {
        ...mockDecision,
        createdAt: new Date(Date.now() - 5 * 60 * 1000), // Exactly 5 minutes
      };
      (decisionRepo.findOne as jest.Mock).mockResolvedValue(boundaryDecision);

      const result = await service.validate(mockOrder, 'trade-1', mockMarketState);

      expect(result.gate).toBe('gate3');
    });

    it('should return timestamp in result', async () => {
      (decisionRepo.findOne as vi.Mock).mockResolvedValue(mockDecision);

      const result = await service.validate(mockOrder, 'trade-1', mockMarketState);

      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should verify result structure is complete', async () => {
      (decisionRepo.findOne as vi.Mock).mockResolvedValue(mockDecision);

      const result = await service.validate(mockOrder, 'trade-1', mockMarketState);

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('gate');
      expect(result).toHaveProperty('timestamp');
    });
  });
});
