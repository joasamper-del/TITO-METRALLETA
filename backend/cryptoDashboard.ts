/**
 * CRYPTO DASHBOARD ORCHESTRATOR
 * Integra Market Regime Analysis + posición actual
 * Orquesta análisis completo antes de operaciones
 */

import * as fs from "fs";
import * as path from "path";

interface CryptoDashboard {
  symbol: string;
  currentPrice: number;
  position: {
    qty: number;
    entryPrice: number;
    positionValue: number;
    pnl: number;
    pnlPercent: number;
  };
  regime: {
    classification: "BULLISH" | "BEARISH" | "SIDEWAYS";
    direction: "LONG" | "WAIT" | "NO TRADE";
    confidence: number;
    reasons: string[];
    invalidation: string;
    riskMultiplier: number;
  };
  analysis: {
    signal: "BUY" | "WAIT" | "SELL";
    entry?: number;
    stopLoss?: number;
    takeProfit?: number;
    recommendedSize?: number;
  };
  timestamp: string;
}

const envFilePath = path.join(__dirname, ".env.local");
const envContent = fs.readFileSync(envFilePath, "utf8");
const envVars: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  if (line && !line.startsWith("#")) {
    const [key, ...valueParts] = line.split("=");
    envVars[key.trim()] = valueParts.join("=").trim();
  }
});

const API_KEY = envVars.ALPACA_API_KEY;
const SECRET_KEY = envVars.ALPACA_SECRET_KEY;

function getAuthHeader(): string {
  const credentials = `${API_KEY}:${SECRET_KEY}`;
  return "Basic " + Buffer.from(credentials).toString("base64");
}

async function getCurrentPosition(symbol: string) {
  try {
    const res = await fetch(
      `https://paper-api.alpaca.markets/v2/positions/${symbol}`,
      { headers: { Authorization: getAuthHeader() } }
    );

    if (!res.ok) return null;

    const pos = (await res.json()) as any;
    return {
      qty: parseFloat(pos.qty),
      entryPrice: parseFloat(pos.avg_fill_price) || 0,
      positionValue: parseFloat(pos.market_value),
      pnl: parseFloat(pos.unrealized_pl),
      pnlPercent: parseFloat(pos.unrealized_plpc) * 100,
    };
  } catch (error) {
    return null;
  }
}

function analyzeRegime(price: number, high: number, low: number) {
  const range = high - low;
  const position = (price - low) / range;

  if (position > 0.66) {
    return {
      classification: "BULLISH" as const,
      direction: "LONG" as const,
      confidence: 75 + (position - 0.66) * 100,
      reasons: [
        "Precio en tercio superior",
        "Momentum alcista",
        "Potencial continuar tendencia",
      ],
      invalidation: `Cierre < $${low.toFixed(2)} invalida bullish`,
      riskMultiplier: 1.0,
    };
  } else if (position < 0.33) {
    return {
      classification: "BEARISH" as const,
      direction: "WAIT" as const,
      confidence: 75 - position * 100,
      reasons: [
        "Precio en tercio inferior",
        "Momentum bajista - precaución",
        "Esperar confirmación de rebote",
      ],
      invalidation: "LONG solo con rebote confirmado",
      riskMultiplier: 0.5,
    };
  } else {
    return {
      classification: "SIDEWAYS" as const,
      direction: "WAIT" as const,
      confidence: 50,
      reasons: [
        "Range-bound - sin claridad",
        "Falta dirección definida",
        "Esperar breakout",
      ],
      invalidation: "Necesita salir del rango para operar",
      riskMultiplier: 0.7,
    };
  }
}

async function generateDashboard(symbol: string, currentPrice: number): Promise<CryptoDashboard> {
  const position = await getCurrentPosition(symbol);

  // Parámetros de régimen (simulado - en S22 se traen de datos reales)
  const recentHigh = 79200;
  const recentLow = 75000;
  const regime = analyzeRegime(currentPrice, recentHigh, recentLow);

  // Generar análisis
  const analysis = {
    signal: regime.direction === "LONG" ? ("BUY" as const) : ("WAIT" as const),
    entry: currentPrice,
    stopLoss: currentPrice * 0.97,
    takeProfit: currentPrice * 1.05,
    recommendedSize: 1000 * regime.riskMultiplier,
  };

  const dashboard: CryptoDashboard = {
    symbol,
    currentPrice,
    position: position || { qty: 0, entryPrice: 0, positionValue: 0, pnl: 0, pnlPercent: 0 },
    regime,
    analysis,
    timestamp: new Date().toISOString(),
  };

  return dashboard;
}

// EJEMPLO: Generar dashboard completo
(async () => {
  console.log("📊 CRYPTO DASHBOARD — SESIÓN 22 DRY-RUN\n");

  const btcPrice = 77648;
  const dashboard = await generateDashboard("BTCUSD", btcPrice);

  console.log("🔷 POSICIÓN ACTUAL:");
  console.log(`   Cantidad: ${dashboard.position.qty} BTC`);
  console.log(`   Entrada: $${dashboard.position.entryPrice || "N/A"}`);
  console.log(`   Valor: $${dashboard.position.positionValue.toFixed(2)}`);
  console.log(`   P&L: $${dashboard.position.pnl.toFixed(2)} (${dashboard.position.pnlPercent.toFixed(2)}%)`);

  console.log(`\n📈 RÉGIMEN DE MERCADO:`);
  console.log(`   Clasificación: ${dashboard.regime.classification}`);
  console.log(`   Dirección: ${dashboard.regime.direction}`);
  console.log(`   Confianza: ${dashboard.regime.confidence.toFixed(0)}%`);
  console.log(`   Multiplicador de riesgo: ${dashboard.regime.riskMultiplier}x`);

  console.log(`\n📋 RAZONES:`);
  dashboard.regime.reasons.forEach((r) => console.log(`   • ${r}`));

  console.log(`\n⚠️ INVALIDACIÓN:`);
  console.log(`   ${dashboard.regime.invalidation}`);

  console.log(`\n💰 ANÁLISIS Y RECOMENDACIÓN:`);
  console.log(`   Señal: ${dashboard.analysis.signal}`);
  if (dashboard.analysis.entry) {
    console.log(`   Entry: $${dashboard.analysis.entry.toFixed(2)}`);
    console.log(`   Stop Loss: $${dashboard.analysis.stopLoss?.toFixed(2)}`);
    console.log(`   Take Profit: $${dashboard.analysis.takeProfit?.toFixed(2)}`);
    console.log(`   Tamaño recomendado: $${dashboard.analysis.recommendedSize?.toFixed(2)}`);
  }

  console.log(`\n✅ Dashboard generado exitosamente`);
  console.log(`   Timestamp: ${dashboard.timestamp}`);
  console.log(`   Listo para mostrar en UI`);
})();
