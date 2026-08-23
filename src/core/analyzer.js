"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TitoMetralletaAnalyzer = void 0;
const dataEngine_1 = require("../engines/dataEngine");
const rulesEngine_1 = require("../engines/rulesEngine");
const reportEngine_1 = require("../engines/reportEngine");
/**
 * Coordinador principal que orquesta los tres motores
 */
class TitoMetralletaAnalyzer {
    constructor(alphaVantageKey = '', finnhubKey = '') {
        this.dataEngine = new dataEngine_1.DataEngine(alphaVantageKey, finnhubKey);
        this.rulesEngine = new rulesEngine_1.RulesEngine();
        this.reportEngine = new reportEngine_1.ReportEngine();
    }
    /**
     * Analiza una oportunidad de trading completa
     */
    async analyzeOpportunity(symbol, strategy, plan) {
        try {
            console.log(`\n🔍 Analizando ${symbol} con estrategia: ${strategy}`);
            // Paso 1: Obtener contexto de mercado general
            console.log('📡 Obteniendo contexto de mercado...');
            const marketContext = await this.dataEngine.getMarketContext();
            if (!marketContext) {
                console.error('❌ No se pudo obtener contexto de mercado');
                return null;
            }
            // Paso 2: Obtener datos específicos del símbolo
            console.log(`📊 Obteniendo datos de ${symbol}...`);
            const marketData = await this.dataEngine.getMarketData(symbol);
            if (!marketData) {
                console.error(`❌ No se pudo obtener datos de ${symbol}`);
                return null;
            }
            // Paso 3: Verificar si se necesita revisión manual
            if (marketData.price === 0 || marketData.volume === 0) {
                console.log(`⚠️  ${symbol} requiere revisión manual - datos incompletos`);
                const missingData = [];
                if (marketData.price === 0)
                    missingData.push('Precio');
                if (marketData.volume === 0)
                    missingData.push('Volumen');
                return this.reportEngine.generateManualReviewReport(symbol, strategy, missingData);
            }
            // Paso 4: Evaluar reglas
            console.log('⚙️  Evaluando reglas...');
            const analysis = this.rulesEngine.analyzeData(marketData, marketContext, strategy);
            // Paso 5: Generar reporte
            console.log('📄 Generando reporte...');
            const report = this.reportEngine.generateReport(analysis, strategy, plan);
            return report;
        }
        catch (error) {
            console.error('❌ Error durante el análisis:', error);
            return null;
        }
    }
    /**
     * Analiza múltiples símbolos en paralelo
     */
    async analyzeMultiple(opportunities) {
        const promises = opportunities.map((opp) => this.analyzeOpportunity(opp.symbol, opp.strategy, opp.plan));
        const results = await Promise.all(promises);
        return results.filter((r) => r !== null);
    }
    /**
     * Obtiene acceso directo a los motores para configuración avanzada
     */
    getDataEngine() {
        return this.dataEngine;
    }
    getRulesEngine() {
        return this.rulesEngine;
    }
    getReportEngine() {
        return this.reportEngine;
    }
    /**
     * Personaliza el peso de una regla
     */
    setRuleWeight(ruleId, weight) {
        this.rulesEngine.setRuleWeight(ruleId, weight);
        console.log(`✅ Regla "${ruleId}" actualizada a ${weight} puntos`);
    }
    /**
     * Deshabilita una regla específica
     */
    disableRule(ruleId) {
        this.rulesEngine.disableRule(ruleId);
        console.log(`✅ Regla "${ruleId}" deshabilitada`);
    }
    /**
     * Habilita una regla específica
     */
    enableRule(ruleId) {
        this.rulesEngine.enableRule(ruleId);
        console.log(`✅ Regla "${ruleId}" habilitada`);
    }
    /**
     * Lista todas las reglas disponibles
     */
    listRules() {
        console.log('\n📋 REGLAS DISPONIBLES:');
        const rules = this.rulesEngine.getAllRules();
        rules.forEach((rule) => {
            const status = rule.enabled ? '✅' : '❌';
            console.log(`${status} ${rule.id}: ${rule.name} (${rule.weight} puntos)`);
            console.log(`   ${rule.description}\n`);
        });
    }
    /**
     * Obtiene las estadísticas del contexto de mercado
     */
    async getMarketStatus() {
        const context = await this.dataEngine.getMarketContext();
        if (!context) {
            console.log('❌ No se pudo obtener contexto de mercado');
            return;
        }
        console.log('\n📊 ESTADO DEL MERCADO:');
        console.log(`SPY: $${context.spy.price} - Tendencia: ${context.spy.trend}`);
        console.log(`QQQ: $${context.qqq.price} - Tendencia: ${context.qqq.trend}`);
        console.log(`VIX: ${context.vix.price} - Volatilidad`);
        console.log(`Mercado: ${context.marketIsOpen ? '🟢 ABIERTO' : '🔴 CERRADO'}`);
        if (context.timeUntilClose) {
            console.log(`Minutos al cierre: ${context.timeUntilClose}`);
        }
    }
}
exports.TitoMetralletaAnalyzer = TitoMetralletaAnalyzer;
