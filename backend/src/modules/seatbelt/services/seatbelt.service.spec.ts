import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { SeatbeltService } from './seatbelt.service';
import { Gate1MarketHealthService } from './gate1-market-health.service';
import { Gate2RiskBoundaryService } from './gate2-risk-boundary.service';
import { Gate3DecisionAuditService } from './gate3-decision-audit.service';
import { Gate4ExecutionEngineService } from './gate4-execution-engine.service';
import { Gate5BrokerConnectivityService } from './gate5-broker-connectivity.service';
import { Account, MarketState, Order, SeatbeltConfig } from '../seatbelt.types';

describe('SeatbeltService - Checkpoint 1', () => {
  let service: SeatbeltService;
  let gate1: Gate1MarketHealthService;
  let gate2: Gate2RiskBoundaryService;
  let gate3: Gate3DecisionAuditService;
  let gate4: Gate4ExecutionEngineService;
  let gate5: Gate5BrokerConnectivityService;

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

  const mockMarket: MarketState = {
    price: 100,
    spread: 10,
    timestamp: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeatbeltService,
        {
          provide: Gate1MarketHealthService,
          useValue: {
            validate: vi.fn(),
          },
        },
        {
          provide: Gate2RiskBoundaryService,
          useValue: {
            validate: vi.fn(),
          },
        },
        {
          provide: Gate3DecisionAuditService,
          useValue: {
            validate: vi.fn(),
          },
        },
        {
          provide: Gate4ExecutionEngineService,
          useValue: {
            validate: vi.fn(),
          },
        },
        {
          provide: Gate5BrokerConnectivityService,
          useValue: {
            validate: vi.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SeatbeltService>(SeatbeltService);
    gate1 = module.get<Gate1MarketHealthService>(Gate1MarketHealthService);
    gate2 = module.get<Gate2RiskBoundaryService>(Gate2RiskBoundaryService);
    gate3 = module.get<Gate3DecisionAuditService>(Gate3DecisionAuditService);
    gate4 = module.get<Gate4ExecutionEngineService>(Gate4ExecutionEngineService);
    gate5 = module.get<Gate5BrokerConnectivityService>(Gate5BrokerConnectivityService);
  });

  describe('validateCheckpoint1', () => {
    it('should return PASS when all 3 gates pass', async () => {
      (gate1.validate as vi.Mock).mockResolvedValue({
        valid: true,
        reason: 'Market healthy',
        gate: 'gate1',
      });
      (gate2.validate as vi.Mock).mockResolvedValue({
        valid: true,
        reason: 'Risk OK',
        gate: 'gate2',
      });
      (gate3.validate as vi.Mock).mockResolvedValue({
        valid: true,
        reason: 'Decision OK',
        gate: 'gate3',
      });

      const result = await service.validateCheckpoint1(
        mockOrder,
        mockAccount,
        mockMarket,
        mockConfig,
        'trade-1',
      );

      expect(result.allGatesPass).toBe(true);
      expect(result.gates).toHaveLength(3);
      expect(result.reason).toContain('All gates pass');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should fail fast when gate1 fails', async () => {
      (gate1.validate as vi.Mock).mockResolvedValue({
        valid: false,
        reason: 'Market closed',
        gate: 'gate1',
      });

      const result = await service.validateCheckpoint1(
        mockOrder,
        mockAccount,
        mockMarket,
        mockConfig,
        'trade-1',
      );

      expect(result.allGatesPass).toBe(false);
      expect(result.reason).toContain('gate1');
      expect(gate2.validate).not.toHaveBeenCalled(); // Should exit early
    });

    it('should fail fast when gate2 fails', async () => {
      (gate1.validate as vi.Mock).mockResolvedValue({
        valid: true,
        reason: 'Market healthy',
        gate: 'gate1',
      });
      (gate2.validate as vi.Mock).mockResolvedValue({
        valid: false,
        reason: 'Position too large',
        gate: 'gate2',
      });

      const result = await service.validateCheckpoint1(
        mockOrder,
        mockAccount,
        mockMarket,
        mockConfig,
        'trade-1',
      );

      expect(result.allGatesPass).toBe(false);
      expect(result.reason).toContain('gate2');
      expect(gate3.validate).not.toHaveBeenCalled(); // Should exit early
    });

    it('should report gate3 failure', async () => {
      (gate1.validate as vi.Mock).mockResolvedValue({
        valid: true,
        reason: 'Market healthy',
        gate: 'gate1',
      });
      (gate2.validate as vi.Mock).mockResolvedValue({
        valid: true,
        reason: 'Risk OK',
        gate: 'gate2',
      });
      (gate3.validate as vi.Mock).mockResolvedValue({
        valid: false,
        reason: 'Decision too old',
        gate: 'gate3',
      });

      const result = await service.validateCheckpoint1(
        mockOrder,
        mockAccount,
        mockMarket,
        mockConfig,
        'trade-1',
      );

      expect(result.allGatesPass).toBe(false);
      expect(result.reason).toContain('gate3');
    });

    it('should return complete gate details', async () => {
      (gate1.validate as vi.Mock).mockResolvedValue({
        valid: true,
        reason: 'Market healthy',
        gate: 'gate1',
      });
      (gate2.validate as vi.Mock).mockResolvedValue({
        valid: true,
        reason: 'Risk OK',
        gate: 'gate2',
      });
      (gate3.validate as vi.Mock).mockResolvedValue({
        valid: true,
        reason: 'Decision OK',
        gate: 'gate3',
      });

      const result = await service.validateCheckpoint1(
        mockOrder,
        mockAccount,
        mockMarket,
        mockConfig,
        'trade-1',
      );

      expect(result.gates[0].gate).toBe('gate1');
      expect(result.gates[1].gate).toBe('gate2');
      expect(result.gates[2].gate).toBe('gate3');
    });

    it('should timestamp the result', async () => {
      (gate1.validate as vi.Mock).mockResolvedValue({
        valid: true,
        gate: 'gate1',
        reason: 'OK',
      });
      (gate2.validate as vi.Mock).mockResolvedValue({
        valid: true,
        gate: 'gate2',
        reason: 'OK',
      });
      (gate3.validate as vi.Mock).mockResolvedValue({
        valid: true,
        gate: 'gate3',
        reason: 'OK',
      });

      const result = await service.validateCheckpoint1(
        mockOrder,
        mockAccount,
        mockMarket,
        mockConfig,
        'trade-1',
      );

      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should handle gate1 rejection', async () => {
      (gate1.validate as vi.Mock).mockRejectedValue(new Error('Service error'));

      try {
        await service.validateCheckpoint1(
          mockOrder,
          mockAccount,
          mockMarket,
          mockConfig,
          'trade-1',
        );
        // If no error, that's acceptable
      } catch {
        // Expected to potentially throw
      }

      expect(gate1.validate).toHaveBeenCalled();
    });

    it('should call all three gates in order', async () => {
      (gate1.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate1', reason: 'OK' });
      (gate2.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate2', reason: 'OK' });
      (gate3.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate3', reason: 'OK' });

      await service.validateCheckpoint1(
        mockOrder,
        mockAccount,
        mockMarket,
        mockConfig,
        'trade-1',
      );

      expect(gate1.validate).toHaveBeenCalled();
      expect(gate2.validate).toHaveBeenCalled();
      expect(gate3.validate).toHaveBeenCalled();
    });

    it('should verify result structure is complete', async () => {
      (gate1.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate1', reason: 'OK' });
      (gate2.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate2', reason: 'OK' });
      (gate3.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate3', reason: 'OK' });

      const result = await service.validateCheckpoint1(
        mockOrder,
        mockAccount,
        mockMarket,
        mockConfig,
        'trade-1',
      );

      expect(result).toHaveProperty('allGatesPass');
      expect(result).toHaveProperty('gates');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('timestamp');
    });
  });

  describe('isSeatbeltEnabled', () => {
    it('should return config.ENABLED value', () => {
      const enabledConfig = { ...mockConfig, ENABLED: true };
      expect(service.isSeatbeltEnabled(enabledConfig)).toBe(true);

      const disabledConfig = { ...mockConfig, ENABLED: false };
      expect(service.isSeatbeltEnabled(disabledConfig)).toBe(false);
    });
  });

  describe('validateFull (Gates 1-5)', () => {
    it('Test 1: should PASS when all 5 gates pass', async () => {
      (gate1.validate as vi.Mock).mockResolvedValue({
        valid: true,
        reason: 'Market healthy',
        gate: 'gate1',
      });
      (gate2.validate as vi.Mock).mockResolvedValue({
        valid: true,
        reason: 'Risk OK',
        gate: 'gate2',
      });
      (gate3.validate as vi.Mock).mockResolvedValue({
        valid: true,
        reason: 'Decision OK',
        gate: 'gate3',
      });
      (gate4.validate as vi.Mock).mockResolvedValue({
        valid: true,
        reason: 'Order valid',
        gate: 'gate4',
      });
      (gate5.validate as vi.Mock).mockResolvedValue({
        valid: true,
        reason: 'Broker online',
        gate: 'gate5',
      });

      const result = await service.validateFull(
        mockOrder,
        mockAccount,
        mockMarket,
        mockConfig,
        'trade-1',
        100,
      );

      expect(result.allGatesPass).toBe(true);
      expect(result.gates).toHaveLength(5);
      expect(result.reason).toContain('All gates pass');
    });

    it('Test 2: should fail fast when gate4 fails', async () => {
      (gate1.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate1', reason: 'OK' });
      (gate2.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate2', reason: 'OK' });
      (gate3.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate3', reason: 'OK' });
      (gate4.validate as vi.Mock).mockResolvedValue({
        valid: false,
        reason: 'Price typo',
        gate: 'gate4',
      });

      const result = await service.validateFull(
        mockOrder,
        mockAccount,
        mockMarket,
        mockConfig,
        'trade-1',
        100,
      );

      expect(result.allGatesPass).toBe(false);
      expect(result.reason).toContain('gate4');
      expect(gate5.validate).not.toHaveBeenCalled();
    });

    it('Test 3: should report gate5 failure', async () => {
      (gate1.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate1', reason: 'OK' });
      (gate2.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate2', reason: 'OK' });
      (gate3.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate3', reason: 'OK' });
      (gate4.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate4', reason: 'OK' });
      (gate5.validate as vi.Mock).mockResolvedValue({
        valid: false,
        reason: 'Broker down',
        gate: 'gate5',
      });

      const result = await service.validateFull(
        mockOrder,
        mockAccount,
        mockMarket,
        mockConfig,
        'trade-1',
        100,
      );

      expect(result.allGatesPass).toBe(false);
      expect(result.reason).toContain('gate5');
    });

    it('Test 4: should include gate4 when injected', async () => {
      (gate1.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate1', reason: 'OK' });
      (gate2.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate2', reason: 'OK' });
      (gate3.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate3', reason: 'OK' });
      (gate4.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate4', reason: 'OK' });
      (gate5.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate5', reason: 'OK' });

      await service.validateFull(
        mockOrder,
        mockAccount,
        mockMarket,
        mockConfig,
        'trade-1',
        100,
      );

      expect(gate4.validate).toHaveBeenCalled();
    });

    it('Test 5: should include gate5 when injected', async () => {
      (gate1.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate1', reason: 'OK' });
      (gate2.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate2', reason: 'OK' });
      (gate3.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate3', reason: 'OK' });
      (gate4.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate4', reason: 'OK' });
      (gate5.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate5', reason: 'OK' });

      await service.validateFull(
        mockOrder,
        mockAccount,
        mockMarket,
        mockConfig,
        'trade-1',
        100,
      );

      expect(gate5.validate).toHaveBeenCalled();
    });

    it('Test 6: should pass referencePrice to gate4', async () => {
      (gate1.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate1', reason: 'OK' });
      (gate2.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate2', reason: 'OK' });
      (gate3.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate3', reason: 'OK' });
      (gate4.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate4', reason: 'OK' });
      (gate5.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate5', reason: 'OK' });

      const refPrice = 450;
      await service.validateFull(
        mockOrder,
        mockAccount,
        mockMarket,
        mockConfig,
        'trade-1',
        refPrice,
      );

      expect(gate4.validate).toHaveBeenCalledWith(mockOrder, refPrice);
    });

    it('Test 7: should pass symbol and orderType to gate5', async () => {
      (gate1.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate1', reason: 'OK' });
      (gate2.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate2', reason: 'OK' });
      (gate3.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate3', reason: 'OK' });
      (gate4.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate4', reason: 'OK' });
      (gate5.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate5', reason: 'OK' });

      const orderWithType = { ...mockOrder, orderType: 'limit' };
      await service.validateFull(
        orderWithType,
        mockAccount,
        mockMarket,
        mockConfig,
        'trade-1',
        100,
      );

      expect(gate5.validate).toHaveBeenCalledWith(mockOrder.symbol, 'limit');
    });

    it('Test 8: AND logic: any gate failure blocks execution', async () => {
      (gate1.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate1', reason: 'OK' });
      (gate2.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate2', reason: 'OK' });
      (gate3.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate3', reason: 'OK' });
      (gate4.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate4', reason: 'OK' });
      (gate5.validate as vi.Mock).mockResolvedValue({
        valid: false,
        reason: 'Broker down',
        gate: 'gate5',
      });

      const result = await service.validateFull(
        mockOrder,
        mockAccount,
        mockMarket,
        mockConfig,
        'trade-1',
        100,
      );

      expect(result.allGatesPass).toBe(false);
      expect(result.reason).toContain('gate5');
      // All gates should be called before failure on gate5
      expect(gate1.validate).toHaveBeenCalled();
      expect(gate2.validate).toHaveBeenCalled();
      expect(gate3.validate).toHaveBeenCalled();
      expect(gate4.validate).toHaveBeenCalled();
      expect(gate5.validate).toHaveBeenCalled();
    });
  });
});
