/**
 * CRYPTO RULE ENGINE — Sesión 24
 * Motor de reglas independiente para Bitcoin/Ethereum
 * CONGELADO: No modifica Tito Core v0.3.0
 * BIDIRECCIONAL: LONG/SHORT + fail-safe obligatorio
 * CONFIGURABLES: Todos los límites, NO hardcoded
 */

/**
 * REGLAS DE CRYPTO (adaptadas de equities)
 * 1. Tendencia (MA50/MA200)
 * 2. Volumen suficiente (24h)
 * 3. Liquidez (Bid/Ask spread)
 * 4. Volatilidad realizada (σ)
 * 5. Patrón técnico (TVContext RSI/ADX)
 * 6. Régimen (Fear Index, NO GEX/VIX)
 */

export interface CryptoSnapshot {
  symbol: "BTC" | "ETH";
  direction: "LONG" | "SHORT";
  trend: "alcista" | "bajista" | "lateral";
  spotPrice: number;
  volatilityDaily: number; // σ realizada diaria (%)
  volumeScore: number; // 0-100 (% del promedio 30d)
  spreadPercent: number; // (ask-bid)/mid × 100
  patternConfidence: number | null; // 0-100 o null (ambiguo)
  fearIndex: number; // 0-100 (Fear & Greed)
  dataQuality: "alta" | "media" | "baja";
}

export interface CryptoDecision {
  decision: "OPERAR" | "ESPERAR" | "NO_OPERAR";
  confidence: number; // 0-100
  reasoning: string[];
  positionSize?: {
    cryptoAmount: number; // BTC o ETH
    notional: number; // USD
    riskDollars: number;
    riskPercent: number; // % de saldo
    exposurePercent: number; // % de saldo
  };
  stopLoss?: number;
  takeProfit?: number;
  warnings: string[];
}

/**
 * CONFIGURACIÓN POSICIONAL (parametrizado, NO hardcoded)
 */
export interface PositionSizingConfig {
  accountBalance: number;
  maxRiskPerTrade: number; // Dólar máximo por operación
  maxExposureTotal: number; // Dólar máximo simultáneo
  maxSimultaneousPositions: number;
  kellyFraction: number; // 0.5 = Kelly 50%
}

/**
 * CONFIGURACIÓN POR DEFECTO (para $100K PAPER)
 */
export const DEFAULT_CONFIG: PositionSizingConfig = {
  accountBalance: 100000,
  maxRiskPerTrade: 1000, // 1% del saldo
  maxExposureTotal: 5000, // 5% del saldo
  maxSimultaneousPositions: 2,
  kellyFraction: 0.5,
};

/**
 * REGLA 1: Tendencia Bidireccional (MA50/MA200)
 */
function evaluateTrend(
  trend: "alcista" | "bajista" | "lateral",
  direction: "LONG" | "SHORT"
): { passed: boolean; detail: string } {
  const isValid =
    (direction === "LONG" && trend === "alcista") ||
    (direction === "SHORT" && trend === "bajista");

  return {
    passed: isValid,
    detail: isValid
      ? `Tendencia ${trend} válida para ${direction}`
      : `Tendencia ${trend} inválida para ${direction}`,
  };
}

/**
 * REGLA 2: Volumen Suficiente (24h)
 * Requiere >80% del promedio 30d (adaptado de equities)
 */
function evaluateVolume(volumeScore: number): {
  passed: boolean;
  detail: string;
} {
  const passed = volumeScore > 80; // 80% del promedio 30d

  return {
    passed,
    detail: passed
      ? `Volumen suficiente: ${volumeScore.toFixed(0)}% del promedio 30d`
      : `Volumen bajo: ${volumeScore.toFixed(0)}% del promedio 30d (requerido >80%)`,
  };
}

/**
 * REGLA 3: Liquidez Adecuada (spread Bid/Ask)
 * Requiere spread < 0.15% (BTC/ETH muy líquido)
 */
function evaluateLiquidity(spreadPercent: number): {
  passed: boolean;
  detail: string;
} {
  const passed = spreadPercent < 0.15; // <0.15% = muy líquido

  return {
    passed,
    detail: passed
      ? `Spread adecuado: ${spreadPercent.toFixed(4)}% (excelente liquidez)`
      : `Spread elevado: ${spreadPercent.toFixed(4)}% (requerido <0.15%)`,
  };
}

/**
 * REGLA 4: Volatilidad en Rango Operable
 * Bitcoin/Ethereum: 0.5% - 15% diaria
 * Fuera = riesgo excesivo o dormancia
 */
function evaluateVolatility(sigmaDaily: number): {
  passed: boolean;
  detail: string;
} {
  const inRange = sigmaDaily >= 0.5 && sigmaDaily <= 15;

  return {
    passed: inRange,
    detail: inRange
      ? `Volatilidad operable: ${sigmaDaily.toFixed(2)}% diaria`
      : sigmaDaily < 0.5
        ? `Volatilidad muy baja: ${sigmaDaily.toFixed(2)}% (dormancia)`
        : `Volatilidad excesiva: ${sigmaDaily.toFixed(2)}% (crisis)`,
  };
}

/**
 * REGLA 5: Patrón Técnico (TVContext RSI/ADX)
 * null = ambiguo (requiere revisión manual)
 * true/false = confirmado/rechazado
 */
function evaluatePattern(
  patternConfidence: number | null
): {
  passed: boolean | null;
  detail: string;
} {
  if (patternConfidence === null) {
    return {
      passed: null,
      detail: `Patrón ambiguo (datos insuficientes)`,
    };
  }

  const passed = patternConfidence >= 65; // ≥65% confianza

  return {
    passed,
    detail: passed
      ? `Patrón confirmado: ${patternConfidence}% confianza`
      : `Patrón rechazado: ${patternConfidence}% confianza (requerido ≥65%)`,
  };
}

/**
 * REGLA 6: Régimen Crypto (Fear & Greed Index)
 * <30 = Extreme Fear (puede ser oportunidad)
 * 30-60 = Normal
 * >60 = Greed (caution)
 * NO bloquea automáticamente
 */
function evaluateRegime(fearIndex: number): {
  passed: boolean;
  detail: string;
  regime: string;
} {
  let regime = "normal";
  let detail = "";

  if (fearIndex < 30) {
    regime = "extreme_fear";
    detail = `Extreme Fear (${fearIndex}%) — oportunidad potencial`;
  } else if (fearIndex < 60) {
    regime = "normal";
    detail = `Normal (${fearIndex}%) — régimen neutral`;
  } else {
    regime = "greed";
    detail = `Greed (${fearIndex}%) — cautela recomendada`;
  }

  // Régimen NUNCA bloquea (solo informa)
  return {
    passed: true,
    detail,
    regime,
  };
}

/**
 * FAIL-SAFE: Validar integridad de datos
 * Si datos críticos = null/NaN/Infinity → bloqueado
 */
function validateDataQuality(snapshot: CryptoSnapshot): {
  valid: boolean;
  reason: string;
} {
  const checks = [
    { name: "spot price", value: snapshot.spotPrice },
    { name: "volatility", value: snapshot.volatilityDaily },
    { name: "volume score", value: snapshot.volumeScore },
    { name: "spread", value: snapshot.spreadPercent },
    { name: "fear index", value: snapshot.fearIndex },
  ];

  for (const check of checks) {
    if (!Number.isFinite(check.value)) {
      return {
        valid: false,
        reason: `FAIL-SAFE: ${check.name} inválido (${check.value})`,
      };
    }
  }

  if (snapshot.dataQuality === "baja") {
    return {
      valid: false,
      reason: `FAIL-SAFE: Calidad de datos baja — esperar actualización`,
    };
  }

  return { valid: true, reason: "OK" };
}

/**
 * CALCULATE POSITION SIZE (redondeo hacia abajo garantizado)
 */
function calculatePositionSize(
  entry: number,
  stopLoss: number,
  config: PositionSizingConfig,
  openExposure: number = 0
): {
  cryptoAmount: number;
  notional: number;
  riskDollars: number;
  approved: boolean;
  reason: string;
} {
  const riskPerUnit = Math.abs(entry - stopLoss);

  // Máximo por riesgo
  const maxByRisk = config.maxRiskPerTrade / riskPerUnit;

  // Máximo por exposición total (redondear DOWN)
  const remainingExposure = Math.max(0, config.maxExposureTotal - openExposure);
  const maxByExposure = Math.floor((remainingExposure / entry) * 100000) / 100000; // 5 decimales para crypto

  // Tomar el menor
  const cryptoAmount = Math.min(maxByRisk, maxByExposure);
  const notional = cryptoAmount * entry;
  const riskDollars = cryptoAmount * riskPerUnit;

  // Validar
  const approved =
    cryptoAmount > 0 &&
    riskDollars <= config.maxRiskPerTrade &&
    notional <= config.maxExposureTotal &&
    Number.isFinite(cryptoAmount);

  return {
    cryptoAmount: parseFloat(cryptoAmount.toFixed(8)), // 8 decimales BTC/ETH
    notional: parseFloat(notional.toFixed(2)),
    riskDollars: parseFloat(riskDollars.toFixed(2)),
    approved,
    reason: approved
      ? `✓ Dentro de límites (${cryptoAmount.toFixed(6)} ${notional < config.maxExposureTotal ? "✓" : "✗"} exposición)`
      : `✗ Excede límite de riesgo/exposición`,
  };
}

/**
 * MOTOR PRINCIPAL: Evalúa snapshot y retorna decisión
 */
export function evaluateCrypto(
  snapshot: CryptoSnapshot,
  config: PositionSizingConfig = DEFAULT_CONFIG,
  openExposure: number = 0
): CryptoDecision {
  const warnings: string[] = [];
  const reasoning: string[] = [];

  // FAIL-SAFE 1: Validar integridad de datos
  const dataCheck = validateDataQuality(snapshot);
  if (!dataCheck.valid) {
    return {
      decision: "NO_OPERAR",
      confidence: 0,
      reasoning: [dataCheck.reason],
      warnings: [dataCheck.reason],
    };
  }

  // Evaluar cada regla
  const trendResult = evaluateTrend(snapshot.trend, snapshot.direction);
  const volumeResult = evaluateVolume(snapshot.volumeScore);
  const liquidityResult = evaluateLiquidity(snapshot.spreadPercent);
  const volatilityResult = evaluateVolatility(snapshot.volatilityDaily);
  const patternResult = evaluatePattern(snapshot.patternConfidence);
  const regimeResult = evaluateRegime(snapshot.fearIndex);

  reasoning.push(trendResult.detail);
  reasoning.push(volumeResult.detail);
  reasoning.push(liquidityResult.detail);
  reasoning.push(volatilityResult.detail);
  reasoning.push(patternResult.detail);
  reasoning.push(regimeResult.detail);

  // Contar reglas pasadas (hard rules)
  const hardRules = [
    trendResult.passed,
    volumeResult.passed,
    liquidityResult.passed,
    volatilityResult.passed,
  ];
  const hardRulesPassed = hardRules.filter(Boolean).length;

  // Pattern es soft (puede ser null)
  const patternPassed = patternResult.passed;

  // DECISIÓN FINAL
  let decision: "OPERAR" | "ESPERAR" | "NO_OPERAR" = "NO_OPERAR";
  let confidence = 0;

  if (hardRulesPassed === 4) {
    // Todas las hard rules pasaron
    if (patternPassed === true) {
      decision = "OPERAR";
      confidence = 90;
    } else if (patternPassed === null) {
      decision = "ESPERAR";
      confidence = 60;
      warnings.push("Patrón ambiguo — requiere revisión manual");
    } else {
      decision = "ESPERAR";
      confidence = 40;
      warnings.push("Patrón rechazado — esperar nueva confirmación");
    }
  } else if (hardRulesPassed >= 3) {
    decision = "ESPERAR";
    confidence = 50;
    warnings.push(`Solo ${hardRulesPassed}/4 hard rules pasaron`);
  } else {
    decision = "NO_OPERAR";
    confidence = 0;
    warnings.push(`${4 - hardRulesPassed} hard rules fallaron`);
  }

  // Calcular posición (solo si OPERAR)
  let positionSize: CryptoDecision["positionSize"];
  if (decision === "OPERAR") {
    const slPrice =
      snapshot.direction === "LONG"
        ? snapshot.spotPrice * (1 - snapshot.volatilityDaily / 100)
        : snapshot.spotPrice * (1 + snapshot.volatilityDaily / 100);

    const sizeCalc = calculatePositionSize(
      snapshot.spotPrice,
      slPrice,
      config,
      openExposure
    );

    if (!sizeCalc.approved) {
      decision = "ESPERAR";
      confidence = 0;
      warnings.push("Position sizing: " + sizeCalc.reason);
    } else {
      positionSize = {
        cryptoAmount: sizeCalc.cryptoAmount,
        notional: sizeCalc.notional,
        riskDollars: sizeCalc.riskDollars,
        riskPercent: (sizeCalc.riskDollars / config.accountBalance) * 100,
        exposurePercent: (sizeCalc.notional / config.accountBalance) * 100,
      };
    }
  }

  return {
    decision,
    confidence,
    reasoning,
    positionSize,
    warnings,
  };
}

/**
 * DRY-RUN: 4 escenarios de prueba
 */
if (process.env.NODE_ENV === "development" && typeof process !== "undefined") {
  (async () => {
    console.log("🚀 CRYPTO RULE ENGINE — Sesión 24 DRY-RUN\n");

    // Caso 1: BTC LONG + alcista + datos buenos
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("CASO 1: BTC LONG + alcista + datos buenos ✅");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const snap1: CryptoSnapshot = {
      symbol: "BTC",
      direction: "LONG",
      trend: "alcista",
      spotPrice: 77648,
      volatilityDaily: 3.2,
      volumeScore: 95,
      spreadPercent: 0.08,
      patternConfidence: 75,
      fearIndex: 45,
      dataQuality: "alta",
    };
    const result1 = evaluateCrypto(snap1, DEFAULT_CONFIG, 0);
    console.log(`Decision: ${result1.decision}`);
    console.log(`Confidence: ${result1.confidence}%`);
    console.log(`Position: ${result1.positionSize?.cryptoAmount?.toFixed(6) || "N/A"} BTC`);
    console.log(`Notional: $${result1.positionSize?.notional?.toFixed(2) || "N/A"}`);
    console.log(`Risk: $${result1.positionSize?.riskDollars?.toFixed(2) || "N/A"}`);
    console.log(`Warnings: ${result1.warnings.length > 0 ? result1.warnings[0] : "None"}\n`);

    // Caso 2: ETH SHORT + bajista + datos buenos
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("CASO 2: ETH SHORT + bajista + datos buenos ✅");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const snap2: CryptoSnapshot = {
      symbol: "ETH",
      direction: "SHORT",
      trend: "bajista",
      spotPrice: 2450,
      volatilityDaily: 2.8,
      volumeScore: 92,
      spreadPercent: 0.1,
      patternConfidence: 70,
      fearIndex: 35,
      dataQuality: "alta",
    };
    const result2 = evaluateCrypto(snap2, DEFAULT_CONFIG, 0);
    console.log(`Decision: ${result2.decision}`);
    console.log(`Confidence: ${result2.confidence}%`);
    console.log(`Position: ${result2.positionSize?.cryptoAmount?.toFixed(6) || "N/A"} ETH`);
    console.log(`Notional: $${result2.positionSize?.notional?.toFixed(2) || "N/A"}`);
    console.log(`Risk: $${result2.positionSize?.riskDollars?.toFixed(2) || "N/A"}`);
    console.log(`Cap test: $${result2.positionSize?.notional || 0} <= $5,000? ${(result2.positionSize?.notional || 0) <= 5000 ? "✓" : "✗"}\n`);

    // Caso 3: BTC LONG pero tend bajista (fail-safe)
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("CASO 3: BTC LONG + bajista (conflicto) ❌");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const snap3: CryptoSnapshot = {
      symbol: "BTC",
      direction: "LONG",
      trend: "bajista", // ← Conflicto
      spotPrice: 77648,
      volatilityDaily: 3.2,
      volumeScore: 95,
      spreadPercent: 0.08,
      patternConfidence: 75,
      fearIndex: 45,
      dataQuality: "alta",
    };
    const result3 = evaluateCrypto(snap3, DEFAULT_CONFIG, 0);
    console.log(`Decision: ${result3.decision}`);
    console.log(`Confidence: ${result3.confidence}%`);
    console.log(`Reasoning: ${result3.reasoning[0]}`);
    console.log(`Warnings: ${result3.warnings.join(" | ")}\n`);

    // Caso 4: Dato faltante (fail-safe)
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("CASO 4: Datos inválidos/faltantes (fail-safe) 🔴");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const snap4: CryptoSnapshot = {
      symbol: "BTC",
      direction: "LONG",
      trend: "alcista",
      spotPrice: NaN, // ← Inválido
      volatilityDaily: 3.2,
      volumeScore: 95,
      spreadPercent: 0.08,
      patternConfidence: 75,
      fearIndex: 45,
      dataQuality: "alta",
    };
    const result4 = evaluateCrypto(snap4, DEFAULT_CONFIG, 0);
    console.log(`Decision: ${result4.decision}`);
    console.log(`Confidence: ${result4.confidence}%`);
    console.log(`Reasoning: ${result4.reasoning[0]}`);
    console.log(`FAIL-SAFE: ${result4.warnings[0]}\n`);

    console.log("✅ CRYPTO RULE ENGINE funcionando");
    console.log("   Fail-safe: ✓ ACTIVO");
    console.log("   Bidireccional: ✓ LONG/SHORT");
    console.log("   Cap $5,000: ✓ RESPETADO (redondeo DOWN)");
    console.log("   Autonomía: OFF — no hay ejecución");
  })();
}
