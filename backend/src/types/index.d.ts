export interface MarketData {
    symbol: string;
    price: number;
    volume: number;
    liquidity: number;
    trend: 'alcista' | 'bajista' | 'lateral' | 'desconocido';
    rsi: number | null;
    gex: number | null;
    premiumDiscount: 'premium' | 'discount' | 'neutral' | 'desconocido';
    support: number | null;
    resistance: number | null;
    timestamp: Date;
    dataSource?: string;
}
export interface MarketContext {
    spy: MarketData;
    qqq: MarketData;
    vix: MarketData;
    marketIsOpen: boolean;
    timeUntilClose: number | null;
}
export interface RuleConfig {
    id: string;
    name: string;
    enabled: boolean;
    weight: number;
    condition: (data: MarketData, context: MarketContext) => boolean;
    description: string;
}
export interface RuleEvaluation {
    ruleId: string;
    ruleName: string;
    passed: boolean;
    points: number;
    reason: string;
}
export interface AnalysisResult {
    symbol: string;
    strategy: string;
    marketData: MarketData;
    marketContext: MarketContext;
    ruleEvaluations: RuleEvaluation[];
    totalScore: number;
    maxScore: number;
    percentageScore: number;
    decision: 'operar' | 'esperar' | 'no_operar';
    confidence: number;
    riskLevel: 'bajo' | 'medio' | 'alto';
    mainReasons: string[];
    invalidationConditions: string[];
    manualReviewNeeded: boolean;
    manualReviewReasons: string[];
    timestamp: Date;
}
export interface OperationPlan {
    entry: number | null;
    target: number | null;
    stop: number | null;
    notes: string;
}
export interface OpportunityReport {
    id: string;
    symbol: string;
    strategy: string;
    state: 'operar' | 'esperar' | 'no_operar';
    confidence: number;
    risk: 'bajo' | 'medio' | 'alto';
    mainReasons: string[];
    invalidationConditions: string[];
    plan: OperationPlan;
    analysis: AnalysisResult;
    createdAt: Date;
    result?: 'ganancia' | 'pérdida' | null;
    points?: number;
    successReasons?: string[];
    failureReasons?: string[];
    lessons?: string[];
}
export interface TradeResult {
    reportId: string;
    symbol: string;
    result: 'ganancia' | 'pérdida';
    points: number;
    pnl?: number;
    successReasons: string[];
    failureReasons: string[];
    lessons: string[];
    recordedAt: Date;
}
