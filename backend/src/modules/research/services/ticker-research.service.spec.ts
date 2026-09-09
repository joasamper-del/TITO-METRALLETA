/**
 * Ticker Research Service Tests
 *
 * Validates multi-source analysis and cross-validation logic
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TickerResearchService } from './ticker-research.service';

describe('TickerResearchService - S62 Multi-Source Analysis', () => {
  let service: TickerResearchService;

  beforeEach(() => {
    service = new TickerResearchService();
  });

  describe('📊 Report Structure', () => {
    it('should return complete analysis report', async () => {
      const report = await service.analyzeTickerComprehensive('AAPL');

      expect(report).toHaveProperty('symbol', 'AAPL');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('market');
      expect(report).toHaveProperty('fundamentals');
      expect(report).toHaveProperty('technicals');
      expect(report).toHaveProperty('news');
      expect(report).toHaveProperty('validations');
      expect(report).toHaveProperty('confidenceScore');
      expect(report).toHaveProperty('riskScore');
      expect(report).toHaveProperty('readyForExecution');
      expect(report).toHaveProperty('reasons');
    });

    it('should include all market data fields', async () => {
      const report = await service.analyzeTickerComprehensive('MSFT');

      expect(report.market).toHaveProperty('price');
      expect(report.market).toHaveProperty('bid');
      expect(report.market).toHaveProperty('ask');
      expect(report.market).toHaveProperty('volume');
      expect(report.market).toHaveProperty('marketCap');
      expect(report.market).toHaveProperty('pe');
      expect(report.market).toHaveProperty('eps');
    });

    it('should include all fundamental data fields', async () => {
      const report = await service.analyzeTickerComprehensive('GOOGL');

      expect(report.fundamentals).toHaveProperty('company');
      expect(report.fundamentals).toHaveProperty('sector');
      expect(report.fundamentals).toHaveProperty('industry');
      expect(report.fundamentals).toHaveProperty('employees');
      expect(report.fundamentals).toHaveProperty('website');
      expect(report.fundamentals).toHaveProperty('earnings');
    });

    it('should include technical indicators', async () => {
      const report = await service.analyzeTickerComprehensive('SPY');

      expect(report.technicals).toHaveProperty('rsi');
      expect(report.technicals).toHaveProperty('adx');
      expect(report.technicals).toHaveProperty('superTrend');
      expect(report.technicals).toHaveProperty('movingAverage50');
      expect(report.technicals).toHaveProperty('movingAverage200');
    });
  });

  describe('🔐 Scoring System', () => {
    it('should calculate confidence score (0-100)', async () => {
      const report = await service.analyzeTickerComprehensive('AAPL');

      expect(report.confidenceScore).toBeGreaterThanOrEqual(0);
      expect(report.confidenceScore).toBeLessThanOrEqual(100);
    });

    it('should calculate risk score (0-100)', async () => {
      const report = await service.analyzeTickerComprehensive('MSFT');

      expect(report.riskScore).toBeGreaterThanOrEqual(0);
      expect(report.riskScore).toBeLessThanOrEqual(100);
    });

    it('should increase risk for data discrepancies', async () => {
      const report = await service.analyzeTickerComprehensive('GOOGL');

      // If validations have conflicts, risk score should be elevated
      const conflicts = report.validations.filter(v => !v.match).length;
      const expectedMinRisk = conflicts * 20;

      expect(report.riskScore).toBeGreaterThanOrEqual(Math.min(100, expectedMinRisk));
    });
  });

  describe('📋 Execution Readiness', () => {
    it('should provide readiness decision', async () => {
      const report = await service.analyzeTickerComprehensive('AAPL');

      expect(typeof report.readyForExecution).toBe('boolean');
    });

    it('should provide reasons for NO-GO decision', async () => {
      const report = await service.analyzeTickerComprehensive('UNKNOWN');

      if (!report.readyForExecution) {
        expect(report.reasons.length).toBeGreaterThan(0);
        expect(report.reasons.some(r => r.length > 0)).toBe(true);
      }
    });

    it('should provide confirmation for GO decision', async () => {
      const report = await service.analyzeTickerComprehensive('SPY');

      if (report.readyForExecution) {
        expect(report.reasons).toContain('✅ All checks passed');
      }
    });

    it('should require confidence > 75% for GO', async () => {
      const report = await service.analyzeTickerComprehensive('AAPL');

      if (report.readyForExecution) {
        expect(report.confidenceScore).toBeGreaterThan(75);
      } else {
        // If NO-GO, confidence should be reason
        const hasConfidenceReason = report.reasons.some(r => r.includes('Confidence'));
        expect(report.confidenceScore <= 75 || report.riskScore > 30 || !hasConfidenceReason).toBe(true);
      }
    });

    it('should require risk score < 30 for GO', async () => {
      const report = await service.analyzeTickerComprehensive('MSFT');

      if (report.readyForExecution) {
        expect(report.riskScore).toBeLessThan(30);
      }
    });
  });

  describe('📊 Data Quality', () => {
    it('should have data points with source attribution', async () => {
      const report = await service.analyzeTickerComprehensive('GOOGL');

      if (report.market.price.confidence > 0) {
        expect(report.market.price).toHaveProperty('source');
        expect(report.market.price).toHaveProperty('timestamp');
        expect(report.market.price).toHaveProperty('freshness');
      }
    });

    it('should track data freshness (LIVE/DELAYED/CACHED/STALE)', async () => {
      const report = await service.analyzeTickerComprehensive('SPY');

      const freshnesses = [
        report.market.price.freshness,
        report.market.bid.freshness,
        report.market.ask.freshness,
      ];

      for (const freshness of freshnesses) {
        if (freshness) {
          expect(['LIVE', 'DELAYED', 'CACHED', 'STALE', 'UNKNOWN']).toContain(freshness);
        }
      }
    });
  });

  describe('🔍 Cross-Validation', () => {
    it('should populate validations array', async () => {
      const report = await service.analyzeTickerComprehensive('AAPL');

      expect(Array.isArray(report.validations)).toBe(true);
    });

    it('should track match/mismatch in validations', async () => {
      const report = await service.analyzeTickerComprehensive('MSFT');

      for (const validation of report.validations) {
        expect(validation).toHaveProperty('match');
        expect(typeof validation.match).toBe('boolean');
      }
    });
  });

  describe('📝 Summary', () => {
    it('should generate human-readable summary', async () => {
      const report = await service.analyzeTickerComprehensive('GOOGL');

      expect(report.summary).toBeDefined();
      expect(report.summary.length).toBeGreaterThan(0);
      expect(report.summary).toContain(report.symbol);
    });

    it('should include confidence in summary', async () => {
      const report = await service.analyzeTickerComprehensive('SPY');

      expect(report.summary).toContain('Confidence');
    });
  });

  describe('🚀 Multi-Symbol Support', () => {
    it('should analyze multiple symbols independently', async () => {
      const symbols = ['AAPL', 'MSFT', 'GOOGL'];
      const reports = await Promise.all(symbols.map(s => service.analyzeTickerComprehensive(s)));

      expect(reports).toHaveLength(3);
      for (let i = 0; i < 3; i++) {
        expect(reports[i].symbol).toBe(symbols[i]);
      }
    });
  });
});
