import { DataEngine } from '../engines/dataEngine';
import { RulesEngine } from '../engines/rulesEngine';
import { ReportEngine } from '../engines/reportEngine';
import { OpportunityReport, OperationPlan } from '../types';
/**
 * Coordinador principal que orquesta los tres motores
 */
export declare class TitoMetralletaAnalyzer {
    private dataEngine;
    private rulesEngine;
    private reportEngine;
    constructor(alphaVantageKey?: string, finnhubKey?: string);
    /**
     * Analiza una oportunidad de trading completa
     */
    analyzeOpportunity(symbol: string, strategy: string, plan: OperationPlan): Promise<OpportunityReport | null>;
    /**
     * Analiza múltiples símbolos en paralelo
     */
    analyzeMultiple(opportunities: Array<{
        symbol: string;
        strategy: string;
        plan: OperationPlan;
    }>): Promise<OpportunityReport[]>;
    /**
     * Obtiene acceso directo a los motores para configuración avanzada
     */
    getDataEngine(): DataEngine;
    getRulesEngine(): RulesEngine;
    getReportEngine(): ReportEngine;
    /**
     * Personaliza el peso de una regla
     */
    setRuleWeight(ruleId: string, weight: number): void;
    /**
     * Deshabilita una regla específica
     */
    disableRule(ruleId: string): void;
    /**
     * Habilita una regla específica
     */
    enableRule(ruleId: string): void;
    /**
     * Lista todas las reglas disponibles
     */
    listRules(): void;
    /**
     * Obtiene las estadísticas del contexto de mercado
     */
    getMarketStatus(): Promise<void>;
}
