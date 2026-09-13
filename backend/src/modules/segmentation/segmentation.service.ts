/**
 * Segmentation Service — Tarea 5 (Segmentación de Información)
 *
 * Calcula dos métricas compuestas de opciones:
 * 1. Open Premium Estimate = OI × option_quote × shares_per_contract
 * 2. Notional Value = OI × 100 × strike
 *
 * PURO: Sin side effects, input-output deterministicas, NO DB/HTTP
 * FAIL-CLOSED: Cualquier dato faltante → NULL
 */

/**
 * Input strike bruto (directo del mercado)
 */
export interface RawStrike {
  strike: number; // $/acción
  oi: number; // Open Interest (cantidad contratos)
  optionQuote?: number; // $/acción (bid), OPCIONAL
  sharesPerContract?: number; // típicamente 100, OPCIONAL
  side: 'call' | 'put';
  expirationDate?: string; // ISO string
}

/**
 * Strike enriquecido con métricas calculadas + flags de completitud
 */
export interface EnrichedStrike extends RawStrike {
  openPremiumEstimate: number | null; // $, resultado puro
  notionalValue: number | null; // $, resultado puro
  isPremiumStale?: boolean; // mark si quote falta
  isDataIncomplete?: boolean; // mark si shares falta o datos incompletos
}

/**
 * Agregación por vencimiento (CALL vs PUT)
 */
export interface AggregateResult {
  expirationDate: string;
  callsOpenPremium: number | null;
  putsOpenPremium: number | null;
  callsNotional: number | null;
  putsNotional: number | null;
  totalOpenPremium: number | null;
  totalNotional: number | null;
  avgOpenPremiumPerStrike: {
    calls: number | null;
    puts: number | null;
  };
  avgNotionalPerStrike: {
    calls: number | null;
    puts: number | null;
  };
  strikeCount: {
    calls: number;
    puts: number;
  };
  dataCompleteness: 'full' | 'partial' | 'incomplete'; // fail-closed marker
}

/**
 * Entrada para validación de liquidez (Tarea 6)
 * Esta interfaz es contrato de consumo para futura Tarea 6
 */
export interface LiquidityInput {
  ticker: string;
  expirationDate: string;
  segmentationData: AggregateResult; // Output de Tarea 5
  historicalAverage5d?: number; // Promedio 5 días previos
}

/**
 * Resultado de validación liquidez (MOCK — no implementación Tarea 6)
 */
export interface LiquidityGate {
  pass: boolean;
  reason: string; // Explicación de pass/fail
}

/**
 * Calcula Open Premium Estimate = OI × option_quote × shares_per_contract
 *
 * @param oi Open Interest (cantidad contratos)
 * @param optionQuote $/acción (bid de Massive)
 * @param sharesPerContract Acciones por contrato (100 típicamente)
 * @returns Estimación de prima en DÓLARES, o NULL si falta dato
 *
 * CRÍTICO:
 * - option_quote es $/ACCIÓN, NO $/contrato
 * - Resultado en DÓLARES
 * - Si algún parámetro falta/es inválido → NULL (fail-closed)
 */
export function calculateOpenPremiumEstimate(
  oi: number | undefined,
  optionQuote: number | undefined,
  sharesPerContract: number | undefined,
): number | null {
  // Validación fail-closed
  if (oi === undefined || oi === null || oi < 0) return null;
  if (optionQuote === undefined || optionQuote === null || optionQuote < 0) return null;
  if (sharesPerContract === undefined || sharesPerContract === null || sharesPerContract <= 0) {
    return null;
  }

  // Fórmula exacta (de spec)
  const result = oi * optionQuote * sharesPerContract;

  // Guard overflow
  if (!Number.isFinite(result)) return null;

  return result; // $ exactos, sin redondeo
}

/**
 * Calcula Notional Value = OI × 100 × strike
 *
 * @param oi Open Interest (cantidad contratos)
 * @param strike $/acción de ejercicio
 * @returns Valor nocional en DÓLARES, o NULL si falta dato
 *
 * CRÍTICO:
 * - Factor 100 es invariante (opciones USA estándar)
 * - Representa valor acciones subyacentes si expira ITM
 * - Si algún parámetro falta/es inválido → NULL (fail-closed)
 */
export function calculateNotionalValue(
  oi: number | undefined,
  strike: number | undefined,
): number | null {
  // Validación fail-closed
  if (oi === undefined || oi === null || oi < 0) return null;
  if (strike === undefined || strike === null || strike <= 0) return null;

  // Fórmula exacta (de spec)
  const result = oi * 100 * strike;

  // Guard overflow
  if (!Number.isFinite(result)) return null;

  return result; // $ exactos
}

/**
 * Enriquece un strike con ambas métricas + flags de completitud
 *
 * @param raw Strike bruto del mercado
 * @returns EnrichedStrike con métricas calculadas
 */
export function enrichStrikeData(raw: RawStrike): EnrichedStrike {
  return {
    ...raw,
    openPremiumEstimate: calculateOpenPremiumEstimate(
      raw.oi,
      raw.optionQuote,
      raw.sharesPerContract,
    ),
    notionalValue: calculateNotionalValue(raw.oi, raw.strike),
    isPremiumStale: !raw.optionQuote, // mark si bid falta
    isDataIncomplete: !raw.optionQuote || !raw.sharesPerContract, // fail-closed
  };
}

/**
 * Agrega strikes enriquecidos por vencimiento
 * Calcula sumas, promedios y completitud de datos
 *
 * @param enrichedStrikes Array de strikes ya enriquecidos
 * @param expirationDate Fecha vencimiento (agrupador)
 * @returns AggregateResult con totales/promedios/flags
 */
export function aggregateByExpiration(
  enrichedStrikes: EnrichedStrike[],
  expirationDate: string,
): AggregateResult {
  const callStrikes = enrichedStrikes.filter((s) => s.side === 'call');
  const putStrikes = enrichedStrikes.filter((s) => s.side === 'put');

  // Open Premium Sums (filtra NULL)
  const callsOP =
    callStrikes
      .filter((s) => s.openPremiumEstimate !== null)
      .reduce((sum, s) => sum + (s.openPremiumEstimate ?? 0), 0) || null;

  const putsOP =
    putStrikes
      .filter((s) => s.openPremiumEstimate !== null)
      .reduce((sum, s) => sum + (s.openPremiumEstimate ?? 0), 0) || null;

  const totalOP = (callsOP ?? 0) + (putsOP ?? 0) > 0 ? (callsOP ?? 0) + (putsOP ?? 0) : null;

  // Notional Value Sums (filtra NULL)
  const callsNV =
    callStrikes
      .filter((s) => s.notionalValue !== null)
      .reduce((sum, s) => sum + (s.notionalValue ?? 0), 0) || null;

  const putsNV =
    putStrikes
      .filter((s) => s.notionalValue !== null)
      .reduce((sum, s) => sum + (s.notionalValue ?? 0), 0) || null;

  const totalNV = (callsNV ?? 0) + (putsNV ?? 0) > 0 ? (callsNV ?? 0) + (putsNV ?? 0) : null;

  // Promedios por lado
  const callsOPCount = callStrikes.filter((s) => s.openPremiumEstimate !== null).length;
  const putsOPCount = putStrikes.filter((s) => s.openPremiumEstimate !== null).length;

  const avgCallsOP = callsOPCount > 0 ? (callsOP ?? 0) / callsOPCount : null;
  const avgPutsOP = putsOPCount > 0 ? (putsOP ?? 0) / putsOPCount : null;

  const callsNVCount = callStrikes.filter((s) => s.notionalValue !== null).length;
  const putsNVCount = putStrikes.filter((s) => s.notionalValue !== null).length;

  const avgCallsNV = callsNVCount > 0 ? (callsNV ?? 0) / callsNVCount : null;
  const avgPutsNV = putsNVCount > 0 ? (putsNV ?? 0) / putsNVCount : null;

  // Completitud
  const totalStrikes = enrichedStrikes.length;
  const completeStrikes = enrichedStrikes.filter((s) => !s.isDataIncomplete).length;
  const completeness: 'full' | 'partial' | 'incomplete' =
    completeStrikes === totalStrikes ? 'full' : completeStrikes > 0 ? 'partial' : 'incomplete';

  return {
    expirationDate,
    callsOpenPremium: callsOP,
    putsOpenPremium: putsOP,
    callsNotional: callsNV,
    putsNotional: putsNV,
    totalOpenPremium: totalOP,
    totalNotional: totalNV,
    avgOpenPremiumPerStrike: {
      calls: avgCallsOP,
      puts: avgPutsOP,
    },
    avgNotionalPerStrike: {
      calls: avgCallsNV,
      puts: avgPutsNV,
    },
    strikeCount: {
      calls: callStrikes.length,
      puts: putStrikes.length,
    },
    dataCompleteness: completeness,
  };
}

/**
 * MOCK: evaluateLiquidity (Tarea 6)
 * Esta es una INTERFAZ solamente para validar contrato con Tarea 6.
 * NO implementa lógica de evaluación (eso es Tarea 6).
 * Usada solo para tests de integración.
 *
 * RESTRICCIÓN: Tarea 6 está en 0% implementación
 */
export function evaluateLiquidity(input: LiquidityInput): LiquidityGate {
  // MOCK STUB — No lógica productiva
  if (input.segmentationData.dataCompleteness === 'incomplete') {
    return {
      pass: false,
      reason: '[MOCK] Datos incompletos',
    };
  }

  return {
    pass: true,
    reason: '[MOCK] Liquidez OK (stub solo para validar interfaz)',
  };
}
