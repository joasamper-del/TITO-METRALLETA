import { AnalysisResult, OpportunityReport, OperationPlan, TradeResult } from '../types';
export declare class ReportEngine {
    /**
     * Genera un reporte de oportunidad a partir del análisis
     */
    generateReport(analysis: AnalysisResult, strategy: string, plan: OperationPlan): OpportunityReport;
    /**
     * Genera un reporte de revisión manual cuando faltan datos
     */
    generateManualReviewReport(symbol: string, strategy: string, missingData: string[]): OpportunityReport;
    /**
     * Formatea el reporte para mostrar en consola o interfaz
     */
    formatReportForDisplay(report: OpportunityReport): string;
    /**
     * Registra el resultado de una operación paper
     */
    recordTradeResult(report: OpportunityReport, result: 'ganancia' | 'pérdida', successReasons?: string[], failureReasons?: string[], lessons?: string[]): TradeResult;
    /**
     * Genera estadísticas de rendimiento a partir de resultados
     */
    generatePerformanceStats(results: TradeResult[]): {
        totalTrades: number;
        wins: number;
        losses: number;
        winRate: number;
        avgPointsPerWin: number;
        avgPointsPerLoss: number;
        bestTrade: any;
        worstTrade: any;
    } | {
        totalTrades: number;
        wins: number;
        losses: number;
        winRate: string;
        avgPointsPerWin: string;
        avgPointsPerLoss: string;
        bestTrade: TradeResult;
        worstTrade: TradeResult;
    };
    /**
     * Analiza qué reglas funcionan mejor
     */
    analyzeRuleEffectiveness(reports: OpportunityReport[]): Map<string, {
        successes: number;
        failures: number;
        effectivenessRate: number;
    }>;
    /**
     * Genera un ID único para el reporte
     */
    private generateId;
    private formatDecision;
    private formatRisk;
    private formatPrice;
}
