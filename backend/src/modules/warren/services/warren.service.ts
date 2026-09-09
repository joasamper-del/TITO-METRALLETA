import { Injectable, BadRequestException } from '@nestjs/common';
import { FundamentalScorerService, FundamentalMetrics, FundamentalScores } from '../strategies/fundamental-scorer';
import { DCFEngineService, DCFInputs, DCFValuation } from '../strategies/dcf-engine';
import { MacroContextService, MacroIndicators, MacroContext } from '../strategies/macro-context';
import { DecisionEngineService, DecisionInput, DecisionOutput } from '../strategies/decision-engine';

export interface WarrenAnalysisRequest {
  ticker: string;
  fundamentalMetrics: FundamentalMetrics;
  dcfInputs: DCFInputs;
  currentPrice: number;
  macroIndicators: MacroIndicators;
}

export interface WarrenAnalysisResponse {
  // Raw engine outputs
  fundamentalScore: FundamentalScores;
  dcfValuation: DCFValuation;
  macroContext: MacroContext;
  decisionEngine: DecisionOutput;

  // Summary
  ticker: string;
  decision: 'BUY' | 'HOLD' | 'TRIM' | 'SELL';

  recommendation: {
    action: string;
    confidence: 'high' | 'medium' | 'low';
    positionSizing: {
      base: number;
      macroAdjusted: number;
    };
    marginRequired: {
      base: number;
      macroAdjusted: number;
    };
  };

  analysis: {
    fundamentalsReason: string;
    valuationReason: string;
    macroReason: string;
    decisionReason: string;
  };

  disclaimer: string;
  timestamp: Date;
  version: string;
}

@Injectable()
export class WarrenService {
  /**
   * WARREN BUFFETT JR. INTEGRATION SERVICE
   *
   * Orquesta los 4 motores independientes:
   * 1. Fundamental Scorer (24/24 tests)
   * 2. DCF Engine (25/25 tests)
   * 3. Macro Context (21/21 tests)
   * 4. Decision Engine (33/33 tests)
   *
   * CRITICAL:
   * - No duplica ni altera lógica de los motores
   * - Preserva todos los gates: score 80, valuation, margin, confidence, data freshness
   * - Macro es ÚNICAMENTE modificador
   * - Output es RECOMENDACIÓN ANALÍTICA ÚNICAMENTE
   * - CERO ejecución de órdenes
   * - CERO Alpaca
   * - CERO cambios en Tito
   */

  constructor(
    private readonly fundamentalScorer: FundamentalScorerService,
    private readonly dcfEngine: DCFEngineService,
    private readonly macroContext: MacroContextService,
    private readonly decisionEngine: DecisionEngineService,
  ) {}

  /**
   * Analyze company using Warren Buffett Jr. framework
   * Input: fundamental metrics + DCF inputs + current price + macro indicators
   * Output: BUY/HOLD/TRIM/SELL recommendation + full analysis
   */
  async analyzeCompany(request: WarrenAnalysisRequest): Promise<WarrenAnalysisResponse> {
    // 1. VALIDATE INPUTS
    this.validateRequest(request);

    // 2. EXECUTE PIPELINE (each gate/engine in sequence)
    const fundamentalScore = this.fundamentalScorer.calculateScore(request.fundamentalMetrics);
    const dcfValuation = this.dcfEngine.calculateDCF(request.dcfInputs);
    const macroContext = this.macroContext.analyzeMacro(request.macroIndicators);

    // 3. Calculate margin of safety at current price
    const marginAnalysis = this.dcfEngine.calculateMarginAtPrice(dcfValuation, request.currentPrice);

    // 4. DECISION GATE (all gates applied here)
    const decisionEngine = this.decisionEngine.makeDecision({
      fundamentalScore,
      dcfValuation,
      currentPrice: request.currentPrice,
      macroContext,
    });

    // 5. BUILD RESPONSE
    const response = this.buildAnalysisResponse(
      request,
      fundamentalScore,
      dcfValuation,
      macroContext,
      decisionEngine,
      marginAnalysis,
    );

    return response;
  }

  /**
   * Validate request inputs before processing
   */
  private validateRequest(request: WarrenAnalysisRequest): void {
    if (!request.ticker || request.ticker.trim() === '') {
      throw new BadRequestException('Ticker is required and must be non-empty');
    }

    if (!request.fundamentalMetrics) {
      throw new BadRequestException('Fundamental metrics are required');
    }

    if (!request.dcfInputs) {
      throw new BadRequestException('DCF inputs are required');
    }

    if (typeof request.currentPrice !== 'number' || request.currentPrice < 0) {
      throw new BadRequestException('Current price must be a non-negative number');
    }

    if (!request.macroIndicators) {
      throw new BadRequestException('Macro indicators are required');
    }

    // Validate fundamental metrics required fields
    const requiredFundamentalFields = [
      'roe',
      'roic',
      'debtToEquity',
      'fcfTrend',
      'priceToBook',
      'priceToEarnings',
      'peHistorical',
      'earningsCagr5y',
      'revenueGrowth',
      'marketVIX',
      'spPE',
    ];
    for (const field of requiredFundamentalFields) {
      if (!(field in request.fundamentalMetrics)) {
        throw new BadRequestException(`Fundamental metrics missing required field: ${field}`);
      }
    }

    // Validate DCF inputs
    const requiredDcfFields = ['fcf', 'fcfGrowthRate', 'projectionYears', 'wacc', 'equityShares', 'netDebt', 'fcfQuality', 'earningsQuality'];
    for (const field of requiredDcfFields) {
      if (!(field in request.dcfInputs)) {
        throw new BadRequestException(`DCF inputs missing required field: ${field}`);
      }
    }

    // Validate macro indicators
    const requiredMacroFields = ['fedRate', 'fedRateTimestamp', 'fedRateSource', 'cpi', 'cpiTimestamp', 'cpiSource', 'vix', 'vixTimestamp', 'vixSource', 'spPE', 'spPETimestamp', 'spPESource'];
    for (const field of requiredMacroFields) {
      if (!(field in request.macroIndicators)) {
        throw new BadRequestException(`Macro indicators missing required field: ${field}`);
      }
    }
  }

  /**
   * Build comprehensive analysis response
   */
  private buildAnalysisResponse(
    request: WarrenAnalysisRequest,
    fundamentalScore: FundamentalScores,
    dcfValuation: DCFValuation,
    macroContext: MacroContext,
    decisionEngine: DecisionOutput,
    marginAnalysis: any,
  ): WarrenAnalysisResponse {
    const decision = decisionEngine.decision;

    // Build readable action description
    const actionReason = this.buildActionReason(decision, fundamentalScore, dcfValuation, macroContext, marginAnalysis);

    // Build analysis reasons
    const analysis = {
      fundamentalsReason: `Score: ${fundamentalScore.totalScore.toFixed(1)}/100 (${fundamentalScore.scoreCategory.toUpperCase()}). Valuation: ${fundamentalScore.valuation}/30, Quality: ${fundamentalScore.quality}/35, Growth: ${fundamentalScore.growth}/20, Macro: ${fundamentalScore.macro}/15.`,
      valuationReason: `${dcfValuation.valuationStatus.toUpperCase()} valuation. Fair value range: ${dcfValuation.fairValueRange.low.toFixed(2)} - ${dcfValuation.fairValueRange.high.toFixed(2)} (base: ${dcfValuation.baseCase.fairValue.toFixed(2)}). Current price: ${request.currentPrice.toFixed(2)}. Discount: ${marginAnalysis.percentDiscountFromConservative.toFixed(1)}%.`,
      macroReason: `Macro context: ${macroContext.macroContext.toUpperCase()}. ${macroContext.contextReason} Confidence: ${macroContext.confidenceLevel.toUpperCase()}.`,
      decisionReason: `Decision: ${decision}. ${decisionEngine.explanation.split('\n').pop()}`,
    };

    return {
      fundamentalScore,
      dcfValuation,
      macroContext,
      decisionEngine,

      ticker: request.ticker,
      decision,

      recommendation: {
        action: actionReason,
        confidence: macroContext.confidenceLevel,
        positionSizing: {
          base: decisionEngine.positionSizing.baseAllocation,
          macroAdjusted: decisionEngine.positionSizing.macroAdjusted,
        },
        marginRequired: {
          base: decisionEngine.marginRequired.base,
          macroAdjusted: decisionEngine.marginRequired.macroAdjusted,
        },
      },

      analysis,

      disclaimer:
        'ANALYTICAL RECOMMENDATION ONLY. NOT INVESTMENT ADVICE. NO EXECUTION OF ORDERS. NO ALPACA CONNECTION. FOR EDUCATIONAL PURPOSES.',

      timestamp: new Date(),
      version: 'Warren Buffett Jr. v1.0',
    };
  }

  /**
   * Build human-readable action reason
   */
  private buildActionReason(decision: string, score: FundamentalScores, valuation: DCFValuation, macro: MacroContext, margin: any): string {
    switch (decision) {
      case 'BUY':
        return `Strong fundamental score (${score.totalScore.toFixed(1)}) + attractive valuation + adequate margin (${margin.percentDiscountFromConservative.toFixed(1)}%) + ${macro.macroContext} macro. Proceed with analysis for new position.`;
      case 'HOLD':
        return `Score qualifies (${score.totalScore.toFixed(1)}) but one or more gates require caution: valuation (${valuation.valuationStatus}), margin (${margin.percentDiscountFromConservative.toFixed(1)}%), or data freshness. Monitor for improvements.`;
      case 'TRIM':
        return `Expensive valuation (P/E >30 or DCF expensive) detected. Recommend trimming existing positions. Current price ${margin.percentDiscountFromConservative.toFixed(1)}% vs conservative fair value.`;
      case 'SELL':
        return `Score below 80 threshold (${score.totalScore.toFixed(1)}) or fundamental rejection. Do not initiate new positions. Strong recommendation to avoid.`;
      default:
        return 'Decision pending analysis.';
    }
  }
}
