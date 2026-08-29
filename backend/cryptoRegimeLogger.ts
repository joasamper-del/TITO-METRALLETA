/**
 * CRYPTO REGIME LOGGER
 * Grabar todas las clasificaciones de régimen para análisis posterior
 * Feedback loop: usar datos reales para mejorar thresholds
 */

import * as fs from "fs";
import * as path from "path";

interface RegimeLog {
  timestamp: string;
  date: string;
  hour: string;
  symbol: string;
  price: number;
  regime: {
    classification: "BULLISH" | "BEARISH" | "SIDEWAYS";
    direction: "LONG" | "WAIT" | "NO TRADE";
    confidence: number;
    riskMultiplier: number;
  };
  priceRange: {
    recentLow: number;
    recentHigh: number;
    positionInRange: number;
  };
  decision: "BUY" | "WAIT" | "SELL";
  parameters?: {
    entry: number;
    stopLoss: number;
    takeProfit: number;
    recommendedSize: number;
  };
  note?: string;
}

const logsDir = path.join(__dirname, "phase_d_logs");

function ensureLogsDir() {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

function getLogFilePath(): string {
  const now = new Date();
  const date = now.toISOString().split("T")[0]; // YYYY-MM-DD
  return path.join(logsDir, `crypto_regime_${date}.jsonl`);
}

export function logRegimeClassification(
  symbol: string,
  price: number,
  regime: {
    classification: "BULLISH" | "BEARISH" | "SIDEWAYS";
    direction: "LONG" | "WAIT" | "NO TRADE";
    confidence: number;
    riskMultiplier: number;
  },
  priceRange: { recentLow: number; recentHigh: number },
  decision: "BUY" | "WAIT" | "SELL",
  parameters?: {
    entry: number;
    stopLoss: number;
    takeProfit: number;
    recommendedSize: number;
  },
  note?: string
): void {
  try {
    ensureLogsDir();

    const now = new Date();
    const positionInRange = (price - priceRange.recentLow) / (priceRange.recentHigh - priceRange.recentLow);

    const log: RegimeLog = {
      timestamp: now.toISOString(),
      date: now.toISOString().split("T")[0],
      hour: `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`,
      symbol,
      price,
      regime,
      priceRange: {
        recentLow: priceRange.recentLow,
        recentHigh: priceRange.recentHigh,
        positionInRange: parseFloat(positionInRange.toFixed(4)),
      },
      decision,
      parameters,
      note,
    };

    const filePath = getLogFilePath();
    const logLine = JSON.stringify(log) + "\n";

    fs.appendFileSync(filePath, logLine, { encoding: "utf-8" });

    console.log(`✅ Régimen registrado: ${symbol} ${regime.classification} @ $${price.toFixed(2)} | Confianza: ${regime.confidence.toFixed(0)}%`);
  } catch (error) {
    console.error("❌ Error logging regime:", error);
  }
}

export function readRegimeLogs(symbol: string = "BTCUSD", days: number = 7): RegimeLog[] {
  try {
    ensureLogsDir();

    const logs: RegimeLog[] = [];
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Leer todos los archivos de log
    const files = fs.readdirSync(logsDir).filter((f) => f.startsWith("crypto_regime_"));

    for (const file of files) {
      const filePath = path.join(logsDir, file);
      const content = fs.readFileSync(filePath, "utf-8");

      content.split("\n").forEach((line) => {
        if (line.trim()) {
          try {
            const log = JSON.parse(line) as RegimeLog;
            if (log.symbol === symbol && new Date(log.timestamp) >= startDate) {
              logs.push(log);
            }
          } catch {
            // Ignorar líneas malformadas
          }
        }
      });
    }

    return logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (error) {
    console.error("❌ Error reading regime logs:", error);
    return [];
  }
}

export function analyzeRegimeAccuracy(symbol: string = "BTCUSD", days: number = 7) {
  const logs = readRegimeLogs(symbol, days);

  if (logs.length === 0) {
    console.log("📊 Sin logs de régimen en el período");
    return null;
  }

  // Estadísticas de clasificación
  const bullishCount = logs.filter((l) => l.regime.classification === "BULLISH").length;
  const bearishCount = logs.filter((l) => l.regime.classification === "BEARISH").length;
  const sidewaysCount = logs.filter((l) => l.regime.classification === "SIDEWAYS").length;

  const avgConfidence =
    logs.reduce((sum, l) => sum + l.regime.confidence, 0) / logs.length;

  // Análisis de decisiones
  const buyDecisions = logs.filter((l) => l.decision === "BUY").length;
  const waitDecisions = logs.filter((l) => l.decision === "WAIT").length;
  const sellDecisions = logs.filter((l) => l.decision === "SELL").length;

  return {
    period: `últimos ${days} días`,
    totalClassifications: logs.length,
    regime: {
      bullish: { count: bullishCount, pct: ((bullishCount / logs.length) * 100).toFixed(1) },
      bearish: { count: bearishCount, pct: ((bearishCount / logs.length) * 100).toFixed(1) },
      sideways: { count: sidewaysCount, pct: ((sidewaysCount / logs.length) * 100).toFixed(1) },
    },
    avgConfidence: avgConfidence.toFixed(1),
    decisions: {
      buy: buyDecisions,
      wait: waitDecisions,
      sell: sellDecisions,
    },
    logs: logs.slice(-10), // Últimas 10 clasificaciones
  };
}

// EJEMPLO: Log y análisis
(async () => {
  console.log("📝 CRYPTO REGIME LOGGER — SESIÓN 22\n");

  // Simular logging de clasificación
  logRegimeClassification(
    "BTCUSD",
    77648,
    {
      classification: "SIDEWAYS",
      direction: "WAIT",
      confidence: 50,
      riskMultiplier: 0.7,
    },
    { recentLow: 75000, recentHigh: 79200 },
    "WAIT",
    {
      entry: 77648,
      stopLoss: 75318.56,
      takeProfit: 81530.4,
      recommendedSize: 700,
    },
    "S22 dry-run — mercado range-bound, esperar breakout"
  );

  // Leer análisis
  const analysis = analyzeRegimeAccuracy("BTCUSD", 7);
  if (analysis) {
    console.log("\n📊 ANÁLISIS DE RÉGIMEN (últimos 7 días):");
    console.log(`   Total clasificaciones: ${analysis.totalClassifications}`);
    console.log(`   Régimen BULLISH: ${analysis.regime.bullish.count} (${analysis.regime.bullish.pct}%)`);
    console.log(`   Régimen BEARISH: ${analysis.regime.bearish.count} (${analysis.regime.bearish.pct}%)`);
    console.log(`   Régimen SIDEWAYS: ${analysis.regime.sideways.count} (${analysis.regime.sideways.pct}%)`);
    console.log(`   Confianza promedio: ${analysis.avgConfidence}%`);
    console.log(
      `\n   Decisiones: BUY=${analysis.decisions.buy}, WAIT=${analysis.decisions.wait}, SELL=${analysis.decisions.sell}`
    );
  }

  console.log("\n✅ Logger funcionando — registrando en phase_d_logs/crypto_regime_*.jsonl");
})();
