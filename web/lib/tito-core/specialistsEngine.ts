/**
 * Bloque de análisis multi-agente — 4 especialistas + evaluador de veto
 *
 * Cada especialista es independiente:
 *   • GEX: Analiza exposición gamma y régimen (positivo si hay concentración favorable)
 *   • TAPE: Analiza flujo y agresividad (positivo si hay confianza en el flujo)
 *   • DELTA: Analiza dirección y momentum (positivo si dirección confirmada)
 *   • DEVIL'S ADVOCATE: Valida riesgos críticos — puede vetarla todo
 *
 * Cada especialista retorna:
 *   - score (0-100)
 *   - verdict ("positivo" | "neutral" | "negativo")
 *   - reasoning (por qué)
 *   - veto (solo Devil's Advocate)
 *
 * La salida conjunta es simple:
 *   - overallScore (promedio ponderado)
 *   - recommendation ("call" | "put" | "no operar")
 *   - vetoed (true si Devil's Advocate bloquea)
 */

export interface SpecialistOpinion {
  name: string;
  score: number; // 0-100
  verdict: "positivo" | "neutral" | "negativo";
  reasoning: string[];
  veto?: boolean; // solo para Devil's Advocate
}

export interface SpecialistsAnalysis {
  gex: SpecialistOpinion;
  tape: SpecialistOpinion;
  delta: SpecialistOpinion;
  devilsAdvocate: SpecialistOpinion;
  overallScore: number; // promedio ponderado
  recommendation: "call" | "put" | "no operar";
  vetoed: boolean;
  reasoning: string; // conclusión final
}

/**
 * GEX Specialist — Análisis de exposición gamma
 * Positivo si: concentración de gamma en dirección esperada, régimen de amplificación
 */
export function analyzeGEX(snapshot: {
  gexConcentration?: number; // 0-100
  gammaRegime?: "amplifying" | "reverting" | "neutral";
  spotVsImpliedMove?: number; // % diferencia spot vs. expected
}): SpecialistOpinion {
  const gexConc = snapshot.gexConcentration ?? 50;
  const regime = snapshot.gammaRegime ?? "neutral";
  const spotDiff = snapshot.spotVsImpliedMove ?? 0;

  let score = 50;
  const reasons: string[] = [];

  // Concentración de gamma
  if (gexConc > 70) {
    score += 20;
    reasons.push(`Concentración gamma alta: ${gexConc}% (favorable)`);
  } else if (gexConc < 30) {
    score -= 15;
    reasons.push(`Concentración gamma baja: ${gexConc}% (diluida)`);
  } else {
    reasons.push(`Concentración gamma media: ${gexConc}%`);
  }

  // Régimen de gamma
  if (regime === "amplifying") {
    score += 15;
    reasons.push("Régimen gamma amplificador (volatilidad se expande)");
  } else if (regime === "reverting") {
    score -= 20;
    reasons.push("Régimen gamma revierte (va a comprimir)");
  } else {
    reasons.push("Régimen gamma neutral");
  }

  // Spot vs. expected move
  if (Math.abs(spotDiff) > 1.5) {
    score -= 10;
    reasons.push(`Spot fuera de cono esperado (${spotDiff.toFixed(2)}%)`);
  } else {
    reasons.push(`Spot dentro del cono esperado`);
  }

  score = Math.max(0, Math.min(100, score));

  return {
    name: "GEX",
    score,
    verdict: score > 60 ? "positivo" : score > 40 ? "neutral" : "negativo",
    reasoning: reasons,
  };
}

/**
 * TAPE Specialist — Análisis de flujo y agresividad
 * Positivo si: flujo concentrado, convicción alta, no hay liquidación
 */
export function analyzeTAPE(snapshot: {
  flowConcentration?: number; // 0-100 (% en top 3 strikes)
  convictionScore?: number; // 0-100
  isLiquidation?: boolean;
  flowDirection?: "call" | "put" | "balanced";
}): SpecialistOpinion {
  const flowConc = snapshot.flowConcentration ?? 50;
  const conviction = snapshot.convictionScore ?? 50;
  const isLiquid = snapshot.isLiquidation ?? false;
  const direction = snapshot.flowDirection ?? "balanced";

  let score = 50;
  const reasons: string[] = [];

  // Concentración de flujo
  if (flowConc > 75) {
    score += 20;
    reasons.push(`Flujo altamente concentrado: ${flowConc}% (convicción)`);
  } else if (flowConc > 55) {
    score += 10;
    reasons.push(`Flujo concentrado: ${flowConc}%`);
  } else if (flowConc < 35) {
    score -= 15;
    reasons.push(`Flujo disperso: ${flowConc}% (sin dirección clara)`);
  }

  // Convicción
  if (conviction > 70) {
    score += 15;
    reasons.push(`Convicción alta: ${conviction}%`);
  } else if (conviction < 40) {
    score -= 15;
    reasons.push(`Convicción baja: ${conviction}%`);
  }

  // Liquidación (red flag)
  if (isLiquid) {
    score -= 40;
    reasons.push("⚠️ Señal de liquidación detectada");
  } else {
    reasons.push("Sin signos de liquidación");
  }

  // Dirección
  if (direction !== "balanced") {
    score += 5;
    reasons.push(`Flujo direccional: ${direction}`);
  } else {
    reasons.push("Flujo balanceado (sin sesgo)");
  }

  score = Math.max(0, Math.min(100, score));

  return {
    name: "TAPE",
    score,
    verdict: score > 60 ? "positivo" : score > 40 ? "neutral" : "negativo",
    reasoning: reasons,
  };
}

/**
 * DELTA Specialist — Análisis de dirección y momentum
 * Positivo si: precio confirmó dirección, delta concentrado, momentum acompañante
 */
export function analyzeDELTA(snapshot: {
  priceDirection?: "up" | "down" | "sideways";
  deltaConcentration?: number; // 0-100
  momentum?: number; // -100 a +100 (negativo = bajista, positivo = alcista)
  volumeProfile?: "bullish" | "bearish" | "balanced";
}): SpecialistOpinion {
  const direction = snapshot.priceDirection ?? "sideways";
  const deltaCon = snapshot.deltaConcentration ?? 50;
  const momentum = snapshot.momentum ?? 0;
  const volProfile = snapshot.volumeProfile ?? "balanced";

  let score = 50;
  const reasons: string[] = [];

  // Dirección de precio
  if (direction !== "sideways") {
    score += 15;
    reasons.push(`Precio confirmó dirección: ${direction}`);
  } else {
    score -= 10;
    reasons.push("Precio lateral (sin confirmación)");
  }

  // Concentración de delta
  if (deltaCon > 70) {
    score += 15;
    reasons.push(`Delta concentrado: ${deltaCon}% (fuerte)`);
  } else if (deltaCon < 40) {
    score -= 10;
    reasons.push(`Delta disperso: ${deltaCon}%`);
  }

  // Momentum
  if (Math.abs(momentum) > 60) {
    score += 15;
    reasons.push(`Momentum confirmado: ${momentum > 0 ? "+" : ""}${momentum}%`);
  } else if (Math.abs(momentum) < 20) {
    score -= 10;
    reasons.push(`Momentum débil: ${momentum}%`);
  }

  // Perfil de volumen
  if (volProfile !== "balanced") {
    score += 10;
    reasons.push(`Volumen sesgo ${volProfile}`);
  }

  score = Math.max(0, Math.min(100, score));

  return {
    name: "DELTA",
    score,
    verdict: score > 60 ? "positivo" : score > 40 ? "neutral" : "negativo",
    reasoning: reasons,
  };
}

/**
 * DEVIL'S ADVOCATE — Evaluador de veto
 * Puede BLOQUEAR la operación si detecta riesgos críticos
 * Retorna veto=true si hay problema terminal
 */
export function analyzeDevilsAdvocate(snapshot: {
  liquidityRatio?: number; // 0-1 (1 = perfecta, 0 = nula)
  spreadBps?: number; // basis points
  skewFlags?: string[]; // señales de peligro
  timeToExpiry?: number; // días
  ivRank?: number; // 0-100
}): SpecialistOpinion {
  const liqRatio = snapshot.liquidityRatio ?? 0.5;
  const spread = snapshot.spreadBps ?? 5;
  const skew = snapshot.skewFlags ?? [];
  const dte = snapshot.timeToExpiry ?? 30;
  const ivRank = snapshot.ivRank ?? 50;

  let score = 50;
  const reasons: string[] = [];
  let veto = false;

  // Liquidez
  if (liqRatio < 0.3) {
    veto = true;
    reasons.push("🛑 VETO: Liquidez crítica < 30%");
  } else if (liqRatio < 0.5) {
    score -= 30;
    reasons.push("⚠️ Liquidez baja: " + Math.round(liqRatio * 100) + "%");
  } else {
    score += 10;
    reasons.push("Liquidez aceptable: " + Math.round(liqRatio * 100) + "%");
  }

  // Spread
  if (spread > 15) {
    score -= 20;
    reasons.push(`⚠️ Spread alto: ${spread}bps`);
  } else if (spread < 5) {
    score += 5;
    reasons.push(`Spread ajustado: ${spread}bps`);
  }

  // Skew flags
  if (skew.includes("disaster")) {
    veto = true;
    reasons.push("🛑 VETO: Skew de desastre detectado");
  } else if (skew.length > 0) {
    score -= 15;
    reasons.push(`⚠️ Señales de peligro: ${skew.join(", ")}`);
  } else {
    reasons.push("Sin señales de peligro extremo");
  }

  // Tiempo a vencimiento
  if (dte < 1) {
    score -= 10;
    reasons.push("⚠️ 0DTE: riesgo de liquidación repentina");
  } else if (dte < 7) {
    score -= 5;
    reasons.push(`Vencimiento cercano: ${dte} días`);
  } else {
    score += 5;
    reasons.push(`Tiempo adecuado: ${dte} días`);
  }

  // IV Rank
  if (ivRank > 85) {
    score -= 15;
    reasons.push(`IV extrema (rank ${ivRank}) — caída probable`);
  } else if (ivRank < 15) {
    score -= 10;
    reasons.push(`IV comprimida (rank ${ivRank}) — expansión probable`);
  } else {
    score += 5;
    reasons.push(`IV estable (rank ${ivRank})`);
  }

  score = Math.max(0, Math.min(100, score));

  return {
    name: "DEVIL'S ADVOCATE",
    score,
    verdict: veto ? "negativo" : score > 60 ? "positivo" : score > 40 ? "neutral" : "negativo",
    reasoning: reasons,
    veto,
  };
}

/**
 * SÍNTESIS: Combina opiniones de 4 especialistas en recomendación final
 */
export function synthesizeSpecialists(
  gex: SpecialistOpinion,
  tape: SpecialistOpinion,
  delta: SpecialistOpinion,
  devilsAdvocate: SpecialistOpinion,
  operationDirection: "call" | "put", // intención del trader
): SpecialistsAnalysis {
  // Si Devil's Advocate veta, fin de la discusión
  if (devilsAdvocate.veto) {
    return {
      gex,
      tape,
      delta,
      devilsAdvocate,
      overallScore: 0,
      recommendation: "no operar",
      vetoed: true,
      reasoning: `VETADO: ${devilsAdvocate.reasoning.join(" | ")}`,
    };
  }

  // Promedio ponderado (equal weight por ahora)
  const overallScore = (gex.score + tape.score + delta.score + devilsAdvocate.score) / 4;

  // Recomendación basada en score y dirección
  let recommendation: "call" | "put" | "no operar";

  if (overallScore > 65) {
    recommendation = operationDirection; // call o put según dirección
  } else if (overallScore > 45) {
    recommendation = "no operar"; // incertidumbre
  } else {
    recommendation = "no operar"; // negativo
  }

  const reasoning =
    `Score overall: ${overallScore.toFixed(0)}/100. ` +
    `GEX: ${gex.verdict} (${gex.score}), ` +
    `TAPE: ${tape.verdict} (${tape.score}), ` +
    `DELTA: ${delta.verdict} (${delta.score}), ` +
    `DEVIL'S ADVOCATE: ${devilsAdvocate.verdict} (${devilsAdvocate.score}).`;

  return {
    gex,
    tape,
    delta,
    devilsAdvocate,
    overallScore,
    recommendation,
    vetoed: false,
    reasoning,
  };
}
