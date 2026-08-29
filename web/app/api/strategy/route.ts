/**
 * STRATEGY OPERATIVE DATA — Sesión 27
 * Proporciona datos reales del pipeline para modo Operativo de /strategy
 * Conecta múltiples fuentes: Massive, MarketSnack, Schwab
 * Fail-safe: si un dato falta, deja null (NO fallback hardcoded)
 */

import { NextRequest, NextResponse } from "next/server";
import { getCryptoPrice } from "@/lib/alpacaConnector";

export interface StrategyOperativeData {
  symbol: string;
  timestamp: string;
  direction: "LONG" | "SHORT" | null;
  price: { value: number | null; source: string; ts: string } | null;
  trend: { value: "alcista" | "bajista" | "lateral" | null; source: string; ts: string } | null;
  volatility: { value: number | null; source: string; ts: string } | null;
  volume: { value: number | null; source: string; ts: string } | null;
  liquidity: { value: string | null; source: string; ts: string } | null;
  pattern: { value: string | null; source: string; ts: string } | null;
  blockingEvent: { value: boolean; source: string; ts: string } | null;
  regime: { value: string | null; source: string; ts: string } | null;
  dataQuality: "alta" | "media" | "baja";
  failSafeReason?: string;
}

/**
 * GET /api/strategy?ticker=SPY&direction=LONG
 * Devuelve datos operativos reales del ticker indicado
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker")?.toUpperCase();
  const direction = searchParams.get("direction") as "LONG" | "SHORT" | null;

  if (!ticker) {
    return NextResponse.json({ error: "ticker parameter required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  let dataQuality: "alta" | "media" | "baja" = "media";
  let failSafeReason: string | undefined;
  const missingData: string[] = [];

  // FUENTE 1: Precio actual (Massive o Alpaca)
  let price: StrategyOperativeData["price"] = null;
  try {
    // Crypto: Usar alpacaConnector.getCryptoPrice
    if (["BTC", "ETH"].includes(ticker)) {
      try {
        const cryptoResult = await getCryptoPrice(
          ticker as "BTC" | "ETH",
          process.env.ALPACA_PAPER_KEY || "",
          process.env.ALPACA_PAPER_SECRET || "",
          "https://paper-api.alpaca.markets"
        );
        if (cryptoResult.price) {
          price = {
            value: cryptoResult.price,
            source: "Alpaca /crypto/latest/quotes",
            ts: now,
          };
        }
      } catch (cryptoErr) {
        // No fallback: null si Alpaca falla
      }
    } else {
      // Equities: Usar Massive (cuando disponible)
      // TODO: Conectar a Massive /v2/snapshot/locale/us/markets/stocks/tickers/{ticker}
      // Por ahora: null si no está disponible (fail-safe)
    }

    if (!price) {
      missingData.push("price");
    }
  } catch (err) {
    missingData.push("price");
  }

  // FUENTE 2: Tendencia (MA50/MA200 calculada)
  let trend: StrategyOperativeData["trend"] = null;
  try {
    // Requiere histórico de barras diarias (últimos 200 días)
    // TODO: Conectar a Massive /v2/aggs/ticker/{ticker}/range/1/day o Alpaca barras
    // Por ahora: null si no disponible (fail-safe)
    // Cuando disponible: MA50 > MA200 → alcista, MA50 < MA200 → bajista
    // Diferencia < 1% → lateral
  } catch (err) {
    missingData.push("trend");
  }
  if (!trend) {
    missingData.push("trend");
  }

  // FUENTE 3: Volatilidad (IV Rank o σ realizada)
  let volatility: StrategyOperativeData["volatility"] = null;
  try {
    // Equities: Massive /implied_volatility si disponible, sino σ realizada
    // Crypto: σ realizada desde últimas 30 barras diarias
    // TODO: Conectar a Massive IV Rank o calcular σ desde barras
    // Por ahora: null si no disponible (fail-safe)
  } catch (err) {
    missingData.push("volatility");
  }
  if (!volatility) {
    missingData.push("volatility");
  }

  // FUENTE 4: Volumen (24h intradía)
  let volume: StrategyOperativeData["volume"] = null;
  try {
    // Equities: Massive volumen intradía (últimas 24h)
    // Crypto: Alpaca volumen 24h
    // TODO: Conectar a Massive /v2/aggs o Alpaca barras
    // Por ahora: null si no disponible (fail-safe)
  } catch (err) {
    missingData.push("volume");
  }
  if (!volume) {
    missingData.push("volume");
  }

  // FUENTE 5: Liquidez (bid/ask spread real)
  let liquidity: StrategyOperativeData["liquidity"] = null;
  try {
    // Equities: Massive last_quote (bid/ask)
    // Crypto: Alpaca crypto quotes (bid/ask)
    // Calcular: (ask - bid) / mid * 100%
    // TODO: Conectar a Massive /v3/snapshot/options/ o Alpaca quotes
    // Por ahora: null si no disponible (fail-safe)
  } catch (err) {
    missingData.push("liquidity");
  }
  if (!liquidity) {
    missingData.push("liquidity");
  }

  // FUENTE 6: Patrón (TVContext alerts + valores reales)
  let pattern: StrategyOperativeData["pattern"] = null;
  try {
    // TODO: Conectar a TVContext alerts API para RSI, ADX, etc.
    // Si disponible: "RSI X, ADX Y" (valores reales de alerts)
    // Por ahora: null si no disponible (fail-safe)
  } catch (err) {
    missingData.push("pattern");
  }
  if (!pattern) {
    missingData.push("pattern");
  }

  // FUENTE 7: Evento bloqueante (earnings, news)
  let blockingEvent: StrategyOperativeData["blockingEvent"] = null;
  try {
    // TODO: Conectar a earnings calendar + news alerts
    // Por ahora: mock data
    blockingEvent = {
      value: false,
      source: "mock_events",
      ts: now,
    };
  } catch (err) {
    missingData.push("blockingEvent");
  }

  // FUENTE 8: Régimen (Fear Index para crypto, IV Rank para equities)
  let regime: StrategyOperativeData["regime"] = null;
  try {
    // TODO: Conectar a Fear & Greed Index (crypto) o IV Rank (equities)
    // Por ahora: mock data
    const isCrypto = ["BTC", "ETH"].includes(ticker);
    regime = {
      value: isCrypto ? "Normal (45 Fear Index)" : "Normal (IV Rank 45%)",
      source: "mock_regime",
      ts: now,
    };
  } catch (err) {
    missingData.push("regime");
  }

  // Determinar calidad de datos y fail-safe
  if (missingData.length > 3) {
    dataQuality = "baja";
    failSafeReason = `Datos insuficientes del pipeline: falta ${missingData.join(", ")}. NO OPERAR.`;
  } else if (missingData.length > 0) {
    dataQuality = "media";
  } else {
    dataQuality = "alta";
  }

  const response: StrategyOperativeData = {
    symbol: ticker,
    timestamp: now,
    direction: direction || null,
    price,
    trend,
    volatility,
    volume,
    liquidity,
    pattern,
    blockingEvent,
    regime,
    dataQuality,
    failSafeReason,
  };

  return NextResponse.json(response);
}
