/**
 * Configuración de reglas por defecto
 * Puedes modificar esta configuración para ajustar el comportamiento del sistema
 */
export declare const DEFAULT_RULES_CONFIG: {
    trend_bullish: {
        weight: number;
        enabled: boolean;
    };
    zone_premium: {
        weight: number;
        enabled: boolean;
    };
    volume_high: {
        weight: number;
        enabled: boolean;
        threshold: number;
    };
    gex_positive: {
        weight: number;
        enabled: boolean;
    };
    rsi_not_overbought: {
        weight: number;
        enabled: boolean;
        maxRSI: number;
    };
    market_context_bullish: {
        weight: number;
        enabled: boolean;
    };
    vix_low: {
        weight: number;
        enabled: boolean;
        maxVIX: number;
    };
    liquidity_sufficient: {
        weight: number;
        enabled: boolean;
        minLiquidity: number;
    };
    time_to_close_late: {
        weight: number;
        enabled: boolean;
        minMinutesToClose: number;
    };
    price_at_level: {
        weight: number;
        enabled: boolean;
    };
};
/**
 * Umbrales de decisión
 * Ajusta estos valores para cambiar cuándo se considera una oportunidad "operable"
 */
export declare const DECISION_THRESHOLDS: {
    operate: number;
    wait: number;
    doNotOperate: number;
};
/**
 * Configuración de riesgo
 * Define qué puntuación corresponde a cada nivel de riesgo
 */
export declare const RISK_LEVELS: {
    low: number;
    medium: number;
    high: number;
};
/**
 * Configuración de datos
 * Personaliza qué datos se consideran "confiables"
 */
export declare const DATA_REQUIREMENTS: {
    requirePrice: boolean;
    requireVolume: boolean;
    requireRSI: boolean;
    requireGEX: boolean;
    requireTrend: boolean;
    requireLiquidity: boolean;
};
/**
 * Configuración de horario
 * Define los horarios de operación
 */
export declare const TRADING_HOURS: {
    openHourUTC: number;
    openMinuteUTC: number;
    closeHourUTC: number;
    closeMinuteUTC: number;
    tradingDays: number[];
};
/**
 * Ejemplo de cómo personalizar:
 *
 * // Aumentar importancia de tendencia
 * DEFAULT_RULES_CONFIG.trend_bullish.weight = 35;
 *
 * // Deshabilitar regla de VIX
 * DEFAULT_RULES_CONFIG.vix_low.enabled = false;
 *
 * // Cambiar umbral de operación
 * DECISION_THRESHOLDS.operate = 80;
 *
 * // Cambiar umbral de volumen
 * DEFAULT_RULES_CONFIG.volume_high.threshold = 2000000;
 */
