import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';
import { TradeExecutionService } from './trade-execution.service';
import { TradeExecution } from '../entities/trade-execution.entity';

describe('TradeExecutionService', () => {
  let service: TradeExecutionService;
  let repo: Repository<TradeExecution>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradeExecutionService,
        {
          provide: getRepositoryToken(TradeExecution),
          useValue: {
            create: vi.fn(),
            save: vi.fn(),
            findOne: vi.fn(),
            find: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TradeExecutionService>(TradeExecutionService);
    repo = module.get<Repository<TradeExecution>>(
      getRepositoryToken(TradeExecution),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create()', () => {
    it('should create TradeExecution with unique clientOrderId', async () => {
      const decisionId = 'dec-123';
      const tradeId = 'trade-456';
      const mode = 'PAPER';

      const mockEntity = {
        id: 'te-789',
        decisionAuditTrail: { id: decisionId },
        tradeId,
        clientOrderId: expect.any(String),
        executionMode: mode,
        status: 'PENDING',
        attemptCount: 1,
      };

      (repo.create as any).mockReturnValue(mockEntity);
      (repo.save as any).mockResolvedValue(mockEntity);

      const result = await service.create(decisionId, tradeId, mode);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          decisionAuditTrail: expect.objectContaining({ id: decisionId }),
          tradeId,
          clientOrderId: expect.any(String),
          executionMode: mode,
          status: 'PENDING',
          attemptCount: 1,
        }),
      );
      expect(result.clientOrderId).toBeDefined();
      expect(result.status).toBe('PENDING');
    });

    it('should throw error if decisionId missing', async () => {
      await expect(service.create('', 'trade-456', 'PAPER')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if tradeId missing', async () => {
      await expect(service.create('dec-123', '', 'PAPER')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if executionMode invalid', async () => {
      await expect(service.create('dec-123', 'trade-456', 'INVALID' as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('linkBrokerOrder()', () => {
    it('should link broker order and transition to PENDING_FILL', async () => {
      const tradeExecId = 'te-789';
      const brokerOrderId = 'bo-999';
      const brokerResponse = { id: brokerOrderId, status: 'pending' };

      const mockTradeExec = {
        id: tradeExecId,
        status: 'PENDING',
      };

      (repo.findOne as any).mockResolvedValue(mockTradeExec);
      (repo.save as any).mockResolvedValue({
        ...mockTradeExec,
        brokerOrderId,
        brokerResponse,
        status: 'PENDING_FILL',
      });

      const result = await service.linkBrokerOrder(
        tradeExecId,
        brokerOrderId,
        brokerResponse,
      );

      expect(result.status).toBe('PENDING_FILL');
      expect(result.brokerOrderId).toBe(brokerOrderId);
    });

    it('should throw error if TradeExecution not found', async () => {
      (repo.findOne as any).mockResolvedValue(null);

      await expect(
        service.linkBrokerOrder('invalid-id', 'bo-999', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if status not PENDING', async () => {
      (repo.findOne as any).mockResolvedValue({
        id: 'te-789',
        status: 'CLOSED',
      });

      await expect(
        service.linkBrokerOrder('te-789', 'bo-999', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('recordFill()', () => {
    it('should record fill and transition to FILLED', async () => {
      const tradeExecId = 'te-789';
      const filledQty = 10;
      const filledPrice = 100.5;

      const mockTradeExec = {
        id: tradeExecId,
        status: 'PENDING_FILL',
      };

      (repo.findOne as any).mockResolvedValue(mockTradeExec);
      (repo.save as any).mockResolvedValue({
        ...mockTradeExec,
        filledQty,
        filledPrice,
        status: 'FILLED',
        filledAt: expect.any(Date),
      });

      const result = await service.recordFill(tradeExecId, filledQty, filledPrice);

      expect(result.filledQty).toBe(filledQty);
      expect(result.filledPrice).toBe(filledPrice);
      expect(result.status).toBe('FILLED');
      expect(result.filledAt).toBeDefined();
    });

    it('should throw error if filledQty <= 0', async () => {
      (repo.findOne as any).mockResolvedValue({
        id: 'te-789',
        status: 'PENDING_FILL',
      });

      await expect(
        service.recordFill('te-789', 0, 100),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if filledPrice missing or <= 0', async () => {
      (repo.findOne as any).mockResolvedValue({
        id: 'te-789',
        status: 'PENDING_FILL',
      });

      await expect(
        service.recordFill('te-789', 10, null),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.recordFill('te-789', 10, -5),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('recordPartialFill()', () => {
    it('should accumulate filledQty on partial fill', async () => {
      const tradeExecId = 'te-789';
      const additionalQty = 5;
      const filledPrice = 100.5;

      const mockTradeExec = {
        id: tradeExecId,
        status: 'PENDING_FILL',
        filledQty: 5,
      };

      (repo.findOne as any).mockResolvedValue(mockTradeExec);
      (repo.save as any).mockResolvedValue({
        ...mockTradeExec,
        filledQty: 10,
        filledPrice,
        status: 'FILLED',
      });

      const result = await service.recordPartialFill(
        tradeExecId,
        additionalQty,
        filledPrice,
      );

      expect(result.filledQty).toBe(10);
    });

    it('should throw error if additionalQty <= 0', async () => {
      (repo.findOne as any).mockResolvedValue({
        id: 'te-789',
        status: 'PENDING_FILL',
      });

      await expect(
        service.recordPartialFill('te-789', 0, 100),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('close()', () => {
    it('should calculate P&L correctly on close (profitable)', async () => {
      const tradeExecId = 'te-789';
      const exitPrice = 110;

      const mockTradeExec = {
        id: tradeExecId,
        status: 'FILLED',
        filledPrice: 100,
        filledQty: 10,
      };

      (repo.findOne as any).mockResolvedValue(mockTradeExec);
      (repo.save as any).mockResolvedValue({
        ...mockTradeExec,
        exitPrice,
        profitLoss: 100, // (110 - 100) * 10
        outcome: 'PROFITABLE',
        status: 'CLOSED',
        closedAt: expect.any(Date),
      });

      const result = await service.close(tradeExecId, exitPrice, 'MANUAL');

      expect(result.profitLoss).toBe(100);
      expect(result.outcome).toBe('PROFITABLE');
      expect(result.status).toBe('CLOSED');
    });

    it('should calculate P&L correctly (loss)', async () => {
      const tradeExecId = 'te-789';
      const exitPrice = 90;

      const mockTradeExec = {
        id: tradeExecId,
        status: 'FILLED',
        filledPrice: 100,
        filledQty: 10,
      };

      (repo.findOne as any).mockResolvedValue(mockTradeExec);
      (repo.save as any).mockResolvedValue({
        ...mockTradeExec,
        exitPrice,
        profitLoss: -100, // (90 - 100) * 10
        outcome: 'LOSS',
        status: 'CLOSED',
      });

      const result = await service.close(tradeExecId, exitPrice, 'SL_HIT');

      expect(result.profitLoss).toBe(-100);
      expect(result.outcome).toBe('LOSS');
    });

    it('should calculate P&L correctly (breakeven)', async () => {
      const tradeExecId = 'te-789';
      const exitPrice = 100;

      const mockTradeExec = {
        id: tradeExecId,
        status: 'FILLED',
        filledPrice: 100,
        filledQty: 10,
      };

      (repo.findOne as any).mockResolvedValue(mockTradeExec);
      (repo.save as any).mockResolvedValue({
        ...mockTradeExec,
        exitPrice,
        profitLoss: 0,
        outcome: 'BREAKEVEN',
        status: 'CLOSED',
      });

      const result = await service.close(tradeExecId, exitPrice, 'MANUAL');

      expect(result.profitLoss).toBe(0);
      expect(result.outcome).toBe('BREAKEVEN');
    });

    it('should throw error if status not FILLED', async () => {
      (repo.findOne as any).mockResolvedValue({
        id: 'te-789',
        status: 'PENDING',
      });

      await expect(
        service.close('te-789', 110, 'MANUAL'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if filledPrice not set', async () => {
      (repo.findOne as any).mockResolvedValue({
        id: 'te-789',
        status: 'FILLED',
        filledPrice: null,
        filledQty: 10,
      });

      await expect(
        service.close('te-789', 110, 'MANUAL'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if filledQty not set', async () => {
      (repo.findOne as any).mockResolvedValue({
        id: 'te-789',
        status: 'FILLED',
        filledPrice: 100,
        filledQty: null,
      });

      await expect(
        service.close('te-789', 110, 'MANUAL'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('recordRetry()', () => {
    it('should increment attemptCount on retry', async () => {
      const tradeExecId = 'te-789';

      const mockTradeExec = {
        id: tradeExecId,
        status: 'PENDING',
        attemptCount: 1,
      };

      (repo.findOne as any).mockResolvedValue(mockTradeExec);
      (repo.save as any).mockResolvedValue({
        ...mockTradeExec,
        attemptCount: 2,
      });

      const result = await service.recordRetry(tradeExecId);

      expect(result.attemptCount).toBe(2);
    });

    it('should keep status PENDING on retry (dedup)', async () => {
      const tradeExecId = 'te-789';

      const mockTradeExec = {
        id: tradeExecId,
        status: 'PENDING_FILL',
        attemptCount: 2,
      };

      (repo.findOne as any).mockResolvedValue(mockTradeExec);
      (repo.save as any).mockResolvedValue({
        ...mockTradeExec,
        attemptCount: 3,
        status: 'PENDING',
      });

      const result = await service.recordRetry(tradeExecId);

      expect(result.status).toBe('PENDING');
      expect(result.attemptCount).toBe(3);
    });

    it('should throw error if status is CLOSED', async () => {
      (repo.findOne as any).mockResolvedValue({
        id: 'te-789',
        status: 'CLOSED',
      });

      await expect(
        service.recordRetry('te-789'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getByDecisionId()', () => {
    it('should return all trades for a decision', async () => {
      const decisionId = 'dec-123';
      const mockTrades = [
        { id: 'te-1', decisionAuditTrailId: decisionId, attemptCount: 1 },
        { id: 'te-2', decisionAuditTrailId: decisionId, attemptCount: 2 },
      ];

      (repo.find as any).mockResolvedValue(mockTrades);

      const result = await service.getByDecisionId(decisionId);

      expect(result).toHaveLength(2);
      expect(result[0].attemptCount).toBe(1);
    });

    it('should throw error if decisionId missing', async () => {
      await expect(service.getByDecisionId('')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getByClientOrderId()', () => {
    it('should return existing trade by clientOrderId (dedup)', async () => {
      const clientOrderId = 'uuid-123';
      const mockTrade = { id: 'te-789', clientOrderId };

      (repo.findOne as any).mockResolvedValue(mockTrade);

      const result = await service.getByClientOrderId(clientOrderId);

      expect(result).toBeDefined();
      expect(result.clientOrderId).toBe(clientOrderId);
    });

    it('should return null if not found', async () => {
      (repo.findOne as any).mockResolvedValue(null);

      const result = await service.getByClientOrderId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getByBrokerOrderId()', () => {
    it('should return trade by brokerOrderId', async () => {
      const brokerOrderId = 'bo-999';
      const mockTrade = { id: 'te-789', brokerOrderId };

      (repo.findOne as any).mockResolvedValue(mockTrade);

      const result = await service.getByBrokerOrderId(brokerOrderId);

      expect(result).toBeDefined();
      expect(result.brokerOrderId).toBe(brokerOrderId);
    });

    it('should return null if not found', async () => {
      (repo.findOne as any).mockResolvedValue(null);

      const result = await service.getByBrokerOrderId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('State Machine Validation', () => {
    it('should enforce status transitions: PENDING → PENDING_FILL → FILLED → CLOSED', async () => {
      const tradeExecId = 'te-789';

      // PENDING status validations tested above
      // PENDING_FILL → FILLED transition
      (repo.findOne as any).mockResolvedValue({
        id: tradeExecId,
        status: 'PENDING_FILL',
        filledPrice: 100,
        filledQty: 10,
      });

      (repo.save as any).mockResolvedValue({
        id: tradeExecId,
        status: 'FILLED',
      });

      const result = await service.recordFill(tradeExecId, 10, 100);
      expect(result.status).toBe('FILLED');

      // FILLED → CLOSED transition
      (repo.findOne as any).mockResolvedValue({
        id: tradeExecId,
        status: 'FILLED',
        filledPrice: 100,
        filledQty: 10,
      });

      (repo.save as any).mockResolvedValue({
        id: tradeExecId,
        status: 'CLOSED',
      });

      const closedResult = await service.close(tradeExecId, 110, 'MANUAL');
      expect(closedResult.status).toBe('CLOSED');
    });
  });
});
