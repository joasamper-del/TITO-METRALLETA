/**
 * Motor Simplificado de Tito Metralleta para el Navegador
 * Versión JavaScript pura del sistema de análisis
 */

class TitoMetralletaMotor {
    constructor() {
        this.rules = this.initializeDefaultRules();
        this.history = this.loadHistory();
        this.watchlist = this.loadWatchlist();
    }

    /**
     * Inicializa las reglas por defecto
     */
    initializeDefaultRules() {
        return {
            trend_bullish: {
                id: 'trend_bullish',
                name: 'Tendencia Alcista',
                enabled: true,
                weight: 25,
                description: 'Verifica si el activo está en tendencia alcista'
            },
            zone_premium: {
                id: 'zone_premium',
                name: 'Zona Premium',
                enabled: true,
                weight: 25,
                description: 'Verifica si el activo está en zona premium'
            },
            volume_high: {
                id: 'volume_high',
                name: 'Volumen Alto',
                enabled: true,
                weight: 20,
                description: 'Verifica si el volumen es superior a 1M'
            },
            gex_positive: {
                id: 'gex_positive',
                name: 'GEX Positivo',
                enabled: true,
                weight: 20,
                description: 'Verifica si el GEX es positivo'
            },
            rsi_not_overbought: {
                id: 'rsi_not_overbought',
                name: 'RSI No Sobrecomprado',
                enabled: true,
                weight: 10,
                description: 'Verifica que RSI < 70'
            },
            market_context_bullish: {
                id: 'market_context_bullish',
                name: 'Contexto Alcista',
                enabled: true,
                weight: 15,
                description: 'Verifica si SPY está en tendencia alcista'
            },
            vix_low: {
                id: 'vix_low',
                name: 'VIX Bajo',
                enabled: true,
                weight: 10,
                description: 'Verifica si VIX < 20'
            },
            liquidity_sufficient: {
                id: 'liquidity_sufficient',
                name: 'Liquidez Suficiente',
                enabled: true,
                weight: 10,
                description: 'Verifica liquidez > 100k'
            }
        };
    }

    /**
     * Genera datos simulados para demostración
     */
    generateMockData(symbol, options = {}) {
        const baseData = {
            symbol,
            price: 150.5 + Math.random() * 50,
            volume: Math.floor(Math.random() * 5000000) + 500000,
            liquidity: Math.floor(Math.random() * 500000) + 100000,
            trend: ['alcista', 'bajista', 'lateral'][Math.floor(Math.random() * 3)],
            rsi: Math.floor(Math.random() * 100),
            gex: (Math.random() - 0.5) * 1000,
            premiumDiscount: ['premium', 'discount', 'neutral'][Math.floor(Math.random() * 3)],
            support: 145.0,
            resistance: 155.0,
            timestamp: new Date()
        };

        return { ...baseData, ...options };
    }

    /**
     * Genera contexto de mercado simulado
     */
    generateMockContext() {
        return {
            spy: this.generateMockData('SPY', {
                price: 450 + Math.random() * 20,
                trend: Math.random() > 0.3 ? 'alcista' : 'bajista'
            }),
            qqq: this.generateMockData('QQQ', {
                price: 350 + Math.random() * 20,
                trend: Math.random() > 0.3 ? 'alcista' : 'bajista'
            }),
            vix: this.generateMockData('VIX', {
                price: 15 + Math.random() * 15,
                trend: 'bajista'
            }),
            marketIsOpen: this.isMarketOpen(),
            timeUntilClose: this.getTimeUntilClose()
        };
    }

    /**
     * Evalúa una regla específica
     */
    evaluateRule(ruleId, data, context) {
        const rule = this.rules[ruleId];
        if (!rule || !rule.enabled) return null;

        let passed = false;

        switch (ruleId) {
            case 'trend_bullish':
                passed = data.trend === 'alcista';
                break;
            case 'zone_premium':
                passed = data.premiumDiscount === 'premium';
                break;
            case 'volume_high':
                passed = data.volume > 1000000;
                break;
            case 'gex_positive':
                passed = data.gex > 0;
                break;
            case 'rsi_not_overbought':
                passed = data.rsi < 70;
                break;
            case 'market_context_bullish':
                passed = context.spy.trend === 'alcista';
                break;
            case 'vix_low':
                passed = context.vix.price < 20;
                break;
            case 'liquidity_sufficient':
                passed = data.liquidity > 100000;
                break;
        }

        return {
            ruleId: rule.id,
            ruleName: rule.name,
            passed,
            points: passed ? rule.weight : 0,
            reason: passed ? `✓ ${rule.description}` : `✗ ${rule.description}`
        };
    }

    /**
     * Analiza datos contra todas las reglas
     */
    analyze(symbol, strategy, options = {}) {
        const data = options.marketData || this.generateMockData(symbol);
        const context = options.marketContext || this.generateMockContext();

        // Evalúa todas las reglas
        const ruleEvaluations = Object.keys(this.rules)
            .map(ruleId => this.evaluateRule(ruleId, data, context))
            .filter(eval => eval !== null);

        // Calcula puntuación
        const totalScore = ruleEvaluations.reduce((sum, r) => sum + r.points, 0);
        const maxScore = ruleEvaluations.reduce((sum, r) => sum + this.rules[r.ruleId].weight, 0);
        const percentageScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

        // Determina decisión
        let decision = 'no_operar';
        if (percentageScore >= 85) decision = 'operar';
        else if (percentageScore >= 65) decision = 'esperar';

        // Determina riesgo
        let riskLevel = 'medio';
        if (percentageScore >= 85) riskLevel = 'bajo';
        else if (percentageScore < 50) riskLevel = 'alto';

        // Razones principales
        const mainReasons = ruleEvaluations
            .filter(r => r.passed)
            .map(r => r.ruleName);

        // Condiciones de invalidación
        const invalidationConditions = ruleEvaluations
            .filter(r => !r.passed)
            .map(r => r.ruleName);

        const analysis = {
            symbol,
            strategy,
            marketData: data,
            marketContext: context,
            ruleEvaluations,
            totalScore,
            maxScore,
            percentageScore,
            decision,
            confidence: percentageScore,
            riskLevel,
            mainReasons,
            invalidationConditions,
            timestamp: new Date()
        };

        return analysis;
    }

    /**
     * Genera un reporte a partir del análisis
     */
    generateReport(analysis, plan = {}) {
        return {
            id: `TM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            symbol: analysis.symbol,
            strategy: analysis.strategy,
            state: analysis.decision,
            confidence: analysis.confidence,
            risk: analysis.riskLevel,
            mainReasons: analysis.mainReasons,
            invalidationConditions: analysis.invalidationConditions,
            plan: {
                entry: plan.entry || null,
                target: plan.target || null,
                stop: plan.stop || null,
                notes: plan.notes || ''
            },
            analysis,
            createdAt: new Date(),
            result: null,
            points: null
        };
    }

    /**
     * Verifica si el mercado está abierto
     */
    isMarketOpen() {
        const now = new Date();
        const day = now.getUTCDay();
        const hours = now.getUTCHours();

        // Mercado abierto lunes a viernes, 14:30-21:00 UTC
        if (day === 0 || day === 6) return false;
        if (hours < 14) return false;
        if (hours > 21) return false;

        return true;
    }

    /**
     * Calcula minutos hasta cierre
     */
    getTimeUntilClose() {
        if (!this.isMarketOpen()) return null;

        const now = new Date();
        const close = new Date(now);
        close.setUTCHours(21, 0, 0, 0);

        const diffMs = close.getTime() - now.getTime();
        return Math.floor(diffMs / 60000);
    }

    /**
     * Modifica el peso de una regla
     */
    setRuleWeight(ruleId, weight) {
        if (this.rules[ruleId]) {
            this.rules[ruleId].weight = weight;
            return true;
        }
        return false;
    }

    /**
     * Habilita una regla
     */
    enableRule(ruleId) {
        if (this.rules[ruleId]) {
            this.rules[ruleId].enabled = true;
            return true;
        }
        return false;
    }

    /**
     * Deshabilita una regla
     */
    disableRule(ruleId) {
        if (this.rules[ruleId]) {
            this.rules[ruleId].enabled = false;
            return true;
        }
        return false;
    }

    /**
     * Obtiene todas las reglas
     */
    getAllRules() {
        return Object.values(this.rules);
    }

    /**
     * Guarda historial en localStorage
     */
    saveHistory() {
        localStorage.setItem('tito_history', JSON.stringify(this.history));
    }

    /**
     * Carga historial de localStorage
     */
    loadHistory() {
        try {
            const saved = localStorage.getItem('tito_history');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Agrega un reporte al historial
     */
    addToHistory(report) {
        this.history.unshift(report);
        if (this.history.length > 100) {
            this.history = this.history.slice(0, 100);
        }
        this.saveHistory();
        return report;
    }

    /**
     * Limpia el historial
     */
    clearHistory() {
        this.history = [];
        this.saveHistory();
    }

    /**
     * Obtiene el historial
     */
    getHistory() {
        return this.history;
    }

    /**
     * Guarda watchlist en localStorage
     */
    saveWatchlist() {
        localStorage.setItem('tito_watchlist', JSON.stringify(this.watchlist));
    }

    /**
     * Carga watchlist de localStorage
     */
    loadWatchlist() {
        try {
            const saved = localStorage.getItem('tito_watchlist');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    /**
     * Agrega símbolo a la watchlist
     */
    addToWatchlist(symbol) {
        if (!this.watchlist.includes(symbol.toUpperCase())) {
            this.watchlist.push(symbol.toUpperCase());
            this.saveWatchlist();
        }
    }

    /**
     * Remueve símbolo de la watchlist
     */
    removeFromWatchlist(symbol) {
        this.watchlist = this.watchlist.filter(s => s !== symbol.toUpperCase());
        this.saveWatchlist();
    }

    /**
     * Obtiene la watchlist
     */
    getWatchlist() {
        return this.watchlist;
    }

    /**
     * Limpia la watchlist
     */
    clearWatchlist() {
        this.watchlist = [];
        this.saveWatchlist();
    }
}

// Exporta para uso en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TitoMetralletaMotor;
}
