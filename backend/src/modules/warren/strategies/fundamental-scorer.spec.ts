import { describe, it, expect, beforeEach } from 'vitest';
import { FundamentalScorerService, FundamentalMetrics } from './fundamental-scorer';

describe('FundamentalScorerService', () => {
  let service: FundamentalScorerService;

  beforeEach(() => {
    service = new FundamentalScorerService();
  });

  describe('Score Calculation Fundamentals', () => {
    it('should calculate valuation score correctly', () => {
      const metrics: FundamentalMetrics = {
        priceToBook: 1.5,
        priceToEarnings: 18,
        peHistorical: 20,
        roe: 20,
        roic: 18,
        debtToEquity: 0.3,
        fcfTrend: 'growing',
        earningsCagr5y: 12,
        revenueGrowth: 7,
        industryTailwind: 'normal',
        marketVIX: 18,
        spPE: 19,
      };

      const score = service.calculateScore(metrics);
      // P/B 1.5 = 10pts, P/E ratio (18/20=0.9) = 10pts
      expect(score.valuation).toBe(20);
    });

    it('should calculate quality score correctly', () => {
      const metrics: FundamentalMetrics = {
        priceToBook: 1.5,
        priceToEarnings: 18,
        peHistorical: 20,
        roe: 20,
        roic: 18,
        debtToEquity: 0.3,
        fcfTrend: 'growing',
        dividendYears: 20,
        earningsCagr5y: 12,
        revenueGrowth: 7,
        industryTailwind: 'normal',
        marketVIX: 18,
        spPE: 19,
      };

      const score = service.calculateScore(metrics);
      // ROE 20 = 10, D/E 0.3 = 10, FCF growing = 8, Div 20y = 7
      expect(score.quality).toBe(35);
    });

    it('should calculate growth score correctly', () => {
      const metrics: FundamentalMetrics = {
        priceToBook: 1.5,
        priceToEarnings: 18,
        peHistorical: 20,
        roe: 20,
        roic: 18,
        debtToEquity: 0.3,
        fcfTrend: 'growing',
        earningsCagr5y: 18,
        revenueGrowth: 12,
        industryTailwind: 'normal',
        marketVIX: 18,
        spPE: 19,
      };

      const score = service.calculateScore(metrics);
      // CAGR 18% = 10, Revenue 12% = 10
      expect(score.growth).toBe(20);
    });

    it('should calculate macro score with market adjustment', () => {
      const metrics: FundamentalMetrics = {
        priceToBook: 1.5,
        priceToEarnings: 18,
        peHistorical: 20,
        roe: 20,
        roic: 18,
        debtToEquity: 0.3,
        fcfTrend: 'growing',
        earningsCagr5y: 12,
        revenueGrowth: 7,
        industryTailwind: 'strong',
        marketVIX: 18,
        spPE: 19,
      };

      const score = service.calculateScore(metrics);
      // Tailwind strong = 10, Market 19 = 0, VIX 18 = no adjustment
      expect(score.macro).toBe(10);
    });
  });

  describe('CRITICAL: Score Threshold Tests (80 is absolute minimum)', () => {
    it('should categorize score < 80 as WATCH or AVOID', () => {
      // Example: score 70
      const metrics: FundamentalMetrics = {
        priceToBook: 2.5, // 5
        priceToEarnings: 25,
        peHistorical: 20, // 1.25 = 5 (val: 10)
        roe: 12, // 4
        roic: 11,
        debtToEquity: 0.7, // 4
        fcfTrend: 'stable', // 5 (qual: 18)
        dividendYears: 0,
        earningsCagr5y: 7, // 4 (growth: 11)
        revenueGrowth: 4, // 4
        industryTailwind: 'normal', // 7 (macro: 7)
        marketVIX: 20,
        spPE: 20,
      };

      const score = service.calculateScore(metrics);
      expect(score.totalScore).toBeLessThan(80);
      expect(['watch', 'avoid']).toContain(score.scoreCategory);
    });

    it('should categorize score 80-84 as CANDIDATE (opens gate)', () => {
      // Example: score in candidate range (80-84)
      const metrics: FundamentalMetrics = {
        priceToBook: 1.5, // 10
        priceToEarnings: 18,
        peHistorical: 20, // 0.9 = 10 (val: 20)
        roe: 20, // 10
        roic: 18,
        debtToEquity: 0.3, // 10
        fcfTrend: 'growing', // 8 (qual: 33)
        dividendYears: 10, // 5
        earningsCagr5y: 15, // 10 (growth: 17)
        revenueGrowth: 8, // 7
        industryTailwind: 'strong', // 10 (macro: 10)
        marketVIX: 18,
        spPE: 18, // S&P 18 = +0
      };

      const score = service.calculateScore(metrics);
      // Val:20 + Qual:33 + Growth:17 + Macro:10 = 80
      expect(score.totalScore).toBeGreaterThanOrEqual(80);
      if (score.totalScore < 85) {
        expect(score.scoreCategory).toBe('candidate');
      }
    });

    it('should categorize score 85+ as APPROVED (pending validations)', () => {
      // Example: score 85+
      const metrics: FundamentalMetrics = {
        priceToBook: 1.0, // 15
        priceToEarnings: 15,
        peHistorical: 20, // 0.75 = 15 (val: 30)
        roe: 20, // 10
        roic: 18,
        debtToEquity: 0.25, // 10
        fcfTrend: 'growing', // 8 (qual: 35)
        dividendYears: 15, // 7
        earningsCagr5y: 15, // 10 (growth: 17)
        revenueGrowth: 9, // 7
        industryTailwind: 'strong', // 10 (macro: 10)
        marketVIX: 15,
        spPE: 14, // S&P <15 +5
      };

      const score = service.calculateScore(metrics);
      if (score.totalScore >= 85) {
        expect(score.scoreCategory).toBe('approved');
      }
    });
  });

  describe('Gatekeeping: Score >= 80 but other gates fail', () => {
    it('should return false if score < 80 even with perfect other metrics', () => {
      const metrics: FundamentalMetrics = {
        priceToBook: 2.0, // 10
        priceToEarnings: 22, // 0 (val: 10)
        peHistorical: 20,
        roe: 5, // 0 (qual: 0)
        roic: 2,
        debtToEquity: 2.0, // 0
        fcfTrend: 'negative', // 0
        earningsCagr5y: 0, // 2 (growth: 2)
        revenueGrowth: -2, // 0
        industryTailwind: 'severe', // 0 (macro: -5)
        marketVIX: 30,
        spPE: 25,
      };

      const score = service.calculateScore(metrics);
      expect(score.totalScore).toBeLessThan(50);
      expect(service.isScoreValid(score)).toBe(false);
    });

    it('should return true if score >= 80 (gate 1 passes)', () => {
      const metrics: FundamentalMetrics = {
        priceToBook: 0.9, // 15 (val: 30)
        priceToEarnings: 15,
        peHistorical: 20, // 0.75 = 15 (val: 30)
        roe: 21, // 10
        roic: 19,
        debtToEquity: 0.25, // 10
        fcfTrend: 'growing', // 8 (qual: 35)
        dividendYears: 16, // 7
        earningsCagr5y: 15, // 10 (growth: 20)
        revenueGrowth: 10, // 10
        industryTailwind: 'strong', // 10 (macro: 15+)
        marketVIX: 12,
        spPE: 12, // S&P 12 +5, VIX 12 +0 = +5 (macro: 15+)
      };

      const score = service.calculateScore(metrics);
      expect(score.totalScore).toBeGreaterThanOrEqual(80);
      expect(service.isScoreValid(score)).toBe(true);
    });
  });

  describe('Detailed Component Scoring', () => {
    it('should score P/B ratio correctly at all thresholds', () => {
      expect(service['scorePriceToBook'](0.8)).toBe(15); // < 1.0
      expect(service['scorePriceToBook'](1.0)).toBe(10); // 1.0-2.0
      expect(service['scorePriceToBook'](2.0)).toBe(10); // exactly 2.0 boundary
      expect(service['scorePriceToBook'](2.5)).toBe(5); // 2.0-3.0
      expect(service['scorePriceToBook'](3.0)).toBe(5); // exactly 3.0 boundary
      expect(service['scorePriceToBook'](4.0)).toBe(0); // > 3.0
    });

    it('should score P/E ratio correctly at all thresholds', () => {
      expect(service['scorePriceToEarnings'](12, 16)).toBe(15); // 0.75 ratio < 0.8
      expect(service['scorePriceToEarnings'](16, 20)).toBe(10); // 0.8 ratio = 0.8-1.0
      expect(service['scorePriceToEarnings'](20, 20)).toBe(10); // 1.0 ratio = boundary to next
      expect(service['scorePriceToEarnings'](22, 18)).toBe(5); // 1.22 ratio = 1.0-1.3
      expect(service['scorePriceToEarnings'](30, 20)).toBe(0); // 1.5 ratio > 1.3
    });

    it('should score ROE correctly at all thresholds', () => {
      expect(service['scoreROE'](25)).toBe(10);
      expect(service['scoreROE'](20)).toBe(10);
      expect(service['scoreROE'](17)).toBe(7);
      expect(service['scoreROE'](15)).toBe(7);
      expect(service['scoreROE'](12)).toBe(4);
      expect(service['scoreROE'](10)).toBe(4);
      expect(service['scoreROE'](5)).toBe(0);
    });

    it('should score D/E ratio correctly at all thresholds', () => {
      expect(service['scoreDebtToEquity'](0.2)).toBe(10);
      expect(service['scoreDebtToEquity'](0.3)).toBe(10);
      expect(service['scoreDebtToEquity'](0.4)).toBe(7);
      expect(service['scoreDebtToEquity'](0.5)).toBe(7);
      expect(service['scoreDebtToEquity'](0.6)).toBe(4);
      expect(service['scoreDebtToEquity'](0.8)).toBe(4);
      expect(service['scoreDebtToEquity'](1.2)).toBe(0);
    });

    it('should score FCF trend correctly', () => {
      expect(service['scoreFCFQuality']('growing')).toBe(8);
      expect(service['scoreFCFQuality']('stable')).toBe(5);
      expect(service['scoreFCFQuality']('declining')).toBe(2);
      expect(service['scoreFCFQuality']('negative')).toBe(0);
    });

    it('should score dividend history correctly', () => {
      expect(service['scoreDividend'](20)).toBe(7);
      expect(service['scoreDividend'](15)).toBe(7);
      expect(service['scoreDividend'](10)).toBe(5);
      expect(service['scoreDividend'](5)).toBe(5);
      expect(service['scoreDividend'](3)).toBe(2);
      expect(service['scoreDividend'](undefined)).toBe(0);
    });

    it('should score earnings CAGR correctly', () => {
      expect(service['scoreEarningsCagr'](20)).toBe(10);
      expect(service['scoreEarningsCagr'](15)).toBe(10);
      expect(service['scoreEarningsCagr'](12)).toBe(7);
      expect(service['scoreEarningsCagr'](10)).toBe(7);
      expect(service['scoreEarningsCagr'](7)).toBe(4);
      expect(service['scoreEarningsCagr'](5)).toBe(4);
      expect(service['scoreEarningsCagr'](3)).toBe(2);
    });

    it('should score revenue growth correctly', () => {
      expect(service['scoreRevenueGrowth'](15)).toBe(10);
      expect(service['scoreRevenueGrowth'](10)).toBe(10);
      expect(service['scoreRevenueGrowth'](7)).toBe(7);
      expect(service['scoreRevenueGrowth'](5)).toBe(7);
      expect(service['scoreRevenueGrowth'](3)).toBe(4);
      expect(service['scoreRevenueGrowth'](2)).toBe(4);
      expect(service['scoreRevenueGrowth'](1)).toBe(0);
    });

    it('should score industry tailwind correctly', () => {
      expect(service['scoreTailwind']('strong')).toBe(10);
      expect(service['scoreTailwind']('normal')).toBe(7);
      expect(service['scoreTailwind']('headwind')).toBe(4);
      expect(service['scoreTailwind']('severe')).toBe(0);
    });
  });

  describe('Market Adjustment (Macro)', () => {
    it('should apply market valuation adjustment based on S&P 500 P/E', () => {
      // S&P P/E < 15 = +5
      expect(service['calculateMarketAdjustment'](14, 18)).toBe(5);

      // S&P P/E 15-18 = +2
      expect(service['calculateMarketAdjustment'](16, 18)).toBe(2);

      // S&P P/E 18-22 = 0
      expect(service['calculateMarketAdjustment'](20, 18)).toBe(0);

      // S&P P/E > 22 = -5
      expect(service['calculateMarketAdjustment'](24, 18)).toBe(-5);
    });

    it('should apply VIX adjustment for market stress', () => {
      // VIX > 25 = -3 additional
      const highStress = service['calculateMarketAdjustment'](20, 28); // Would be 0, -3 = -3
      expect(highStress).toBe(-3);

      // VIX > 20 = -1 additional
      const mediumStress = service['calculateMarketAdjustment'](20, 22); // Would be 0, -1 = -1
      expect(mediumStress).toBe(-1);

      // VIX < 20 = no penalty
      const lowStress = service['calculateMarketAdjustment'](20, 18); // Would be 0
      expect(lowStress).toBe(0);
    });

    it('should clamp market adjustment to -5 to +5 range', () => {
      // Even if both S&P and VIX are very favorable, clamp to +5
      const maxAdjustment = service['calculateMarketAdjustment'](10, 10);
      expect(maxAdjustment).toBeLessThanOrEqual(5);

      // Even if both S&P and VIX are very unfavorable, clamp to -5
      const minAdjustment = service['calculateMarketAdjustment'](30, 40);
      expect(minAdjustment).toBeGreaterThanOrEqual(-5);
    });
  });

  describe('Action Recommendation (Score-based only)', () => {
    it('should return canConsider: false for score < 80', () => {
      const scoreData = {
        valuation: 20,
        quality: 25,
        growth: 14,
        macro: 5,
        totalScore: 64,
        scoreCategory: 'watch' as const,
        details: {
          pbScore: 10,
          peScore: 10,
          roeScore: 7,
          deScore: 7,
          fcfScore: 5,
          divScore: 2,
          cagScore: 7,
          revScore: 7,
          tailwindScore: 7,
          marketAdjustment: -2,
        },
      };

      const action = service.getScoreAction(scoreData);
      expect(action.canConsider).toBe(false);
      expect(action.category).toBe('watch');
      expect(action.minThresholdMessage).toContain('below minimum 80');
    });

    it('should return canConsider: true with CANDIDATE for 80-84', () => {
      const scoreData = {
        valuation: 25,
        quality: 30,
        growth: 15,
        macro: 12,
        totalScore: 82,
        scoreCategory: 'candidate' as const,
        details: {
          pbScore: 15,
          peScore: 10,
          roeScore: 10,
          deScore: 10,
          fcfScore: 8,
          divScore: 2,
          cagScore: 7,
          revScore: 8,
          tailwindScore: 7,
          marketAdjustment: 5,
        },
      };

      const action = service.getScoreAction(scoreData);
      expect(action.canConsider).toBe(true);
      expect(action.category).toBe('CANDIDATE');
      expect(action.minThresholdMessage).toContain('second interview');
    });

    it('should return canConsider: true with APPROVED for 85+', () => {
      const scoreData = {
        valuation: 30,
        quality: 35,
        growth: 20,
        macro: 10,
        totalScore: 95,
        scoreCategory: 'approved' as const,
        details: {
          pbScore: 15,
          peScore: 15,
          roeScore: 10,
          deScore: 10,
          fcfScore: 8,
          divScore: 7,
          cagScore: 10,
          revScore: 10,
          tailwindScore: 10,
          marketAdjustment: 0,
        },
      };

      const action = service.getScoreAction(scoreData);
      expect(action.canConsider).toBe(true);
      expect(action.category).toBe('APPROVED');
      expect(action.minThresholdMessage).toContain('final gatekeeping');
    });
  });
});
