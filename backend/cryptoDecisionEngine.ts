/**
 * CRYPTO DECISION ENGINE — SESSION 22
 * Integra Market Regime Analysis con lógica de decisión
 * Aplica reglas adaptativas según régimen
 * NO modifica Tito Core (FROZEN)
 */

import { logRegimeClassification } from "./cryptoRegimeLogger";

interface MarketRegime {
  classification: "BULLISH" | "BEARISH" | "SIDEWAYS";
  direction: "LONG" | "WAIT" | "NO TRADE";
  confidence: number;
  riskMultiplier: number;
}

interface TradingSignal {
  symbol: string;
  price: number;
  regime: MarketRegime;
  decision: "BUY" | "WAIT" | "SELL";
  reasoning: string[];
  parameters?: {
    entry: number;
    stopLoss: number;
    takeProfit: number;
    recommendedSize: number;
  };
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  approved: boolean; // Requiere aprobación manual
}

function analyzeRegime(price: number, high: number, low: number): MarketRegime {
  const range = high - low;
  const position = (price - low) / range;

  if (position > 0.66) {
    return {
      classification: "BULLISH",
      direction: "LONG",
      confidence: Math.min(100, 75 + (position - 0.66) * 100),
      riskMultiplier: 1.0,
    };
  } else if (position < 0.33) {
    return {
      classification: "BEARISH",
      direction: "WAIT",
      confidence: Math.min(100, 75 - position * 100),
      riskMultiplier: 0.5,
    };
  } else {
    return {
      classification: "SIDEWAYS",
      direction: "WAIT",
      confidence: 50,
      riskMultiplier: 0.7,
    };
  }
}

/**
 * Generar decisión de trading adaptativa según régimen
 * IMPORTANTE: Esta función NO ejecuta órdenes
 * Solo genera recomendaciones — requiere aprobación manual
 */
export function generateTradingSignal(
  symbol: string,
  price: number,
  dataSignal: "BUY" | "WAIT", // Señal desde otros módulos (p. ej. Tito Core)
  recentHigh: number,
  recentLow: number,
  baseSize: number = 1000 // USD
): TradingSignal {
  const regime = analyzeRegime(price, recentHigh, recentLow);

  let decision: "BUY" | "WAIT" | "SELL" = "WAIT";
  let reasoning: string[] = [];
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "MEDIUM";
  let parameters: TradingSignal["parameters"] | undefined;
  let approved = false;

  // Reglas adaptativas por régimen
  if (regime.classification === "BULLISH") {
    if (dataSignal === "BUY" && regime.direction === "LONG") {
      decision = "BUY";
      riskLevel = "MEDIUM";
      reasoning = [
        `Régimen BULLISH confirmado (${regime.confidence.toFixed(0)}% confianza)`,
        "Señal de compra alineada con momentum alcista",
        "Precio en tercio superior — tendencia favorable",
        "Multiplicador de riesgo: 1.0x (tamaño completo)",
      ];

      parameters = {
        entry: price,
        stopLoss: price * 0.97,
        takeProfit: price * 1.05,
        recommendedSize: baseSize * regime.riskMultiplier,
      };
    } else {
      reasoning = [`Régimen BULLISH pero no hay señal BUY confirmada`, "Esperar confluencia de señales"];
    }
  } else if (regime.classification === "BEARISH") {
    riskLevel = "HIGH";
    reasoning = [
      `Régimen BEARISH — cautela requerida (${regime.confidence.toFixed(0)}% confianza)`,
      "Precio en tercio inferior — momentum bajista",
      "Multiplicador de riesgo: 0.5x (50% tamaño)",
    ];

    if (dataSignal === "BUY") {
      reasoning.push("Señal BUY pero en régimen bajista — requerida confirmación de rebote");
      // NO operar en régimen bajista sin confirmación explícita
    }
  } else {
    // SIDEWAYS
    riskLevel = "LOW";
    reasoning = [
      `Régimen SIDEWAYS — sin claridad (${regime.confidence.toFixed(0)}% confianza)`,
      "Precio range-bound en rango central",
      "Esperar breakout confirmado antes de operar",
      "Multiplicador de riesgo: 0.7x (70% tamaño)",
    ];
  }

  const signal: TradingSignal = {
    symbol,
    price,
    regime,
    decision,
    reasoning,
    parameters,
    riskLevel,
    approved: false, // SIEMPRE false hasta confirmación manual
  };

  // Logging automático
  logRegimeClassification(
    symbol,
    price,
    regime,
    { recentLow, recentHigh },
    decision,
    parameters,
    `Data signal: ${dataSignal} | Risk level: ${riskLevel}`
  );

  return signal;
}

/**
 * Aplicar aprobación manual a un signal
 * ESTA FUNCIÓN SOLO MARCA APROBACIÓN
 * NO ejecuta la orden — eso requiere otra autorización
 */
export function approveSignal(signal: TradingSignal): TradingSignal {
  return {
    ...signal,
    approved: true,
  };
}

/**
 * Reportar estado actual de decisión sin operar
 */
export function reportSignalStatus(signal: TradingSignal): void {
  console.log("\n📊 TRADING SIGNAL — SESSION 22\n");
  console.log(`🔷 SÍMBOLO: ${signal.symbol}`);
  console.log(`💰 PRECIO: $${signal.price.toFixed(2)}`);

  console.log(`\n📈 RÉGIMEN:`);
  console.log(`   Clasificación: ${signal.regime.classification}`);
  console.log(`   Dirección: ${signal.regime.direction}`);
  console.log(`   Confianza: ${signal.regime.confidence.toFixed(0)}%`);
  console.log(`   Multiplicador: ${signal.regime.riskMultiplier}x`);

  console.log(`\n🎯 DECISIÓN: ${signal.decision}`);
  console.log(`   Nivel de riesgo: ${signal.riskLevel}`);
  console.log(`   Aprobada: ${signal.approved ? "✅ SÍ" : "❌ NO (requiere aprobación manual)"}`);

  console.log(`\n📋 RAZONES:`);
  signal.reasoning.forEach((r) => console.log(`   • ${r}`));

  if (signal.parameters) {
    console.log(`\n💵 PARÁMETROS SUGERIDOS:`);
    console.log(`   Entry: $${signal.parameters.entry.toFixed(2)}`);
    console.log(`   Stop Loss: $${signal.parameters.stopLoss.toFixed(2)}`);
    console.log(`   Take Profit: $${signal.parameters.takeProfit.toFixed(2)}`);
    console.log(`   Tamaño recomendado: $${signal.parameters.recommendedSize.toFixed(0)}`);
  }

  console.log(`\n⚠️  IMPORTANTE:`);
  console.log(`   Esta es una RECOMENDACIÓN basada en análisis de régimen`);
  console.log(`   NO se ejecuta automáticamente`);
  console.log(`   Requiere aprobación manual EXPLÍCITA del usuario`);
}

// EJEMPLO: Generar y reportar signal (sin ejecutar)
(async () => {
  console.log("🚀 CRYPTO DECISION ENGINE — SESSION 22 DRY-RUN\n");

  // Escenario actual: BTC SIDEWAYS
  const signal = generateTradingSignal("BTCUSD", 77648, "WAIT", 79200, 75000, 1000);

  reportSignalStatus(signal);

  console.log("\n✅ Motor de decisión funcionando");
  console.log("   No hay operaciones ejecutadas");
  console.log("   Aguardando aprobación manual para cada operación");
})();
