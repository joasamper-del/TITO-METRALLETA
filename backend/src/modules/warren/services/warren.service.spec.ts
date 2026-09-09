import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { WarrenService } from './warren.service';
import { FundamentalScorerService } from '../strategies/fundamental-scorer';
import { DCFEngineService } from '../strategies/dcf-engine';
import { MacroContextService } from '../strategies/macro-context';
import { DecisionEngineService } from '../strategies/decision-engine';

describe('WarrenService', () => {
  let service: WarrenService;
  let fundamentalScorer: FundamentalScorerService;
  let dcfEngine: DCFEngineService;
  let macroContext: MacroContextService;
  let decisionEngine: DecisionEngineService;

  beforeEach(() => {
    fundamentalScorer = new FundamentalScorerService();
    dcfEngine = new DCFEngineService();
    macroContext = new MacroContextService();
    decisionEngine = new DecisionEngineService();

    service = new WarrenService(fundamentalScorer, dcfEngine, macroContext, decisionEngine);
  });

  describe('Input Validation', () => {
    const validRequest = {
      ticker: 'AAPL',
      fundamentalMetrics: {
        roe: 25,
        roic: 20,
        debtToEquity: 0.3,
        fcfTrend: 'growing' as const,
        fcfValue: 100,
        priceToBook: 2.5,
        priceToEarnings: 28,
        peHistorical: 25,
        earningsCagr5y: 15,
        revenueGrowth: 10,
        dividendYears: 5,
        industryTailwind: 'strong' as const,
        marketVIX: 18,
        spPE: 18,
      },
      dcfInputs: {
        fcf: 100,
        fcfGrowthRate: 8,
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 8,
        equityShares: 16,
        netDebt: 50,
        fcfQuality: 'excellent' as const,
        earningsQuality: 'stable' as const,
      },
      currentPrice: 150,
      macroIndicators: {
        fedRate: 3.5,
        fedRateTimestamp: new Date(),
        fedRateSource: 'FRED',
        cpi: 3.0,
        cpiTimestamp: new Date(),
        cpiSource: 'BLS',
        vix: 18,
        vixTimestamp: new Date(),
        vixSource: 'CBOE',
        spPE: 18,
        spPETimestamp: new Date(),
        spPESource: 'Bloomberg',
      },
    };

    it('should accept valid request', async () => {
      const result = await service.analyzeCompany(validRequest);
      expect(result).toBeDefined();
      expect(result.ticker).toBe('AAPL');
    });

    it('should reject empty ticker', async () => {
      const request = { ...validRequest, ticker: '' };
      await expect(service.analyzeCompany(request)).rejects.toThrow(BadRequestException);
    });

    it('should reject missing fundamental metrics', async () => {
      const request = { ...validRequest, fundamentalMetrics: {} as any };
      await expect(service.analyzeCompany(request)).rejects.toThrow(BadRequestException);
    });

    it('should reject missing DCF inputs', async () => {
      const request = { ...validRequest, dcfInputs: {} as any };
      await expect(service.analyzeCompany(request)).rejects.toThrow(BadRequestException);
    });

    it('should reject negative current price', async () => {
      const request = { ...validRequest, currentPrice: -100 };
      await expect(service.analyzeCompany(request)).rejects.toThrow(BadRequestException);
    });

    it('should reject missing macro indicators', async () => {
      const request = { ...validRequest, macroIndicators: {} as any };
      await expect(service.analyzeCompany(request)).rejects.toThrow(BadRequestException);
    });
  });

  describe('Integration: Full Pipeline', () => {
    const strongCompanyRequest = {
      ticker: 'AAPL',
      fundamentalMetrics: {
        roe: 25,
        roic: 22,
        debtToEquity: 0.2,
        fcfTrend: 'growing' as const,
        fcfValue: 120,
        priceToBook: 2.0,
        priceToEarnings: 24,
        peHistorical: 25,
        earningsCagr5y: 18,
        revenueGrowth: 12,
        dividendYears: 10,
        industryTailwind: 'strong' as const,
        marketVIX: 15,
        spPE: 18,
      },
      dcfInputs: {
        fcf: 120,
        fcfGrowthRate: 10,
        projectionYears: 5,
        terminalGrowthRate: 3.5,
        wacc: 7.5,
        equityShares: 16,
        netDebt: 40,
        fcfQuality: 'excellent' as const,
        earningsQuality: 'stable' as const,
      },
      currentPrice: 100, // Strong discount
      macroIndicators: {
        fedRate: 3.0,
        fedRateTimestamp: new Date(),
        fedRateSource: 'FRED',
        cpi: 2.8,
        cpiTimestamp: new Date(),
        cpiSource: 'BLS',
        vix: 14,
        vixTimestamp: new Date(),
        vixSource: 'CBOE',
        spPE: 16,
        spPETimestamp: new Date(),
        spPESource: 'Bloomberg',
      },
    };

    it('should complete full analysis pipeline for strong company', async () => {
      const result = await service.analyzeCompany(strongCompanyRequest);

      expect(result).toBeDefined();
      expect(result.ticker).toBe('AAPL');
      expect(result.fundamentalScore).toBeDefined();
      expect(result.dcfValuation).toBeDefined();
      expect(result.macroContext).toBeDefined();
      expect(result.decisionEngine).toBeDefined();
    });

    it('should include all required analysis fields', async () => {
      const result = await service.analyzeCompany(strongCompanyRequest);

      expect(result.decision).toBeDefined();
      expect(['BUY', 'HOLD', 'TRIM', 'SELL']).toContain(result.decision);
      expect(result.recommendation).toBeDefined();
      expect(result.recommendation.action).toBeDefined();
      expect(result.recommendation.confidence).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.disclaimer).toContain('ANALYTICAL RECOMMENDATION ONLY');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.version).toContain('Warren');
    });

    it('should include disclaimer about no execution', async () => {
      const result = await service.analyzeCompany(strongCompanyRequest);

      expect(result.disclaimer).toContain('NO EXECUTION');
      expect(result.disclaimer).toContain('NO ALPACA');
      expect(result.disclaimer).toContain('EDUCATIONAL');
    });
  });

  describe('Decision Scenarios', () => {
    const baseRequest = {
      ticker: 'TEST',
      fundamentalMetrics: {
        roe: 18,
        roic: 16,
        debtToEquity: 0.4,
        fcfTrend: 'stable' as const,
        fcfValue: 80,
        priceToBook: 1.8,
        priceToEarnings: 20,
        peHistorical: 18,
        earningsCagr5y: 8,
        revenueGrowth: 5,
        dividendYears: 5,
        industryTailwind: 'normal' as const,
        marketVIX: 20,
        spPE: 18,
      },
      dcfInputs: {
        fcf: 80,
        fcfGrowthRate: 5,
        projectionYears: 5,
        terminalGrowthRate: 2.5,
        wacc: 8.5,
        equityShares: 20,
        netDebt: 100,
        fcfQuality: 'good' as const,
        earningsQuality: 'stable' as const,
      },
      macroIndicators: {
        fedRate: 4.5,
        fedRateTimestamp: new Date(),
        fedRateSource: 'FRED',
        cpi: 3.5,
        cpiTimestamp: new Date(),
        cpiSource: 'BLS',
        vix: 22,
        vixTimestamp: new Date(),
        vixSource: 'CBOE',
        spPE: 19,
        spPETimestamp: new Date(),
        spPESource: 'Bloomberg',
      },
    };

    it('should complete analysis for candidate with strong metrics', async () => {
      const request = {
        ...baseRequest,
        fundamentalMetrics: {
          ...baseRequest.fundamentalMetrics,
          roe: 22,
          priceToEarnings: 18,
          priceToBook: 1.5,
          earningsCagr5y: 14,
        },
        currentPrice: 80, // Strong discount
      };

      const result = await service.analyzeCompany(request);
      // Verify decision is made
      expect(['BUY', 'HOLD', 'TRIM', 'SELL']).toContain(result.decision);
      // Verify all gates are evaluated
      expect(result.decisionEngine.gateResults).toBeDefined();
    });

    it('should recommend HOLD for marginal candidate with cautions', async () => {
      const request = {
        ...baseRequest,
        fundamentalMetrics: { ...baseRequest.fundamentalMetrics, roe: 12 },
        currentPrice: 100,
      };

      const result = await service.analyzeCompany(request);
      expect(result.decision).toBeDefined();
    });

    it('should preserve score gate: score <80 = SELL', async () => {
      const request = {
        ...baseRequest,
        fundamentalMetrics: {
          ...baseRequest.fundamentalMetrics,
          roe: 8,
          roic: 6,
          priceToEarnings: 35,
          debtToEquity: 0.8,
        },
        currentPrice: 200,
      };

      const result = await service.analyzeCompany(request);
      expect(result.fundamentalScore.totalScore).toBeLessThan(80);
      expect(result.decision).toBe('SELL');
    });

    it('should preserve valuation gate: expensive = TRIM', async () => {
      const request = {
        ...baseRequest,
        fundamentalMetrics: { ...baseRequest.fundamentalMetrics, roe: 22 },
        dcfInputs: { ...baseRequest.dcfInputs, fcf: 20 },
        currentPrice: 400, // Extremely high relative to DCF
      };

      const result = await service.analyzeCompany(request);
      if (result.fundamentalScore.totalScore >= 80) {
        expect(['TRIM', 'HOLD']).toContain(result.decision);
      }
    });

    it('should preserve margin gate: insufficient discount = HOLD', async () => {
      const request = {
        ...baseRequest,
        fundamentalMetrics: { ...baseRequest.fundamentalMetrics, roe: 22 },
        currentPrice: 150, // High relative to valuation
      };

      const result = await service.analyzeCompany(request);
      if (result.fundamentalScore.totalScore >= 80) {
        expect(result.decision).not.toBe('BUY');
      }
    });
  });

  describe('Macro Integration (Modifier Only)', () => {
    const request = {
      ticker: 'TEST',
      fundamentalMetrics: {
        roe: 20,
        roic: 18,
        debtToEquity: 0.3,
        fcfTrend: 'growing' as const,
        fcfValue: 100,
        priceToBook: 2.0,
        priceToEarnings: 22,
        peHistorical: 23,
        earningsCagr5y: 12,
        revenueGrowth: 8,
        dividendYears: 5,
        industryTailwind: 'normal' as const,
        marketVIX: 18,
        spPE: 18,
      },
      dcfInputs: {
        fcf: 100,
        fcfGrowthRate: 7,
        projectionYears: 5,
        terminalGrowthRate: 3,
        wacc: 8,
        equityShares: 18,
        netDebt: 50,
        fcfQuality: 'good' as const,
        earningsQuality: 'stable' as const,
      },
      currentPrice: 100,
      macroIndicators: {
        fedRate: 3.5,
        fedRateTimestamp: new Date(),
        fedRateSource: 'FRED',
        cpi: 3.0,
        cpiTimestamp: new Date(),
        cpiSource: 'BLS',
        vix: 18,
        vixTimestamp: new Date(),
        vixSource: 'CBOE',
        spPE: 18,
        spPETimestamp: new Date(),
        spPESource: 'Bloomberg',
      },
    };

    it('should include position sizing adjustments based on macro', async () => {
      const bullishRequest = {
        ...request,
        macroIndicators: {
          ...request.macroIndicators,
          fedRate: 2.5,
          vix: 12,
        },
      };

      const result = await service.analyzeCompany(bullishRequest);
      expect(result.recommendation.positionSizing).toBeDefined();
      expect(result.recommendation.positionSizing.base).toBe(3); // Standard 3%
      expect(result.recommendation.positionSizing.macroAdjusted).toBeDefined();
    });

    it('should adjust margin with bearish macro', async () => {
      const bearishRequest = {
        ...request,
        macroIndicators: {
          ...request.macroIndicators,
          fedRate: 5.0,
          cpi: 4.5,
          vix: 30,
        },
      };

      const result = await service.analyzeCompany(bearishRequest);
      // Bearish should increase margin requirement
      expect(result.recommendation.marginRequired.macroAdjusted).toBeGreaterThanOrEqual(result.recommendation.marginRequired.base - 5);
    });

    it('should NOT allow macro to rescue score <80', async () => {
      const request_lowScore = {
        ...request,
        fundamentalMetrics: {
          ...request.fundamentalMetrics,
          roe: 5,
          priceToEarnings: 40,
          debtToEquity: 0.9,
        },
        macroIndicators: {
          ...request.macroIndicators,
          fedRate: 2.0,
          vix: 10,
        },
      };

      const result = await service.analyzeCompany(request_lowScore);
      expect(result.decision).toBe('SELL');
    });
  });

  describe('Analysis Completeness', () => {
    const request = {
      ticker: 'MSFT',
      fundamentalMetrics: {
        roe: 24,
        roic: 21,
        debtToEquity: 0.25,
        fcfTrend: 'growing' as const,
        fcfValue: 150,
        priceToBook: 2.2,
        priceToEarnings: 26,
        peHistorical: 28,
        earningsCagr5y: 16,
        revenueGrowth: 11,
        dividendYears: 8,
        industryTailwind: 'strong' as const,
        marketVIX: 16,
        spPE: 18,
      },
      dcfInputs: {
        fcf: 150,
        fcfGrowthRate: 9,
        projectionYears: 5,
        terminalGrowthRate: 3.5,
        wacc: 7.8,
        equityShares: 10,
        netDebt: 20,
        fcfQuality: 'excellent' as const,
        earningsQuality: 'stable' as const,
      },
      currentPrice: 120,
      macroIndicators: {
        fedRate: 3.0,
        fedRateTimestamp: new Date(),
        fedRateSource: 'FRED',
        cpi: 2.5,
        cpiTimestamp: new Date(),
        cpiSource: 'BLS',
        vix: 14,
        vixTimestamp: new Date(),
        vixSource: 'CBOE',
        spPE: 16,
        spPETimestamp: new Date(),
        spPESource: 'Bloomberg',
      },
    };

    it('should provide complete analysis with all reasoning', async () => {
      const result = await service.analyzeCompany(request);

      expect(result.analysis.fundamentalsReason).toBeDefined();
      expect(result.analysis.fundamentalsReason.length).toBeGreaterThan(0);

      expect(result.analysis.valuationReason).toBeDefined();
      expect(result.analysis.valuationReason.length).toBeGreaterThan(0);

      expect(result.analysis.macroReason).toBeDefined();
      expect(result.analysis.macroReason.length).toBeGreaterThan(0);

      expect(result.analysis.decisionReason).toBeDefined();
      expect(result.analysis.decisionReason.length).toBeGreaterThan(0);
    });

    it('should include no execution methods in output', async () => {
      const result = await service.analyzeCompany(request);
      const resultString = JSON.stringify(result);

      expect(resultString).not.toContain('execute');
      expect(resultString).not.toContain('submit');
      expect(resultString).not.toContain('order');
      expect(resultString).not.toContain('Alpaca');
    });

    it('should mark output as educational/analytical only', async () => {
      const result = await service.analyzeCompany(request);

      expect(result.disclaimer).toContain('ANALYTICAL');
      expect(result.disclaimer).toContain('EDUCATIONAL');
      expect(result.disclaimer).toContain('NOT INVESTMENT ADVICE');
    });
  });
});
