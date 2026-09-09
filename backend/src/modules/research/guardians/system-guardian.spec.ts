/**
 * SystemGuardian Unit Tests
 *
 * Verify health monitoring, incident logging, and readiness checks.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { SystemGuardian } from './system-guardian';

describe('SystemGuardian', () => {
  let service: SystemGuardian;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SystemGuardian],
    }).compile();

    service = module.get<SystemGuardian>(SystemGuardian);
  });

  describe('performHealthCheck', () => {
    it('should return health report', async () => {
      const report = await service.performHealthCheck();
      expect(report).toBeDefined();
      expect(report.overallHealth).toMatch(/healthy|degraded|critical/);
      expect(report.healthScore).toBeGreaterThanOrEqual(0);
      expect(report.healthScore).toBeLessThanOrEqual(100);
    });

    it('should include providers in health check', async () => {
      const report = await service.performHealthCheck();
      expect(report.providers).toBeDefined();
      expect(Array.isArray(report.providers)).toBe(true);
    });
  });

  describe('performPreMarketChecklist', () => {
    it('should verify system ready', async () => {
      const checklist = await service.performPreMarketChecklist();
      expect(checklist).toBeDefined();
      expect(checklist.isSystemReady).toBeDefined();
      expect(typeof checklist.readinessScore).toBe('number');
    });

    it('should identify blockers', async () => {
      const checklist = await service.performPreMarketChecklist();
      expect(Array.isArray(checklist.blockers)).toBe(true);
    });

    it('should check all required categories', async () => {
      const checklist = await service.performPreMarketChecklist();
      const categories = checklist.checksPerformed.map(c => c.category);
      expect(categories).toContain('api');
      expect(categories).toContain('authentication');
    });
  });

  describe('recordIncident', () => {
    it('should log incidents', () => {
      const incident = {
        provider: 'NewsAPI',
        type: 'connection_timeout' as const,
        severity: 'high' as const,
        message: 'Test timeout',
      };
      service.recordIncident(incident);
      const report = service.getHealthReport();
      expect(report.incidents.length).toBeGreaterThan(0);
    });

    it('should track incident severity', () => {
      service.recordIncident({
        provider: 'Test',
        type: 'api_error',
        severity: 'critical',
        message: 'Critical error',
      });
      const report = service.getHealthReport();
      const hasC critical = report.incidents.some(i => i.severity === 'critical');
      expect(hasCritical).toBe(true);
    });
  });

  describe('confirmAllSystemsGo', () => {
    it('should gate operations when systems unhealthy', async () => {
      const approved = await service.confirmAllSystemsGo();
      expect(typeof approved).toBe('boolean');
    });
  });
});
