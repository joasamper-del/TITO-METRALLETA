import { NextRequest, NextResponse } from "next/server";
import fetch from "node-fetch";

interface MarketRegime {
  classification: "BULLISH" | "BEARISH" | "SIDEWAYS";
  direction: "LONG" | "WAIT" | "NO TRADE";
  confidence: number;
  reasons: string[];
  invalidation: string;
  riskMultiplier: number;
}

interface RegimeAnalysisResponse {
  symbol: string;
  currentPrice: number;
  regime: MarketRegime;
  analysis: {
    signal: "BUY" | "WAIT" | "SELL";
    entry?: number;
    stopLoss?: number;
    takeProfit?: number;
    recommendedSize?: number;
  };
  timestamp: string;
}

function analyzeRegime(price: number, high: number, low: number): MarketRegime {
  const range = high - low;
  const position = (price - low) / range;

  if (position > 0.66) {
    return {
      classification: "BULLISH",
      direction: "LONG",
      confidence: 75 + (position - 0.66) * 100,
      reasons: [
        "Precio en tercio superior del rango",
        "Momentum alcista confirmado",
        "Potencial de continuar tendencia",
      ],
      invalidation: `Cierre < $${low.toFixed(2)} invalida el régimen bullish`,
      riskMultiplier: 1.0,
    };
  } else if (position < 0.33) {
    return {
      classification: "BEARISH",
      direction: "WAIT",
      confidence: 75 - position * 100,
      reasons: [
        "Precio en tercio inferior del rango",
        "Momentum bajista — cautela requerida",
        "Esperar confirmación de rebote",
      ],
      invalidation: "LONG solo si hay rebote confirmado",
      riskMultiplier: 0.5,
    };
  } else {
    return {
      classification: "SIDEWAYS",
      direction: "WAIT",
      confidence: 50,
      reasons: [
        "Precio range-bound en rango central",
        "Falta claridad direccional",
        "Esperar confirmación de breakout",
      ],
      invalidation: "Necesita salir del rango para operar",
      riskMultiplier: 0.7,
    };
  }
}

async function getCurrentBTCPrice(): Promise<number> {
  // DRY-RUN: usar precio fijo. En operación real, traer de CoinGecko o Alpaca
  const dryRunPrice = 77648;

  try {
    // Intentar CoinGecko
    const response = await (fetch as any)(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
    );
    if (response.ok) {
      const data = (await response.json()) as any;
      return data.bitcoin.usd;
    }
  } catch {
    // Fallback a precio fijo
  }

  return dryRunPrice;
}

export async function GET(request: NextRequest): Promise<NextResponse<RegimeAnalysisResponse>> {
  try {
    // Obtener precio actual de BTC
    const currentPrice = await getCurrentBTCPrice();

    // Parámetros de rango (últimas 7 días proxy)
    // En implementación real, estos vienen de datos históricos reales
    const recentHigh = 79200;
    const recentLow = 75000;

    // Analizar régimen
    const regime = analyzeRegime(currentPrice, recentHigh, recentLow);

    // Generar análisis
    const analysis = {
      signal: regime.direction === "LONG" ? ("BUY" as const) : ("WAIT" as const),
      entry: currentPrice,
      stopLoss: currentPrice * 0.97,
      takeProfit: currentPrice * 1.05,
      recommendedSize: 1000 * regime.riskMultiplier,
    };

    const response: RegimeAnalysisResponse = {
      symbol: "BTCUSD",
      currentPrice,
      regime,
      analysis,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error analyzing regime:", error);
    return NextResponse.json(
      { error: "Failed to analyze market regime" },
      { status: 500 }
    ) as any;
  }
}
