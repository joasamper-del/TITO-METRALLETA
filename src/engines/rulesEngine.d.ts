import { RuleConfig, RuleEvaluation, MarketData, MarketContext, AnalysisResult } from '../types';
export declare class RulesEngine {
    private rules;
    constructor();
    /**
     * Inicializa las reglas por defecto
     */
    private initializeDefaultRules;
    /**
     * Agrega una nueva regla o actualiza una existente
     */
    addRule(rule: RuleConfig): void;
    /**
     * Obtiene una regla específica
     */
    getRule(id: string): RuleConfig | undefined;
    /**
     * Obtiene todas las reglas
     */
    getAllRules(): RuleConfig[];
    /**
     * Habilita una regla
     */
    enableRule(id: string): void;
    /**
     * Deshabilita una regla
     */
    disableRule(id: string): void;
    /**
     * Actualiza el peso de una regla
     */
    setRuleWeight(id: string, weight: number): void;
    /**
     * Evalúa todos los datos contra todas las reglas habilitadas
     */
    evaluate(data: MarketData, context: MarketContext): RuleEvaluation[];
    /**
     * Calcula el análisis completo
     */
    analyzeData(data: MarketData, context: MarketContext, strategy: string): AnalysisResult;
}
