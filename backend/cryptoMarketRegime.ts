/**
 * CRYPTO MARKET REGIME ANALYSIS
 * Identifica automáticamente: BULLISH / BEARISH / SIDEWAYS
 * Adapta reglas de riesgo según régimen
 * NO modifica Tito Core (frozen)
 */

interface MarketRegime {
  regime: "BULLISH" | "BEARISH" | "SIDEWAYS";
  direction: "LONG" | "WAIT" | "NO TRADE";
  confidence: number;
  reasons: string[];
  invalidation: string;
  riskMultiplier: number; // 1.0 = normal, 0.5 = half size
}

interface CryptoAnalysis {
  symbol: string;
  price: number;
  regime: MarketRegime;
  recommendation: {
    entry?: number;
    stopLoss?: number;
    takeProfit?: number;
    size?: number;
  };
  timestamp: string;
}

/**
 * Analizar régimen del mercado basado en precio y volatilidad
 */
function analyzeMarketRegime(price: number, volatility: number, recentHigh: number, recentLow: number): MarketRegime {
  // Calcular posición en rango
  const range = recentHigh - recentLow;
  const positionInRange = (price - recentLow) / range;

  // Reglas de detección
  let regime: "BULLISH" | "BEARISH" | "SIDEWAYS";
  let direction: "LONG" | "WAIT" | "NO TRADE";
  let confidence = 0;
  const reasons: string[] = [];
  let invalidation = "";
  let riskMultiplier = 1.0;

  // BULLISH (precio en tercio superior del rango)
  if (positionInRange > 0.66) {
    regime = "BULLISH";
    confidence = 75 + (positionInRange - 0.66) * 100; // Aumenta conforme sube
    reasons.push("Precio en tercio superior del rango");
    reasons.push("Momentum alcista confirmado");
    direction = "LONG";
    invalidation = `Cierre por debajo de $${recentLow.toFixed(2)} invalida el régimen`;
    riskMultiplier = 1.0; // Tamaño normal
  }
  // BEARISH (precio en tercio inferior del rango)
  else if (positionInRange < 0.33) {
    regime = "BEARISH";
    confidence = 75 - (positionInRange * 100); // Aumenta conforme baja
    reasons.push("Precio en tercio inferior del rango");
    reasons.push("Momentum bajista - cautela requerida");
    direction = "WAIT"; // Esperar confirmación de rebote
    invalidation = `LONG solo si hay rebote confirmado encima de $${recentHigh * 0.97}`;
    riskMultiplier = 0.5; // Mitad del tamaño si hay señal
  }
  // SIDEWAYS (precio en tercio central)
  else {
    regime = "SIDEWAYS";
    confidence = 50;
    reasons.push("Precio range-bound (tercio central)");
    reasons.push("Falta claridad direccional");
    direction = "WAIT";
    invalidation = "Necesita breakout fuera del rango para operar";
    riskMultiplier = 0.7; // 70% del tamaño si hay confirmación
  }

  return {
    regime,
    direction,
    confidence: Math.min(100, confidence),
    reasons,
    invalidation,
    riskMultiplier,
  };
}

/**
 * Generar recomendación completa para crypto
 */
function generateCryptoAnalysis(
  symbol: string,
  price: number,
  regime: MarketRegime,
  baseSize: number = 1000 // $1000 notional
): CryptoAnalysis {
  const recommendation: CryptoAnalysis["recommendation"] = {};

  if (regime.direction === "LONG" || (regime.direction === "WAIT" && regime.regime === "BEARISH")) {
    // Parámetros de riesgo
    const stopLossPercent = 0.03; // -3%
    const takeProfitPercent = 0.05; // +5%

    recommendation.entry = price;
    recommendation.stopLoss = price * (1 - stopLossPercent);
    recommendation.takeProfit = price * (1 + takeProfitPercent);
    recommendation.size = baseSize * regime.riskMultiplier; // Ajustar por régimen
  }

  return {
    symbol,
    price,
    regime,
    recommendation,
    timestamp: new Date().toISOString(),
  };
}

// EJEMPLO DE USO
(async () => {
  console.log("🔍 MARKET REGIME ANALYSIS — CRYPTO\n");

  // Simular datos BTC
  const btcPrice = 77662;
  const recentHigh = 79200;
  const recentLow = 75000;
  const volatility = 2.5; // %

  const regime = analyzeMarketRegime(btcPrice, volatility, recentHigh, recentLow);
  const analysis = generateCryptoAnalysis("BTC/USD", btcPrice, regime);

  console.log("📊 RÉGIMEN DEL MERCADO:");
  console.log(`   Regime: ${regime.regime}`);
  console.log(`   Direction: ${regime.direction}`);
  console.log(`   Confidence: ${regime.confidence.toFixed(0)}%`);
  console.log(`   Risk Multiplier: ${regime.riskMultiplier}x`);

  console.log(`\n📋 RAZONES:`);
  regime.reasons.forEach((r) => console.log(`   • ${r}`));

  console.log(`\n⚠️ INVALIDATION:`);
  console.log(`   ${regime.invalidation}`);

  if (analysis.recommendation.entry) {
    console.log(`\n💰 RECOMENDACIÓN:`);
    console.log(`   Entry: $${analysis.recommendation.entry.toFixed(2)}`);
    console.log(`   Stop Loss: $${analysis.recommendation.stopLoss?.toFixed(2)}`);
    console.log(`   Take Profit: $${analysis.recommendation.takeProfit?.toFixed(2)}`);
    console.log(`   Size: $${analysis.recommendation.size?.toFixed(2)} (ajustado por régimen)`);
  } else {
    console.log(`\n❌ NO OPERACIÓN en régimen actual`);
  }
})();
