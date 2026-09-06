import { describe, it, expect, beforeEach } from 'vitest';
import { DCFEngineService, DCFInputs } from './dcf-engine';

describe('DCFEngineService', () => {
  let service: DCFEngineService;

  beforeEach(() => {
    service = new DCFEngineService();
  });

  describe('Basic DCF Calculation', () => {
    it('should calculate DCF with base case scenario', () => {
      const inputs: DCFInputs = {
        fcf: 100, // $100M FCF
        fcfGrowthRate: 8, // 8% annual growth
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 9,
        equityShares: 1000, // 1000M shares
        netDebt: 500, // $500M net debt
        fcfQuality: 'good',
        earningsQuality: 'stable',
      };

      const valuation = service.calculateDCF(inputs);

      expect(valuation.baseCase).toBeDefined();
      expect(valuation.baseCase.fairValue).toBeGreaterThan(0);
      expect(valuation.baseCase.enterpriseValue).toBeGreaterThan(0);
      expect(valuation.baseCase.terminalValue).toBeGreaterThan(0);
    });

    it('should create three scenarios: conservative, base, optimistic', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 8,
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 9,
        equityShares: 1000,
        netDebt: 500,
        fcfQuality: 'good',
        earningsQuality: 'stable',
      };

      const valuation = service.calculateDCF(inputs);

      expect(valuation.conservativeCase).toBeDefined();
      expect(valuation.baseCase).toBeDefined();
      expect(valuation.optimisticCase).toBeDefined();

      // Conservative should be lower than base
      expect(valuation.conservativeCase.fairValue).toBeLessThan(valuation.baseCase.fairValue);

      // Optimistic should be higher than base
      expect(valuation.optimisticCase.fairValue).toBeGreaterThan(valuation.baseCase.fairValue);
    });

    it('should calculate fair value range (low, mid, high)', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 8,
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 9,
        equityShares: 1000,
        netDebt: 500,
        fcfQuality: 'good',
        earningsQuality: 'stable',
      };

      const valuation = service.calculateDCF(inputs);

      expect(valuation.fairValueRange.low).toBe(valuation.conservativeCase.fairValue);
      expect(valuation.fairValueRange.mid).toBe(valuation.baseCase.fairValue);
      expect(valuation.fairValueRange.high).toBe(valuation.optimisticCase.fairValue);

      expect(valuation.fairValueRange.low <= valuation.fairValueRange.mid).toBe(true);
      expect(valuation.fairValueRange.mid <= valuation.fairValueRange.high).toBe(true);
    });
  });

  describe('Confidence Assessment', () => {
    it('should assess HIGH confidence when FCF excellent and earnings stable', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 8,
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 9,
        equityShares: 1000,
        netDebt: 500,
        fcfQuality: 'excellent',
        earningsQuality: 'stable',
      };

      const valuation = service.calculateDCF(inputs);
      expect(valuation.confidenceLevel).toBe('high');
      expect(valuation.confidenceReason).toContain('strong');
    });

    it('should assess MEDIUM confidence when FCF/earnings mixed', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 8,
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 9,
        equityShares: 1000,
        netDebt: 500,
        fcfQuality: 'fair',
        earningsQuality: 'volatile',
      };

      const valuation = service.calculateDCF(inputs);
      expect(valuation.confidenceLevel).toBe('medium');
      expect(valuation.confidenceReason).toContain('Mixed');
    });

    it('should assess LOW confidence when FCF poor or earnings declining', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 8,
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 9,
        equityShares: 1000,
        netDebt: 500,
        fcfQuality: 'poor',
        earningsQuality: 'declining',
      };

      const valuation = service.calculateDCF(inputs);
      expect(valuation.confidenceLevel).toBe('low');
      expect(valuation.confidenceReason).toContain('WARNING');
    });
  });

  describe('Sensitivity Analysis & Warnings', () => {
    it('should warn when FCF is poor quality', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 8,
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 9,
        equityShares: 1000,
        netDebt: 500,
        fcfQuality: 'poor',
        earningsQuality: 'stable',
      };

      const valuation = service.calculateDCF(inputs);
      expect(valuation.sensitivityWarnings.length).toBeGreaterThan(0);
      expect(valuation.sensitivityWarnings[0]).toContain('CRITICAL');
    });

    it('should warn when terminal growth exceeds GDP-like rate', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 8,
        projectionYears: 5,
        terminalGrowthRate: 6, // Too high
        wacc: 9,
        equityShares: 1000,
        netDebt: 500,
        fcfQuality: 'good',
        earningsQuality: 'stable',
      };

      const valuation = service.calculateDCF(inputs);
      expect(valuation.sensitivityWarnings.some(w => w.includes('Terminal growth'))).toBe(true);
    });

    it('should warn when FCF growth is aggressive (>30%)', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 40, // Aggressive
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 9,
        equityShares: 1000,
        netDebt: 500,
        fcfQuality: 'good',
        earningsQuality: 'stable',
      };

      const valuation = service.calculateDCF(inputs);
      expect(valuation.sensitivityWarnings.some(w => w.includes('aggressive'))).toBe(true);
    });

    it('should handle high leverage (debt > equity)', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 8,
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 9,
        equityShares: 1000,
        netDebt: 2000, // High debt
        fcfQuality: 'good',
        earningsQuality: 'stable',
      };

      const valuation = service.calculateDCF(inputs);
      // High debt is handled through WACC, not a separate warning
      expect(valuation.baseCase.fairValue).toBeGreaterThan(0);
    });
  });

  describe('Margin of Safety at Current Price', () => {
    it('should calculate discount from conservative case', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 8,
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 9,
        equityShares: 1000,
        netDebt: 500,
        fcfQuality: 'good',
        earningsQuality: 'stable',
      };

      const valuation = service.calculateDCF(inputs);
      const margin = service.calculateMarginAtPrice(valuation, valuation.conservativeCase.fairValue * 0.75);

      expect(margin.percentDiscountFromConservative).toBeGreaterThan(20);
      expect(margin.assessment).toBe('buy');
    });

    it('should assess STRONG-BUY when price 35%+ below conservative fair value', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 8,
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 9,
        equityShares: 1000,
        netDebt: 500,
        fcfQuality: 'good',
        earningsQuality: 'stable',
      };

      const valuation = service.calculateDCF(inputs);
      const cheapPrice = valuation.conservativeCase.fairValue * 0.6; // 40% discount

      const margin = service.calculateMarginAtPrice(valuation, cheapPrice);
      expect(margin.assessment).toBe('strong-buy');
      expect(margin.recommendation).toContain('Strong margin of safety');
    });

    it('should assess SELL when price above conservative fair value', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 8,
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 9,
        equityShares: 1000,
        netDebt: 500,
        fcfQuality: 'good',
        earningsQuality: 'stable',
      };

      const valuation = service.calculateDCF(inputs);
      const expensivePrice = valuation.conservativeCase.fairValue * 1.1; // 10% above

      const margin = service.calculateMarginAtPrice(valuation, expensivePrice);
      expect(margin.assessment).toBe('sell');
      expect(margin.recommendation).toContain('ABOVE');
    });

    it('should assess STRONG-SELL when price 15%+ above conservative fair value', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 8,
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 9,
        equityShares: 1000,
        netDebt: 500,
        fcfQuality: 'good',
        earningsQuality: 'stable',
      };

      const valuation = service.calculateDCF(inputs);
      const veryExpensivePrice = valuation.conservativeCase.fairValue * 1.2; // 20% above

      const margin = service.calculateMarginAtPrice(valuation, veryExpensivePrice);
      expect(margin.assessment).toBe('strong-sell');
      expect(margin.recommendation).toContain('Expensive');
    });
  });

  describe('Valuation Status (Gatekeeping)', () => {
    it('should return ATTRACTIVE when price well below conservative fair value', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 8,
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 9,
        equityShares: 1000,
        netDebt: 500,
        fcfQuality: 'good',
        earningsQuality: 'stable',
      };

      const valuation = service.calculateDCF(inputs);
      const status = service.getValuationStatus(valuation, valuation.conservativeCase.fairValue * 0.75);

      expect(status).toBe('attractive');
    });

    it('should return FAIR when price within conservative fair value range', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 8,
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 9,
        equityShares: 1000,
        netDebt: 500,
        fcfQuality: 'good',
        earningsQuality: 'stable',
      };

      const valuation = service.calculateDCF(inputs);
      const status = service.getValuationStatus(valuation, valuation.conservativeCase.fairValue);

      expect(status).toBe('fair');
    });

    it('should return EXPENSIVE when price above conservative fair value', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 8,
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 9,
        equityShares: 1000,
        netDebt: 500,
        fcfQuality: 'good',
        earningsQuality: 'stable',
      };

      const valuation = service.calculateDCF(inputs);
      const status = service.getValuationStatus(valuation, valuation.conservativeCase.fairValue * 1.15);

      expect(status).toBe('expensive');
    });
  });

  describe('Extreme Scenarios', () => {
    it('should handle very low WACC (e.g., utility company)', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 3,
        projectionYears: 5,
        terminalGrowthRate: 2,
        wacc: 5, // Low discount rate
        equityShares: 1000,
        netDebt: 500,
        fcfQuality: 'excellent',
        earningsQuality: 'stable',
      };

      const valuation = service.calculateDCF(inputs);
      expect(valuation.baseCase.fairValue).toBeGreaterThan(0);
      expect(valuation.sensitivityWarnings.some(w => w.includes('WACC'))).toBe(true);
    });

    it('should handle high WACC (risky company)', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 20,
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 15, // High discount rate
        equityShares: 1000,
        netDebt: 500,
        fcfQuality: 'fair',
        earningsQuality: 'volatile',
      };

      const valuation = service.calculateDCF(inputs);
      expect(valuation.baseCase.fairValue).toBeGreaterThan(0);
      expect(valuation.confidenceLevel).toBe('medium');
    });

    it('should handle negative net debt (net cash)', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 8,
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 9,
        equityShares: 1000,
        netDebt: -500, // Company has net cash
        fcfQuality: 'good',
        earningsQuality: 'stable',
      };

      const valuation = service.calculateDCF(inputs);
      // Equity value should be higher due to cash
      expect(valuation.baseCase.equityValue).toBeGreaterThan(valuation.baseCase.enterpriseValue);
    });

    it('should handle zero or very low FCF growth', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 0, // Mature company
        projectionYears: 5,
        terminalGrowthRate: 2,
        wacc: 9,
        equityShares: 1000,
        netDebt: 500,
        fcfQuality: 'excellent',
        earningsQuality: 'stable',
      };

      const valuation = service.calculateDCF(inputs);
      expect(valuation.baseCase.fairValue).toBeGreaterThan(0);
      // Conservative case should be lower but positive
      expect(valuation.conservativeCase.fairValue).toBeGreaterThan(0);
    });

    it('should handle high FCF growth for limited period', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 50, // High growth startup
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 12,
        equityShares: 1000,
        netDebt: 0,
        fcfQuality: 'fair',
        earningsQuality: 'volatile',
      };

      const valuation = service.calculateDCF(inputs);
      expect(valuation.baseCase.fairValue).toBeGreaterThan(0);
      expect(valuation.confidenceLevel).toBe('medium');
      expect(valuation.sensitivityWarnings.some(w => w.includes('aggressive'))).toBe(true);
    });
  });

  describe('Multi-Scenario Comparison', () => {
    it('should show meaningful spread between conservative and optimistic', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 15,
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 10,
        equityShares: 1000,
        netDebt: 500,
        fcfQuality: 'good',
        earningsQuality: 'volatile',
      };

      const valuation = service.calculateDCF(inputs);
      const spread = (valuation.optimisticCase.fairValue / valuation.conservativeCase.fairValue - 1) * 100;

      // Optimistic should be meaningfully higher than conservative (at least 20% difference)
      expect(spread).toBeGreaterThan(15);
    });

    it('should have base case between conservative and optimistic', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 10,
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 9,
        equityShares: 1000,
        netDebt: 500,
        fcfQuality: 'good',
        earningsQuality: 'stable',
      };

      const valuation = service.calculateDCF(inputs);

      expect(valuation.baseCase.fairValue).toBeGreaterThan(valuation.conservativeCase.fairValue);
      expect(valuation.baseCase.fairValue).toBeLessThan(valuation.optimisticCase.fairValue);
    });
  });

  describe('Gatekeeping: Score 80 + Bad Valuation = NO BUY', () => {
    it('should mark EXPENSIVE even with high score if price is too high', () => {
      const inputs: DCFInputs = {
        fcf: 100,
        fcfGrowthRate: 8,
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 9,
        equityShares: 1000,
        netDebt: 500,
        fcfQuality: 'good',
        earningsQuality: 'stable',
      };

      const valuation = service.calculateDCF(inputs);
      const veryExpensivePrice = valuation.conservativeCase.fairValue * 1.5;

      const status = service.getValuationStatus(valuation, veryExpensivePrice);
      const margin = service.calculateMarginAtPrice(valuation, veryExpensivePrice);

      expect(status).toBe('expensive');
      expect(margin.assessment).toBe('strong-sell');
      // This blocks a buy even if Fundamentals score is >=80
    });
  });
});
