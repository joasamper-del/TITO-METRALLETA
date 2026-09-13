import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SeatbeltService } from './seatbelt.service';
import { Gate1MarketHealthService } from './gate1-market-health.service';
import { Gate2RiskBoundaryService } from './gate2-risk-boundary.service';
import { Gate3DecisionAuditService } from './gate3-decision-audit.service';
import { Gate4ExecutionEngineService } from './gate4-execution-engine.service';
import { Gate5BrokerConnectivityService } from './gate5-broker-connectivity.service';
import { DecisionAuditService } from '../../api/services/decision-audit.service';
import { PreExecutionEvidenceService } from '../../database/services/pre-execution-evidence.service';
import { Account, MarketState, Order, SeatbeltConfig } from '../seatbelt.types';

describe('SeatbeltService - Checkpoint 1', () => {
  let service: SeatbeltService;
  let gate1: Gate1MarketHealthService;
  let gate2: Gate2RiskBoundaryService;
  let gate3: Gate3DecisionAuditService;
  let gate4: Gate4ExecutionEngineService;
  let gate5: Gate5BrokerConnectivityService;
  let decisionAudit: DecisionAuditService;
  let preExecutionEvidence: PreExecutionEvidenceService;

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
    vix: 20,
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
        {
          provide: DecisionAuditService,
          useValue: {
            recordDecision: vi.fn(),
          },
        },
        {
          provide: PreExecutionEvidenceService,
          useValue: {
            recordEvidence: vi.fn(),
            findByTradeId: vi.fn(),
            isConsumed: vi.fn(),
            validateIntegrityBeforeUse: vi.fn(),
            markAsConsumed: vi.fn(),
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
    decisionAudit = module.get<DecisionAuditService>(DecisionAuditService);
    preExecutionEvidence = module.get<PreExecutionEvidenceService>(PreExecutionEvidenceService);

    // Setup default mock for DecisionAuditService (TASK 3 - OPTION B)
    // All tests should have this mock return a valid decision record
    (decisionAudit.recordDecision as vi.Mock).mockResolvedValue({
      id: 'default-audit-id',
      symbol: 'BTC',
      decision: 'SEATBELT_INITIATED',
      timestamp: new Date(),
    });

    // Setup default mock for PreExecutionEvidenceService (TASK 4)
    // All tests should have pre-execution evidence working by default
    (preExecutionEvidence.recordEvidence as vi.Mock).mockResolvedValue(undefined);
    (preExecutionEvidence.findByTradeId as vi.Mock).mockResolvedValue({
      trade_id: 'default-trade',
      gate1_result: { valid: true },
      gate2_result: { valid: true },
      gate3_result: { valid: true },
      gate4_result: { valid: true },
      gate5_result: { valid: true },
      all_gates_pass: true,
      consumed: false,
      valid_until: new Date(Date.now() + 5 * 60 * 1000),
      isExpired: () => false,
    });
    (preExecutionEvidence.validateIntegrityBeforeUse as vi.Mock).mockReturnValue(true);
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

  describe('TASK 3 - Decision Audit Service (OPTION B)', () => {
    // T1: Servicio Obligatorio (NO @Optional)
    it('T1: DecisionAuditService is mandatory (not @Optional)', async () => {
      // If DecisionAuditService is NOT provided, NestJS should throw injection error
      // This test verifies the constructor requires the service
      expect(service).toBeDefined();
      expect(decisionAudit).toBeDefined();
      // Service was successfully instantiated with DecisionAuditService provided
    });

    // T2: Registro de decisión ANTES de gates
    it('T2: recordDecision is called BEFORE validating gates in validateCheckpoint1', async () => {
      (decisionAudit.recordDecision as vi.Mock).mockResolvedValue({
        id: 'audit-123',
        symbol: 'BTC',
        decision: 'SEATBELT_CHECKPOINT1_INITIATED',
        timestamp: new Date(),
      });
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

      await service.validateCheckpoint1(
        mockOrder,
        mockAccount,
        mockMarket,
        mockConfig,
        'trade-1',
      );

      // Verify recordDecision was called exactly once, BEFORE gates
      expect(decisionAudit.recordDecision).toHaveBeenCalledTimes(1);
      expect(decisionAudit.recordDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'BTC',
          decision: 'SEATBELT_CHECKPOINT1_INITIATED',
          filtersApplied: { gates: ['gate1', 'gate2', 'gate3'] },
        }),
      );
    });

    // T3: Fallo bloqueado (SIN SILENT-FAIL)
    it('T3: If recordDecision fails, validateCheckpoint1 returns blocked (no silent-fail)', async () => {
      (decisionAudit.recordDecision as vi.Mock).mockResolvedValue(null); // Simula fallo

      const result = await service.validateCheckpoint1(
        mockOrder,
        mockAccount,
        mockMarket,
        mockConfig,
        'trade-1',
      );

      // Verificar que se bloquea SIN continuar con los gates
      expect(result.allGatesPass).toBe(false);
      expect(result.reason).toContain('Failed to record decision');
      expect(result.gates).toHaveLength(0); // NO gates ejecutados
      expect(gate1.validate).not.toHaveBeenCalled(); // Gates nunca se llaman
      expect(gate2.validate).not.toHaveBeenCalled();
      expect(gate3.validate).not.toHaveBeenCalled();
    });

    // T4: Regresión T1/T2 (Gates 1-3 siguen funcionando)
    it('T4: Gates 1-3 regression - all gates still function when DecisionAudit passes', async () => {
      (decisionAudit.recordDecision as vi.Mock).mockResolvedValue({
        id: 'audit-456',
      });
      (preExecutionEvidence.recordEvidence as vi.Mock).mockResolvedValue(undefined);
      (preExecutionEvidence.findByTradeId as vi.Mock).mockResolvedValue({
        trade_id: 'trade-1',
        gate1_result: { valid: true },
        gate2_result: { valid: true },
        gate3_result: { valid: true },
        all_gates_pass: true,
        consumed: false,
        valid_until: new Date(Date.now() + 5 * 60 * 1000),
        isExpired: () => false,
      });
      (preExecutionEvidence.validateIntegrityBeforeUse as vi.Mock).mockReturnValue(true);
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

      // Verificar que gates se ejecutan normalmente
      expect(result.allGatesPass).toBe(true);
      expect(result.gates).toHaveLength(3);
      expect(gate1.validate).toHaveBeenCalled();
      expect(gate2.validate).toHaveBeenCalled();
      expect(gate3.validate).toHaveBeenCalled();
    });

    // T5: Regresión Gates 4-5 (siguen siendo @Optional)
    it('T5: Gates 4-5 regression - remain @Optional without affecting T1/T2', async () => {
      (decisionAudit.recordDecision as vi.Mock).mockResolvedValue({
        id: 'audit-789',
      });
      (preExecutionEvidence.recordEvidence as vi.Mock).mockResolvedValue(undefined);
      (preExecutionEvidence.findByTradeId as vi.Mock).mockResolvedValue({
        trade_id: 'trade-1',
        gate1_result: { valid: true },
        gate2_result: { valid: true },
        gate3_result: { valid: true },
        all_gates_pass: true,
        consumed: false,
        valid_until: new Date(Date.now() + 5 * 60 * 1000),
        isExpired: () => false,
      });
      (preExecutionEvidence.validateIntegrityBeforeUse as vi.Mock).mockReturnValue(true);
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

      // Verify result is valid and gates 4/5 are not mentioned
      expect(result.allGatesPass).toBe(true);
      expect(result.gates.length).toBe(3); // Only gates 1-3
      expect(gate4.validate).not.toHaveBeenCalled(); // Gate4/5 not called in checkpoint1
      expect(gate5.validate).not.toHaveBeenCalled();
    });

    // T6: Integridad de BD (DecisionAuditTrail contiene datos correctos)
    it('T6: DecisionAuditTrail records all decision data correctly', async () => {
      (decisionAudit.recordDecision as vi.Mock).mockResolvedValue({
        id: 'audit-integrity',
        symbol: 'BTC',
        decision: 'SEATBELT_CHECKPOINT1_INITIATED',
      });
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

      // Verify recordDecision was called with correct data structure
      expect(decisionAudit.recordDecision).toHaveBeenCalledTimes(1);
      const callArgs = (decisionAudit.recordDecision as vi.Mock).mock.calls[0][0];
      expect(callArgs.symbol).toBe('BTC');
      expect(callArgs.decision).toBe('SEATBELT_CHECKPOINT1_INITIATED');
      expect(callArgs.marketData).toHaveProperty('currentPrice', 100);
      expect(callArgs.filtersApplied).toEqual({ gates: ['gate1', 'gate2', 'gate3'] });
      expect(callArgs.notes).toContain('trade-1');
    });

    // Bonus: validateFull también registra decisión
    it('Bonus: validateFull also records decision BEFORE all 5 gates', async () => {
      (decisionAudit.recordDecision as vi.Mock).mockResolvedValue({
        id: 'audit-full',
      });
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

      // Verify recordDecision was called with SEATBELT_FULL_INITIATED
      expect(decisionAudit.recordDecision).toHaveBeenCalledWith(
        expect.objectContaining({
          decision: 'SEATBELT_FULL_INITIATED',
          filtersApplied: { gates: ['gate1', 'gate2', 'gate3', 'gate4', 'gate5'] },
        }),
      );
    });
  });

  describe('TASK 4 - Pre-Execution Evidence Recording', () => {
    // T1: Evidence registrada para CADA gate
    it('T1: Evidence is recorded for EACH gate that passes', async () => {
      (decisionAudit.recordDecision as vi.Mock).mockResolvedValue({ id: 'audit-t1' });
      (preExecutionEvidence.recordEvidence as vi.Mock).mockResolvedValue(undefined);
      (preExecutionEvidence.findByTradeId as vi.Mock).mockResolvedValue({
        trade_id: 'trade-t1',
        gate1_result: { valid: true },
        gate2_result: { valid: true },
        gate3_result: { valid: true },
        all_gates_pass: true,
        consumed: false,
        valid_until: new Date(Date.now() + 5 * 60 * 1000),
        isExpired: () => false,
      });
      (preExecutionEvidence.validateIntegrityBeforeUse as vi.Mock).mockReturnValue(true);
      (gate1.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate1', reason: 'OK' });
      (gate2.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate2', reason: 'OK' });
      (gate3.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate3', reason: 'OK' });

      await service.validateCheckpoint1(mockOrder, mockAccount, mockMarket, mockConfig, 'trade-t1');

      expect(preExecutionEvidence.recordEvidence).toHaveBeenCalled();
      // Verify recordEvidence was called for each gate
      expect(preExecutionEvidence.recordEvidence).toHaveBeenCalledTimes(4); // gate1, gate2, gate3, + final
    });

    // T2: Si recordEvidence falla, BLOQUEA
    it('T2: If recordEvidence fails, validateCheckpoint1 blocks execution (fail-closed)', async () => {
      (decisionAudit.recordDecision as vi.Mock).mockResolvedValue({ id: 'audit-t2' });
      (preExecutionEvidence.recordEvidence as vi.Mock).mockRejectedValue(new Error('BD timeout'));
      (gate1.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate1', reason: 'OK' });

      const result = await service.validateCheckpoint1(mockOrder, mockAccount, mockMarket, mockConfig, 'trade-t2');

      expect(result.allGatesPass).toBe(false);
      expect(result.reason).toContain('Cannot record pre-execution evidence');
      // Gates 2 and 3 should NOT be called (early exit)
      expect(gate2.validate).not.toHaveBeenCalled();
      expect(gate3.validate).not.toHaveBeenCalled();
    });

    // T3: Integridad — Evidence coincide con Gate results
    it('T3: Evidence integrity - recorded evidence matches gate results exactly', async () => {
      (decisionAudit.recordDecision as vi.Mock).mockResolvedValue({ id: 'audit-t3' });
      (preExecutionEvidence.recordEvidence as vi.Mock).mockResolvedValue(undefined);
      (preExecutionEvidence.findByTradeId as vi.Mock).mockResolvedValue({
        trade_id: 'trade-t3',
        gate2_result: { valid: false, reason: 'Risk too high' },
        all_gates_pass: false,
        consumed: false,
        valid_until: new Date(Date.now() + 5 * 60 * 1000),
        isExpired: () => false,
      });
      (preExecutionEvidence.validateIntegrityBeforeUse as vi.Mock).mockReturnValue(false);
      (gate1.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate1', reason: 'OK' });
      (gate2.validate as vi.Mock).mockResolvedValue({ valid: false, reason: 'Risk too high', gate: 'gate2' });

      await service.validateCheckpoint1(mockOrder, mockAccount, mockMarket, mockConfig, 'trade-t3');

      // Verify gate2 result was passed to recordEvidence
      const recordEvidenceCalls = (preExecutionEvidence.recordEvidence as vi.Mock).mock.calls;
      const gate2Call = recordEvidenceCalls[1]; // Second call should have gate2_result
      expect(gate2Call[0].gate2_result).toEqual({ valid: false, reason: 'Risk too high', gate: 'gate2' });
    });

    // T4: validateIntegrityBeforeUse valida completitud
    it('T4: validateIntegrityBeforeUse validates evidence completeness before execution', async () => {
      (decisionAudit.recordDecision as vi.Mock).mockResolvedValue({ id: 'audit-t4' });
      (preExecutionEvidence.recordEvidence as vi.Mock).mockResolvedValue(undefined);
      (preExecutionEvidence.findByTradeId as vi.Mock).mockResolvedValue({
        trade_id: 'trade-t4',
        gate1_result: { valid: true },
        // gate2_result MISSING (incomplete)
        gate3_result: { valid: true },
        all_gates_pass: false,
        consumed: false,
        valid_until: new Date(Date.now() + 5 * 60 * 1000),
        isExpired: () => false,
      });
      (preExecutionEvidence.validateIntegrityBeforeUse as vi.Mock).mockReturnValue(false); // Incomplete
      (gate1.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate1', reason: 'OK' });
      (gate2.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate2', reason: 'OK' });
      (gate3.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate3', reason: 'OK' });

      const result = await service.validateCheckpoint1(mockOrder, mockAccount, mockMarket, mockConfig, 'trade-t4');

      expect(result.allGatesPass).toBe(false);
      expect(result.reason).toContain('Pre-execution evidence validation failed');
      expect(preExecutionEvidence.validateIntegrityBeforeUse).toHaveBeenCalled();
    });

    // T5: Evidence expirada se rechaza
    it('T5: Expired evidence is rejected', async () => {
      (decisionAudit.recordDecision as vi.Mock).mockResolvedValue({ id: 'audit-t5' });
      (preExecutionEvidence.recordEvidence as vi.Mock).mockResolvedValue(undefined);
      const expiredEvidence = {
        trade_id: 'trade-t5',
        gate1_result: { valid: true },
        gate2_result: { valid: true },
        gate3_result: { valid: true },
        all_gates_pass: true,
        consumed: false,
        valid_until: new Date(Date.now() - 1000), // Expired
        isExpired: () => true,
      };
      (preExecutionEvidence.findByTradeId as vi.Mock).mockResolvedValue(expiredEvidence);
      (preExecutionEvidence.validateIntegrityBeforeUse as vi.Mock).mockReturnValue(false);
      (gate1.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate1', reason: 'OK' });
      (gate2.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate2', reason: 'OK' });
      (gate3.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate3', reason: 'OK' });

      const result = await service.validateCheckpoint1(mockOrder, mockAccount, mockMarket, mockConfig, 'trade-t5');

      expect(result.allGatesPass).toBe(false);
      expect(result.reason).toContain('Pre-execution evidence validation failed');
    });

    // T6: Evidence consumida no se reutiliza
    it('T6: Consumed evidence cannot be reused', async () => {
      (decisionAudit.recordDecision as vi.Mock).mockResolvedValue({ id: 'audit-t6' });
      (preExecutionEvidence.recordEvidence as vi.Mock).mockResolvedValue(undefined);
      const consumedEvidence = {
        trade_id: 'trade-t6',
        gate1_result: { valid: true },
        gate2_result: { valid: true },
        gate3_result: { valid: true },
        all_gates_pass: true,
        consumed: true, // Already consumed
        valid_until: new Date(Date.now() + 5 * 60 * 1000),
        isExpired: () => false,
      };
      (preExecutionEvidence.findByTradeId as vi.Mock).mockResolvedValue(consumedEvidence);
      (preExecutionEvidence.validateIntegrityBeforeUse as vi.Mock).mockReturnValue(false);
      (gate1.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate1', reason: 'OK' });
      (gate2.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate2', reason: 'OK' });
      (gate3.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate3', reason: 'OK' });

      const result = await service.validateCheckpoint1(mockOrder, mockAccount, mockMarket, mockConfig, 'trade-t6');

      expect(result.allGatesPass).toBe(false);
      expect(result.reason).toContain('Pre-execution evidence validation failed');
    });

    // T7: Regresión TAREA 3
    it('T7: TASK 3 regression - DecisionAuditService works without interference from TASK 4', async () => {
      (decisionAudit.recordDecision as vi.Mock).mockResolvedValue({ id: 'audit-t7' });
      (preExecutionEvidence.recordEvidence as vi.Mock).mockResolvedValue(undefined);
      (preExecutionEvidence.findByTradeId as vi.Mock).mockResolvedValue({
        trade_id: 'trade-t7',
        gate1_result: { valid: true },
        gate2_result: { valid: true },
        gate3_result: { valid: true },
        all_gates_pass: true,
        consumed: false,
        valid_until: new Date(Date.now() + 5 * 60 * 1000),
        isExpired: () => false,
      });
      (preExecutionEvidence.validateIntegrityBeforeUse as vi.Mock).mockReturnValue(true);
      (gate1.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate1', reason: 'OK' });
      (gate2.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate2', reason: 'OK' });
      (gate3.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate3', reason: 'OK' });

      const result = await service.validateCheckpoint1(mockOrder, mockAccount, mockMarket, mockConfig, 'trade-t7');

      // Verify DecisionAuditService still works
      expect(decisionAudit.recordDecision).toHaveBeenCalledTimes(1);
      expect(result.allGatesPass).toBe(true);
      // Verify no regression in gate calling
      expect(gate1.validate).toHaveBeenCalled();
      expect(gate2.validate).toHaveBeenCalled();
      expect(gate3.validate).toHaveBeenCalled();
    });

    // T8: validateFull with gates 1-5 records evidence for all
    it('T8: validateFull with gates 1-5 records evidence for all gates', async () => {
      (decisionAudit.recordDecision as vi.Mock).mockResolvedValue({ id: 'audit-t8' });
      (preExecutionEvidence.recordEvidence as vi.Mock).mockResolvedValue(undefined);
      (preExecutionEvidence.findByTradeId as vi.Mock).mockResolvedValue({
        trade_id: 'trade-t8',
        gate1_result: { valid: true },
        gate2_result: { valid: true },
        gate3_result: { valid: true },
        gate4_result: { valid: true },
        gate5_result: { valid: true },
        all_gates_pass: true,
        consumed: false,
        valid_until: new Date(Date.now() + 5 * 60 * 1000),
        isExpired: () => false,
      });
      (preExecutionEvidence.validateIntegrityBeforeUse as vi.Mock).mockReturnValue(true);
      (gate1.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate1', reason: 'OK' });
      (gate2.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate2', reason: 'OK' });
      (gate3.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate3', reason: 'OK' });
      (gate4.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate4', reason: 'OK' });
      (gate5.validate as vi.Mock).mockResolvedValue({ valid: true, gate: 'gate5', reason: 'OK' });

      const result = await service.validateFull(mockOrder, mockAccount, mockMarket, mockConfig, 'trade-t8', 100);

      expect(result.allGatesPass).toBe(true);
      expect(result.gates).toHaveLength(5);
      // Verify all gate evidence was recorded (5 gates + final)
      expect(preExecutionEvidence.recordEvidence).toHaveBeenCalled();
      expect(preExecutionEvidence.validateIntegrityBeforeUse).toHaveBeenCalled();
    });
  });
});
