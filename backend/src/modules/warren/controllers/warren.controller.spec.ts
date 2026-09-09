import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WarrenController } from './warren.controller';
import { WarrenService } from '../services/warren.service';

describe('WarrenController', () => {
  let controller: WarrenController;
  let warrenService: WarrenService;

  const mockAnalysisResponse = {
    ticker: 'AAPL',
    decision: 'BUY',
    fundamentalScore: { totalScore: 90, scoreCategory: 'approved', valuation: 23, quality: 32, growth: 19, macro: 16, details: {} },
    dcfValuation: {
      baseCase: { name: 'base', wacc: 8, terminalGrowth: 3, fcfGrowthRate: 8, enterpriseValue: 1000, equityValue: 900, fairValue: 145, terminalValue: 600 },
      conservativeCase: { name: 'conservative', wacc: 9, terminalGrowth: 2, fcfGrowthRate: 6, enterpriseValue: 900, equityValue: 800, fairValue: 120, terminalValue: 500 },
      optimisticCase: { name: 'optimistic', wacc: 7, terminalGrowth: 4, fcfGrowthRate: 10, enterpriseValue: 1100, equityValue: 1000, fairValue: 175, terminalValue: 700 },
      fairValueRange: { low: 120, mid: 145, high: 175 },
      confidenceLevel: 'high',
      confidenceReason: 'Strong metrics',
      sensitivityWarnings: [],
      valuationStatus: 'attractive',
      marginOfSafety: { atPrice: 150, percentDiscount: 20, assessmentAtPrice: 'buy' },
    },
    macroContext: {
      indicators: {} as any,
      fedRateSignal: 'falling',
      inflationSignal: 'moderate',
      volatilitySignal: 'low',
      valuationSignal: 'fair',
      macroContext: 'bullish',
      contextReason: 'Favorable environment',
      confidenceLevel: 'high',
      confidenceReasons: [],
      aggressivenessAdjustment: 1,
      marginAdjustment: -5,
      dataQualityWarnings: [],
    },
    decisionEngine: {
      decision: 'BUY',
      gateResults: {
        scoreGate: { passed: true, reason: 'Score 90', severity: 'pass' },
        valuationGate: { passed: true, reason: 'Attractive', severity: 'pass' },
        marginGate: { passed: true, reason: 'Strong margin', severity: 'pass' },
        confidenceGate: { passed: true, reason: 'High confidence', severity: 'pass' },
        dataQualityGate: { passed: true, reason: 'Fresh data', severity: 'pass' },
      },
      macroAdjustment: { context: 'bullish', aggressivenessAdjustment: 1, marginAdjustment: -5 },
      positionSizing: { baseAllocation: 3, macroAdjusted: 4 },
      marginRequired: { base: 20, macroAdjusted: 15 },
      explanation: 'BUY recommendation',
    },
    recommendation: {
      action: 'BUY recommendation',
      confidence: 'high',
      positionSizing: { base: 3, macroAdjusted: 4 },
      marginRequired: { base: 20, macroAdjusted: 15 },
    },
    analysis: {
      fundamentalsReason: 'Strong score',
      valuationReason: 'Attractive',
      macroReason: 'Bullish',
      decisionReason: 'All gates pass',
    },
    disclaimer: 'ANALYTICAL RECOMMENDATION ONLY',
    timestamp: new Date(),
    version: 'Warren v1.0',
  };

  beforeEach(() => {
    warrenService = {
      analyzeCompany: vi.fn().mockResolvedValue(mockAnalysisResponse),
    } as any;

    controller = new WarrenController(warrenService);
  });

  describe('POST /api/warren/analyze', () => {
    it('should return successful analysis response', async () => {
      const request = {
        ticker: 'AAPL',
        fundamentalMetrics: { roe: 25, roic: 20, debtToEquity: 0.3, fcfTrend: 'growing', priceToBook: 2, priceToEarnings: 24, peHistorical: 25, earningsCagr5y: 15, revenueGrowth: 10, marketVIX: 18, spPE: 18 },
        dcfInputs: { fcf: 100, fcfGrowthRate: 8, projectionYears: 5, wacc: 8, equityShares: 16, netDebt: 50, fcfQuality: 'excellent', earningsQuality: 'stable' },
        currentPrice: 150,
        macroIndicators: { fedRate: 3.5, fedRateTimestamp: new Date(), fedRateSource: 'FRED', cpi: 3, cpiTimestamp: new Date(), cpiSource: 'BLS', vix: 18, vixTimestamp: new Date(), vixSource: 'CBOE', spPE: 18, spPETimestamp: new Date(), spPESource: 'Bloomberg' },
      };

      const response = await controller.analyzeCompany(request);

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.decision).toBe('BUY');
      expect(response.timestamp).toBeDefined();
    });

    it('should include disclaimer in response', async () => {
      const request = {
        ticker: 'AAPL',
        fundamentalMetrics: { roe: 25, roic: 20, debtToEquity: 0.3, fcfTrend: 'growing', priceToBook: 2, priceToEarnings: 24, peHistorical: 25, earningsCagr5y: 15, revenueGrowth: 10, marketVIX: 18, spPE: 18 },
        dcfInputs: { fcf: 100, fcfGrowthRate: 8, projectionYears: 5, wacc: 8, equityShares: 16, netDebt: 50, fcfQuality: 'excellent', earningsQuality: 'stable' },
        currentPrice: 150,
        macroIndicators: { fedRate: 3.5, fedRateTimestamp: new Date(), fedRateSource: 'FRED', cpi: 3, cpiTimestamp: new Date(), cpiSource: 'BLS', vix: 18, vixTimestamp: new Date(), vixSource: 'CBOE', spPE: 18, spPETimestamp: new Date(), spPESource: 'Bloomberg' },
      };

      const response = await controller.analyzeCompany(request);

      expect(response.data?.disclaimer).toContain('ANALYTICAL');
    });
  });

  describe('POST /api/warren/validate', () => {
    it('should validate correct input', async () => {
      const request = {
        ticker: 'AAPL',
        fundamentalMetrics: { roe: 25, roic: 20, debtToEquity: 0.3, fcfTrend: 'growing', priceToBook: 2, priceToEarnings: 24, peHistorical: 25, earningsCagr5y: 15, revenueGrowth: 10, marketVIX: 18, spPE: 18 },
        dcfInputs: { fcf: 100, fcfGrowthRate: 8, projectionYears: 5, wacc: 8, equityShares: 16, netDebt: 50, fcfQuality: 'excellent', earningsQuality: 'stable' },
        currentPrice: 150,
        macroIndicators: { fedRate: 3.5, fedRateTimestamp: new Date(), fedRateSource: 'FRED', cpi: 3, cpiTimestamp: new Date(), cpiSource: 'BLS', vix: 18, vixTimestamp: new Date(), vixSource: 'CBOE', spPE: 18, spPETimestamp: new Date(), spPESource: 'Bloomberg' },
      };

      const response = await controller.validateInputs(request);

      expect(response.success).toBe(true);
      expect(response.valid).toBe(true);
      expect(response.errors.length).toBe(0);
    });

    it('should reject empty ticker', async () => {
      const response = await controller.validateInputs({ ticker: '' });

      expect(response.valid).toBe(false);
      expect(response.errors.some(e => e.includes('Ticker'))).toBe(true);
    });

    it('should reject invalid ROE', async () => {
      const response = await controller.validateInputs({
        ticker: 'AAPL',
        fundamentalMetrics: { roe: 75 },
      });

      expect(response.valid).toBe(false);
      expect(response.errors.some(e => e.includes('ROE'))).toBe(true);
    });

    it('should reject invalid WACC', async () => {
      const response = await controller.validateInputs({
        ticker: 'AAPL',
        dcfInputs: { wacc: 25 },
      });

      expect(response.valid).toBe(false);
      expect(response.errors.some(e => e.includes('WACC'))).toBe(true);
    });
  });

  describe('GET /api/warren/health', () => {
    it('should return health status', async () => {
      const response = controller.getHealth();

      expect(response.status).toBe('ok');
      expect(response.version).toContain('Warren');
      expect(response.timestamp).toBeDefined();
    });
  });

  describe('Response format', () => {
    it('should always include timestamp', async () => {
      const request = {
        ticker: 'AAPL',
        fundamentalMetrics: { roe: 25, roic: 20, debtToEquity: 0.3, fcfTrend: 'growing', priceToBook: 2, priceToEarnings: 24, peHistorical: 25, earningsCagr5y: 15, revenueGrowth: 10, marketVIX: 18, spPE: 18 },
        dcfInputs: { fcf: 100, fcfGrowthRate: 8, projectionYears: 5, wacc: 8, equityShares: 16, netDebt: 50, fcfQuality: 'excellent', earningsQuality: 'stable' },
        currentPrice: 150,
        macroIndicators: { fedRate: 3.5, fedRateTimestamp: new Date(), fedRateSource: 'FRED', cpi: 3, cpiTimestamp: new Date(), cpiSource: 'BLS', vix: 18, vixTimestamp: new Date(), vixSource: 'CBOE', spPE: 18, spPETimestamp: new Date(), spPESource: 'Bloomberg' },
      };

      const response = await controller.analyzeCompany(request);

      expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should not include execution methods', async () => {
      const request = {
        ticker: 'AAPL',
        fundamentalMetrics: { roe: 25, roic: 20, debtToEquity: 0.3, fcfTrend: 'growing', priceToBook: 2, priceToEarnings: 24, peHistorical: 25, earningsCagr5y: 15, revenueGrowth: 10, marketVIX: 18, spPE: 18 },
        dcfInputs: { fcf: 100, fcfGrowthRate: 8, projectionYears: 5, wacc: 8, equityShares: 16, netDebt: 50, fcfQuality: 'excellent', earningsQuality: 'stable' },
        currentPrice: 150,
        macroIndicators: { fedRate: 3.5, fedRateTimestamp: new Date(), fedRateSource: 'FRED', cpi: 3, cpiTimestamp: new Date(), cpiSource: 'BLS', vix: 18, vixTimestamp: new Date(), vixSource: 'CBOE', spPE: 18, spPETimestamp: new Date(), spPESource: 'Bloomberg' },
      };

      const response = await controller.analyzeCompany(request);
      const responseString = JSON.stringify(response);

      expect(responseString).not.toContain('execute');
      expect(responseString).not.toContain('submit');
      expect(responseString).not.toContain('order');
      expect(responseString).not.toContain('Alpaca');
    });
  });
});
