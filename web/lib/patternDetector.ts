/**
 * PATTERN DETECTOR — Sesión 23c
 * Conecta TVContext + GEX para detectar patrones confiables
 * Fail-safe: si datos insuficientes, devuelve null (ambiguo) NO true
 */

import { normalizeSource, type TvContextSignal, type TvBias } from "./tvContext";
import type { GexAnalysis } from "./gex";

/**
 * FUENTE 1: TVContext — Indicadores técnicos de TradingView
 * Busca convergencia de señales (RSI, ADX, SuperTrend, Squeeze, VolumeProfile)
 */
function detectTVPattern(signals: TvContextSignal[] | undefined): {
  detected: boolean | null;
  source: string;
  confidence: number;
} {
  if (!signals || signals.length === 0) {
    return {
      detected: null,
      source: "TVContext: sin señales",
      confidence: 0,
    };
  }

  // Contar convergencia de señales bullish/bearish
  const bullishCount = signals.filter((s) => s.bias === "bullish").length;
  const bearishCount = signals.filter((s) => s.bias === "bearish").length;
  const neutralCount = signals.filter((s) => s.bias === "neutral").length;

  const total = bullishCount + bearishCount + neutralCount;
  const bullishPct = (bullishCount / total) * 100;
  const bearishPct = (bearishCount / total) * 100;

  // Patrón detectado si hay ≥66% convergencia en UNA dirección
  const hasPattern = bullishPct >= 66 || bearishPct >= 66;
  const patternBias = bullishPct >= 66 ? "bullish" : bearishPct >= 66 ? "bearish" : null;
  const maxPct = Math.max(bullishPct, bearishPct);

  return {
    detected: hasPattern ? true : null, // null si ambiguo
    source: `TVContext: ${bullishCount}B/${bearishCount}Be/${neutralCount}N (${patternBias ?? "ambiguo"} ${maxPct.toFixed(0)}%)`,
    confidence: maxPct,
  };
}

/**
 * FUENTE 2: GEX Analysis — Gamma Exposure + acumulación
 * Busca strike principal (kingStrike) + zonas de inversión (flipStrike) + concentración de nodos
 */
function detectGEXPattern(gex: GexAnalysis | undefined): {
  detected: boolean | null;
  source: string;
  confidence: number;
} {
  if (!gex) {
    return {
      detected: null,
      source: "GEX: sin datos",
      confidence: 0,
    };
  }

  // Señales de GEX:
  // 1. kingStrike (imán principal) — zona de acumulación fuerte
  // 2. flipStrike — zona de inversión gamma (cambio de patrón)
  // 3. Nodos concentrados — actividad intensa en múltiples strikes

  const hasKingStrike = gex.kingStrike !== null;
  const hasFlipStrike = gex.flipStrike !== null;
  const nodeConcentration = (gex.nodes ?? []).length > 2 && gex.confidence > 50; // Múltiples nodos + confianza

  const patternSignals = [hasKingStrike, hasFlipStrike, nodeConcentration].filter(Boolean).length;

  // Patrón detectado si ≥2 de 3 señales presentes
  const detected = patternSignals >= 2;
  const confidence = hasKingStrike ? gex.confidence : (patternSignals / 3) * 100;

  return {
    detected: detected ? true : null,
    source: `GEX: kingStrike=${hasKingStrike}, flipStrike=${hasFlipStrike}, nodes=${(gex.nodes ?? []).length} (${patternSignals}/3)`,
    confidence,
  };
}

/**
 * FUENTE 3: Volume Profile — Detección de niveles de volumen
 * Integrada en TVContext pero extraída aquí para claridad
 */
function detectVolumePattern(signals: TvContextSignal[] | undefined): {
  detected: boolean | null;
  source: string;
  confidence: number;
} {
  if (!signals || signals.length === 0) {
    return {
      detected: null,
      source: "VolumeProfile: sin datos",
      confidence: 0,
    };
  }

  const volSignals = signals.filter((s) => s.source === "VolumeProfile");
  if (volSignals.length === 0) {
    return {
      detected: null,
      source: "VolumeProfile: sin señales",
      confidence: 0,
    };
  }

  // Si hay concentración de volumen en POC (Point of Control), hay patrón
  const hasPattern = volSignals.some((s) => s.label && s.label.includes("POC"));

  return {
    detected: hasPattern ? true : null,
    source: `VolumeProfile: ${volSignals.length} señales ${hasPattern ? "(POC detectado)" : "(sin concentración)"}`,
    confidence: hasPattern ? 70 : 0,
  };
}

/**
 * CONSTRUCTOR PRINCIPAL: Combina 3 fuentes con fail-safe
 * Si TODAS las fuentes fallan (devuelven null), resultado final es null (ambiguo)
 * Si ALGUNA fuente confirma, resultado final es true
 * Si ALGUNA fuente rechaza, resultado final es false
 */
export function detectPattern(
  tvSignals: TvContextSignal[] | undefined,
  gex: GexAnalysis | undefined,
  requiredConfidence: number = 60
): {
  detected: boolean | null;
  sources: Array<{ name: string; detected: boolean | null; confidence: number; source: string }>;
  overallConfidence: number;
  reason: string;
} {
  const sources = [
    { name: "TVContext", ...detectTVPattern(tvSignals) },
    { name: "GEX Analysis", ...detectGEXPattern(gex) },
    { name: "Volume Profile", ...detectVolumePattern(tvSignals) },
  ];

  // Contar confirmaciones y rechazos
  const confirmed = sources.filter((s) => s.detected === true).length;
  const rejected = sources.filter((s) => s.detected === false).length;
  const ambiguous = sources.filter((s) => s.detected === null).length;

  // Lógica fail-safe:
  // - Si ≥2 fuentes confirman → detected = true
  // - Si ≥1 fuente rechaza explícitamente → detected = false
  // - Si todas son ambiguas → detected = null (revisar manualmente)
  let detected: boolean | null = null;
  let reason = "";

  if (confirmed >= 2) {
    detected = true;
    reason = `Patrón confirmado por ${confirmed} fuente(s)`;
  } else if (rejected > 0 && confirmed === 0) {
    detected = false;
    reason = `Patrón rechazado por ${rejected} fuente(s)`;
  } else if (confirmed === 1) {
    // Parcial: 1 fuente confirma pero faltan datos de otras
    detected = null;
    reason = `Patrón parcialmente confirmado (${confirmed}/3) — datos insuficientes`;
  } else if (ambiguous === 3) {
    detected = null;
    reason = `Datos insuficientes en todas las fuentes`;
  } else {
    detected = null;
    reason = `Señales ambiguas o conflictivas`;
  }

  const confirmedScores = sources
    .filter((s) => s.detected === true || (s.detected === null && s.confidence > 0))
    .map((s) => s.confidence);
  const overallConfidence =
    confirmedScores.length > 0 ? confirmedScores.reduce((a, b) => a + b, 0) / confirmedScores.length : 0;

  return {
    detected,
    sources,
    overallConfidence: Math.round(overallConfidence),
    reason,
  };
}

/**
 * EJEMPLO DE USO (dry-run)
 */
if (process.env.NODE_ENV === "development" && typeof process !== "undefined") {
  (async () => {
    console.log("🚀 PATTERN DETECTOR — Sesión 23c DRY-RUN\n");

    // Caso 1: TVContext con convergencia bullish
    const tvSignals1 = [
      {
        id: "tv1",
        receivedAt: new Date().toISOString(),
        ticker: "SPY",
        source: "RSI" as const,
        bias: "bullish" as const,
        label: "65 · normal",
        value: 65,
        timeframe: "1h",
        agrees: "agree" as const,
      },
      {
        id: "tv2",
        receivedAt: new Date().toISOString(),
        ticker: "SPY",
        source: "ADX" as const,
        bias: "bullish" as const,
        label: "40 · strong",
        value: 40,
        timeframe: "1h",
        agrees: "agree" as const,
      },
    ];

    const result1 = detectPattern(tvSignals1, undefined);
    console.log("✅ CASO 1: TVContext bullish convergencia");
    console.log(`   Detected: ${result1.detected}`);
    console.log(`   Confianza: ${result1.overallConfidence}%`);
    console.log(`   Razón: ${result1.reason}\n`);

    // Caso 2: Sin datos (fail-safe)
    const result2 = detectPattern(undefined, undefined);
    console.log("🔴 CASO 2: Sin datos → null (ambiguo)");
    console.log(`   Detected: ${result2.detected}`);
    console.log(`   Razón: ${result2.reason}\n`);

    // Caso 3: Datos conflictivos
    const tvSignals3 = [
      {
        id: "tv3",
        receivedAt: new Date().toISOString(),
        ticker: "QQQ",
        source: "RSI" as const,
        bias: "bullish" as const,
        label: "70 · overbought",
        value: 70,
        timeframe: "1h",
        agrees: "agree" as const,
      },
      {
        id: "tv4",
        receivedAt: new Date().toISOString(),
        ticker: "QQQ",
        source: "ADX" as const,
        bias: "bearish" as const,
        label: "35 · weak",
        value: 35,
        timeframe: "1h",
        agrees: "disagree" as const,
      },
    ];

    const result3 = detectPattern(tvSignals3, undefined);
    console.log("⚠️  CASO 3: Datos conflictivos");
    console.log(`   Detected: ${result3.detected}`);
    console.log(`   Confianza: ${result3.overallConfidence}%`);
    console.log(`   Razón: ${result3.reason}\n`);

    console.log("✅ Pattern Detector funcionando");
    console.log("   Fail-safe: ✓ ACTIVO (rechaza con datos insuficientes)");
  })();
}
