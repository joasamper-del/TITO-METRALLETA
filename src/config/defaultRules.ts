/**
 * Configuración de reglas por defecto
 * Puedes modificar esta configuración para ajustar el comportamiento del sistema
 */

export const DEFAULT_RULES_CONFIG = {
  // Tendencia
  trend_bullish: {
    weight: 25,
    enabled: true,
  },

  // Zona Premium/Discount
  zone_premium: {
    weight: 25,
    enabled: true,
  },

  // Volumen
  volume_high: {
    weight: 20,
    enabled: true,
    threshold: 1000000, // volumen mínimo
  },

  // GEX (Gamma Exposure)
  gex_positive: {
    weight: 20,
    enabled: true,
  },

  // RSI (Relative Strength Index)
  rsi_not_overbought: {
    weight: 10,
    enabled: true,
    maxRSI: 70,
  },

  // Contexto de mercado (SPY)
  market_context_bullish: {
    weight: 15,
    enabled: true,
  },

  // VIX (Volatilidad General)
  vix_low: {
    weight: 10,
    enabled: true,
    maxVIX: 20,
  },

  // Liquidez
  liquidity_sufficient: {
    weight: 10,
    enabled: true,
    minLiquidity: 100000,
  },

  // Tiempo al cierre
  time_to_close_late: {
    weight: 5,
    enabled: true,
    minMinutesToClose: 30,
  },

  // Precio en niveles importantes
  price_at_level: {
    weight: 15,
    enabled: true,
  },
};

/**
 * Umbrales de decisión
 * Ajusta estos valores para cambiar cuándo se considera una oportunidad "operable"
 */
export const DECISION_THRESHOLDS = {
  operate: 85, // ✅ OPERAR si puntuación >= 85
  wait: 65, // ⏳ ESPERAR si puntuación >= 65
  doNotOperate: 0, // ❌ NO OPERAR si puntuación < 65
};

/**
 * Configuración de riesgo
 * Define qué puntuación corresponde a cada nivel de riesgo
 */
export const RISK_LEVELS = {
  low: 85, // 🟢 Riesgo bajo si >= 85
  medium: 50, // 🟡 Riesgo medio si >= 50
  high: 0, // 🔴 Riesgo alto si < 50
};

/**
 * Configuración de datos
 * Personaliza qué datos se consideran "confiables"
 */
export const DATA_REQUIREMENTS = {
  requirePrice: true,
  requireVolume: true,
  requireRSI: false, // opcional
  requireGEX: false, // opcional
  requireTrend: true,
  requireLiquidity: true,
};

/**
 * Configuración de horario
 * Define los horarios de operación
 */
export const TRADING_HOURS = {
  // ET (Eastern Time) = UTC - 4 horas en verano, UTC - 5 en invierno
  openHourUTC: 14, // 9:30 AM ET
  openMinuteUTC: 30,
  closeHourUTC: 21, // 4:00 PM ET
  closeMinuteUTC: 0,
  tradingDays: [1, 2, 3, 4, 5], // Lunes a Viernes (0 = domingo, 6 = sábado)
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
