// Evaluador de eventos bloqueantes (earnings + noticias críticas)
// Puro, sin I/O. La decisión de bloqueo descansa ÚNICAMENTE en datos reales.
// Si falta dato → null (NO fallback, NO mock) → REVISAR MANUALMENTE

export interface BlockingEventEvaluation {
  value: boolean | null; // true: bloquear, false: permitir, null: revisar manualmente
  reason: string | null; // "earnings_within_7_days" | "critical_news_..." | "data_unavailable" | null
  source: string; // Dónde vinieron los datos (o "unknown" si no disponibles)
  ts: string; // ISO timestamp
}

interface EarningsData {
  flag: "dentro_confirmado" | "dentro" | "fuera" | "no_aplica" | null;
  daysUntilEarnings: number | null;
}

interface NewsData {
  hasCriticalNews: boolean;
  criticalReasons: string[]; // ej: ["bankruptcy_mention", "sec_investigation"]
}

/**
 * Evalúa si existe evento bloqueante basado en earnings + noticias.
 * Especificación estricta: solo datos reales, NO fallback.
 */
export function evaluateBlockingEvents(
  earnings: EarningsData | null,
  news: NewsData | null
): BlockingEventEvaluation {
  const now = new Date().toISOString();
  const sources: string[] = [];

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CRITERIO 1: Earnings próximos (< 7 días bloquea)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (earnings) {
    sources.push("Massive /financials");

    // Flag "dentro" o "dentro_confirmado" → earnings cae dentro del vencimiento
    if (earnings.flag === "dentro" || earnings.flag === "dentro_confirmado") {
      // Criterio: bloquear si < 7 días (o null si no tenemos exactitud)
      if (
        earnings.daysUntilEarnings !== null &&
        earnings.daysUntilEarnings >= 0 &&
        earnings.daysUntilEarnings < 7
      ) {
        return {
          value: true,
          reason: `earnings_within_${Math.ceil(earnings.daysUntilEarnings)}_days`,
          source: sources.join(" + "),
          ts: now,
        };
      }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // CRITERIO 2: Noticias críticas
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (news) {
    sources.push("Massive /news");

    if (news.hasCriticalNews && news.criticalReasons.length > 0) {
      return {
        value: true,
        reason: `critical_news_${news.criticalReasons[0]}`,
        source: sources.join(" + "),
        ts: now,
      };
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SIN CRITERIOS DE BLOQUEO: verificar si hay datos suficientes
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const hasEarningsData = earnings !== null;
  const hasNewsData = news !== null;

  // Si ambos son null → no tenemos datos → REVISAR MANUALMENTE
  if (!hasEarningsData && !hasNewsData) {
    return {
      value: null,
      reason: "data_unavailable",
      source: "unknown",
      ts: now,
    };
  }

  // Si tenemos datos pero no se activan criterios de bloqueo → permitir
  if (sources.length > 0) {
    return {
      value: false,
      reason: null,
      source: sources.join(" + "),
      ts: now,
    };
  }

  // Fallback (nunca debería ocurrir)
  return {
    value: null,
    reason: "evaluation_error",
    source: "unknown",
    ts: now,
  };
}
