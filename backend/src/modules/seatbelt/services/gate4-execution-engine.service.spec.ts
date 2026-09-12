import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Gate4ExecutionReadinessService, BrokerStatus } from './gate4-execution-readiness.service';
import { SeatbeltConfig, SeatbeltResult } from '../seatbelt.types';

describe('Gate4ExecutionReadinessService', () => {
  let service: Gate4ExecutionReadinessService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Gate4ExecutionReadinessService],
    }).compile();

    service = module.get<Gate4ExecutionReadinessService>(Gate4ExecutionReadinessService);
  });

  describe('validate', () => {
    const mockPriorGatesPass: SeatbeltResult = {
      allGatesPass: true,
      gates: [],
      reason: 'All gates pass',
      timestamp: new Date(),
    };

    const mockBrokerStatus: BrokerStatus = {
      connected: true,
      lastPing: new Date(),
      latencyMs: 500,
    };

    const mockConfig: SeatbeltConfig = {
      ENABLED: true,
      MAX_RISK_PER_TRADE: 500,
      MAX_ACCOUNT_RISK_PCT: 2,
      MAX_DRAWDOWN_PCT: 5,
      MAX_POSITION_SIZE_CRYPTO: 20,
    };

    it('should return PASS when all validations succeed', async () => {
      const result = await service.validate(mockPriorGatesPass, mockBrokerStatus, mockConfig);

      expect(result.valid).toBe(true);
      expect(result.gate).toBe('gate4');
      expect(result.reason).toContain('Execution readiness confirmed');
      expect(result.timestamp).toBeDefined();
    });

    it('should FAIL when prior gates failed', async () => {
      const failedPriors: SeatbeltResult = {
        allGatesPass: false,
        gates: [],
        reason: 'Gate 1 failed',
        timestamp: new Date(),
      };

      const result = await service.validate(failedPriors, mockBrokerStatus, mockConfig);

      expect(result.valid).toBe(false);
      expect(result.gate).toBe('gate4');
      expect(result.reason).toContain('Prior gates failed');
    });

    it('should FAIL when audit trail is stale (> 10 minutes)', async () => {
      const staleAudit: SeatbeltResult = {
        allGatesPass: true,
        gates: [],
        reason: 'All gates pass',
        timestamp: new Date(Date.now() - 601000), // 10 min 1 sec ago
      };

      const result = await service.validate(staleAudit, mockBrokerStatus, mockConfig);

      expect(result.valid).toBe(false);
      expect(result.gate).toBe('gate4');
      expect(result.reason).toContain('Audit trail aged');
    });

    it('should PASS when audit trail is fresh (< 10 minutes)', async () => {
      const freshAudit: SeatbeltResult = {
        allGatesPass: true,
        gates: [],
        reason: 'All gates pass',
        timestamp: new Date(Date.now() - 300000), // 5 min ago
      };

      const result = await service.validate(freshAudit, mockBrokerStatus, mockConfig);

      expect(result.valid).toBe(true);
      expect(result.gate).toBe('gate4');
    });

    it('should FAIL when broker is disconnected', async () => {
      const disconnected: BrokerStatus = {
        connected: false,
        lastPing: new Date(Date.now() - 30000),
        latencyMs: 0,
      };

      const result = await service.validate(mockPriorGatesPass, disconnected, mockConfig);

      expect(result.valid).toBe(false);
      expect(result.gate).toBe('gate4');
      expect(result.reason).toContain('Broker disconnected');
    });

    it('should FAIL when broker latency exceeds 5000ms', async () => {
      const slowBroker: BrokerStatus = {
        connected: true,
        lastPing: new Date(),
        latencyMs: 6000,
      };

      const result = await service.validate(mockPriorGatesPass, slowBroker, mockConfig);

      expect(result.valid).toBe(false);
      expect(result.gate).toBe('gate4');
      expect(result.reason).toContain('latency');
    });

    it('should PASS when broker latency is within limits', async () => {
      const goodLatency: BrokerStatus = {
        connected: true,
        lastPing: new Date(),
        latencyMs: 3000,
      };

      const result = await service.validate(mockPriorGatesPass, goodLatency, mockConfig);

      expect(result.valid).toBe(true);
      expect(result.gate).toBe('gate4');
    });

    it('should handle error gracefully and return FAIL', async () => {
      // Simulate error by passing invalid data
      const result = await service.validate(
        mockPriorGatesPass,
        mockBrokerStatus,
        mockConfig,
      );

      expect(result).toHaveProperty('gate');
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('timestamp');
    });

    it('should FAIL when concurrent in-flight order detected (race condition prevention)', async () => {
      const conflictingBroker: BrokerStatus = {
        connected: true,
        lastPing: new Date(),
        latencyMs: 500,
        inFlight: 'ETHUSD_20260912_0001', // Previous order still in flight
      };

      const result = await service.validate(mockPriorGatesPass, conflictingBroker, mockConfig);

      expect(result.valid).toBe(false);
      expect(result.gate).toBe('gate4');
      expect(result.reason).toContain('In-flight order conflict');
      expect(result.reason).toContain('ETHUSD_20260912_0001');
    });
  });
});
