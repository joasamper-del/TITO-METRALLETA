import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException } from '@nestjs/common';
import { vi } from 'vitest';
import { ExecutionEventService } from './execution-event.service';
import { ExecutionEvent } from '../entities/execution-event.entity';

describe('ExecutionEventService', () => {
  let service: ExecutionEventService;
  let repo: Repository<ExecutionEvent>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExecutionEventService,
        {
          provide: getRepositoryToken(ExecutionEvent),
          useValue: {
            create: vi.fn(),
            save: vi.fn(),
            find: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ExecutionEventService>(ExecutionEventService);
    repo = module.get<Repository<ExecutionEvent>>(
      getRepositoryToken(ExecutionEvent),
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordEvent()', () => {
    it('should create event with valid eventType', async () => {
      const tradeExecId = 'te-789';
      const eventType = 'FILL';
      const data = { filledQty: 10, filledPrice: 100.5 };

      const mockEvent = {
        id: 'ev-111',
        tradeExecution: { id: tradeExecId },
        eventType,
        ...data,
      };

      (repo.create as any).mockReturnValue(mockEvent);
      (repo.save as any).mockResolvedValue(mockEvent);

      const result = await service.recordEvent(tradeExecId, eventType, data);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tradeExecution: expect.objectContaining({ id: tradeExecId }),
          eventType,
        }),
      );
      expect(result.eventType).toBe('FILL');
    });

    it('should throw error if tradeExecutionId missing', async () => {
      await expect(
        service.recordEvent('', 'FILL', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if eventType invalid', async () => {
      await expect(
        service.recordEvent('te-789', 'INVALID_TYPE' as any, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('should preserve broker timestamp', async () => {
      const tradeExecId = 'te-789';
      const brokerTimestamp = new Date('2026-09-12T12:00:00Z');
      const mockEvent = {
        id: 'ev-111',
        tradeExecutionId: tradeExecId,
        eventType: 'FILL',
        brokerTimestamp,
      };

      (repo.create as any).mockReturnValue(mockEvent);
      (repo.save as any).mockResolvedValue(mockEvent);

      const result = await service.recordEvent(tradeExecId, 'FILL', {
        brokerTimestamp,
      });

      expect(result.brokerTimestamp).toBe(brokerTimestamp);
    });

    it('should preserve brokerData as JSONB', async () => {
      const tradeExecId = 'te-789';
      const brokerData = { id: 'bo-999', status: 'filled', fees: 2.5 };
      const mockEvent = {
        id: 'ev-111',
        tradeExecutionId: tradeExecId,
        eventType: 'ORDER_PLACED',
        brokerData,
      };

      (repo.create as any).mockReturnValue(mockEvent);
      (repo.save as any).mockResolvedValue(mockEvent);

      const result = await service.recordEvent(tradeExecId, 'ORDER_PLACED', {
        brokerData,
      });

      expect(result.brokerData).toEqual(brokerData);
    });
  });

  describe('recordOrderPlaced()', () => {
    it('should record ORDER_PLACED event', async () => {
      const tradeExecId = 'te-789';
      const brokerOrderId = 'bo-999';

      const mockEvent = {
        id: 'ev-111',
        tradeExecutionId: tradeExecId,
        eventType: 'ORDER_PLACED',
        brokerData: { brokerOrderId },
      };

      (repo.create as any).mockReturnValue(mockEvent);
      (repo.save as any).mockResolvedValue(mockEvent);

      const result = await service.recordOrderPlaced(tradeExecId, brokerOrderId);

      expect(result.eventType).toBe('ORDER_PLACED');
      expect(result.brokerData).toEqual({ brokerOrderId });
    });

    it('should throw error if brokerOrderId missing', async () => {
      await expect(
        service.recordOrderPlaced('te-789', ''),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('recordFill()', () => {
    it('should record FILL event with qty and price', async () => {
      const tradeExecId = 'te-789';
      const filledQty = 10;
      const filledPrice = 100.5;

      const mockEvent = {
        id: 'ev-111',
        tradeExecutionId: tradeExecId,
        eventType: 'FILL',
        filledQty,
        filledPrice,
      };

      (repo.create as any).mockReturnValue(mockEvent);
      (repo.save as any).mockResolvedValue(mockEvent);

      const result = await service.recordFill(
        tradeExecId,
        filledQty,
        filledPrice,
      );

      expect(result.eventType).toBe('FILL');
      expect(result.filledQty).toBe(filledQty);
      expect(result.filledPrice).toBe(filledPrice);
    });

    it('should throw error if filledQty <= 0', async () => {
      await expect(
        service.recordFill('te-789', 0, 100),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if filledPrice invalid', async () => {
      await expect(
        service.recordFill('te-789', 10, null),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.recordFill('te-789', 10, -5),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('recordRetry()', () => {
    it('should record RETRY event with reason', async () => {
      const tradeExecId = 'te-789';
      const reason = 'Broker timeout';
      const attemptNumber = 2;

      const mockEvent = {
        id: 'ev-111',
        tradeExecutionId: tradeExecId,
        eventType: 'RETRY',
        reason: `${reason} (attempt #${attemptNumber})`,
      };

      (repo.create as any).mockReturnValue(mockEvent);
      (repo.save as any).mockResolvedValue(mockEvent);

      const result = await service.recordRetry(
        tradeExecId,
        reason,
        attemptNumber,
      );

      expect(result.eventType).toBe('RETRY');
      expect(result.reason).toContain('attempt #2');
    });

    it('should throw error if reason missing', async () => {
      await expect(
        service.recordRetry('te-789', '', 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error if attemptNumber < 1', async () => {
      await expect(
        service.recordRetry('te-789', 'reason', 0),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('recordStopLoss()', () => {
    it('should record SL_HIT event', async () => {
      const tradeExecId = 'te-789';
      const exitPrice = 94.5;

      const mockEvent = {
        id: 'ev-111',
        tradeExecution: { id: tradeExecId },
        eventType: 'SL_HIT',
        filledPrice: exitPrice,
      };

      (repo.create as any).mockReturnValue(mockEvent);
      (repo.save as any).mockResolvedValue(mockEvent);

      const result = await service.recordStopLoss(
        tradeExecId,
        exitPrice,
      );

      expect(result.eventType).toBe('SL_HIT');
      expect(result.filledPrice).toBe(exitPrice);
    });

    it('should throw error if exitPrice invalid', async () => {
      await expect(
        service.recordStopLoss('te-789', null),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.recordStopLoss('te-789', -94.5),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTradeHistory()', () => {
    it('should return events ordered by createdAt', async () => {
      const tradeExecId = 'te-789';
      const mockEvents = [
        { id: 'ev-1', eventType: 'ORDER_PLACED', createdAt: new Date('2026-09-12T12:00:00Z') },
        { id: 'ev-2', eventType: 'FILL', createdAt: new Date('2026-09-12T12:05:00Z') },
        { id: 'ev-3', eventType: 'CLOSED', createdAt: new Date('2026-09-12T12:10:00Z') },
      ];

      (repo.find as any).mockResolvedValue(mockEvents);

      const result = await service.getTradeHistory(tradeExecId);

      expect(result).toHaveLength(3);
      expect(result[0].eventType).toBe('ORDER_PLACED');
      expect(result[2].eventType).toBe('CLOSED');
    });

    it('should throw error if tradeExecutionId missing', async () => {
      await expect(service.getTradeHistory('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return empty array if no events', async () => {
      (repo.find as any).mockResolvedValue([]);

      const result = await service.getTradeHistory('te-789');

      expect(result).toEqual([]);
    });
  });

  describe('Event Type Validation', () => {
    const validEventTypes = ['ORDER_PLACED', 'FILL', 'RETRY', 'SL_HIT', 'TP_HIT', 'CLOSED', 'ERROR'];

    validEventTypes.forEach((eventType) => {
      it(`should accept valid eventType: ${eventType}`, async () => {
        const mockEvent = {
          id: 'ev-111',
          eventType,
        };

        (repo.create as any).mockReturnValue(mockEvent);
        (repo.save as any).mockResolvedValue(mockEvent);

        const result = await service.recordEvent('te-789', eventType as any, {});
        expect(result.eventType).toBe(eventType);
      });
    });
  });
});
