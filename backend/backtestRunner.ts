import * as fs from "fs";
import { buildDecision } from "../Agente Tito Metralleta/web/lib/tito-core/decisionEngine";
import { evaluateRules } from "../Agente Tito Metralleta/web/lib/tito-core/ruleEngine";
import type { MarketSnapshot } from "../Agente Tito Metralleta/web/lib/tito-core/marketSnapshot";
import type { DecisionDetails, DataQuality } from "../Agente Tito Metralleta/web/lib/tito-core/types";

const args = process.argv.slice(2);
const spyPath = args[0] || "historical_SPY.json";
const qqqPath = args[1] || "historical_QQQ.json";
const vixPath = args[2] || "historical_VIX.json";

console.log("📂 Cargando datos históricos...\n");

let spyBars: any[] = [], qqqBars: any[] = [], vixBars: any[] = [];

try {
  if (!fs.existsSync(spyPath)) throw new Error(`SPY no encontrado: ${spyPath}`);
  if (!fs.existsSync(qqqPath)) throw new Error(`QQQ no encontrado: ${qqqPath}`);
  if (!fs.existsSync(vixPath)) throw new Error(`VIX no encontrado: ${vixPath}`);

  spyBars = JSON.parse(fs.readFileSync(spyPath, "utf-8")).bars;
  qqqBars = JSON.parse(fs.readFileSync(qqqPath, "utf-8")).bars;
  vixBars = JSON.parse(fs.readFileSync(vixPath, "utf-8")).bars;

  console.log(`✅ SPY: ${spyBars.length} velas`);
  console.log(`✅ QQQ: ${qqqBars.length} velas`);
  console.log(`✅ VIX: ${vixBars.length} velas (PROXY)\n`);

  // === BLOQUEADOR #3: Adapter MarketSnapshot desde datos históricos ===
  function createMarketSnapshot(bar: any, symbol: string, iv: number): MarketSnapshot {
    return {
      symbol,
      trend: bar.close > bar.open ? "alcista" : bar.close < bar.open ? "bajista" : "lateral",
      volumeSufficient: bar.volume > 1000000,
      liquidityAdequate: true, // SPY/QQQ siempre líquidos
      regimeValidated: iv > 15 && iv < 60,
      patternDetected: bar.close > (bar.open + bar.high) / 2 ? true : bar.close < (bar.open + bar.low) / 2 ? false : null,
      candleConfirmed: true, // Dato histórico = vela cerrada
      volatilityInRange: iv > 10 && iv < 80,
      blockingEvent: false, // No hay eventos en datos históricos
      historicalProbability: null,
      dataQuality: bar.volume > 0 && bar.close > 0 ? "alta" : "baja",
    };
  }

  // === BLOQUEADOR #2: Integrar evaluateRules() + buildDecision() REAL ===
  const minLen = Math.min(spyBars.length, qqqBars.length, vixBars.length);
  let decisions = 0;
  let allDecisions: (DecisionDetails & { symbol: string; timestamp: string; index: number })[] = [];

  console.log(`🚀 Procesando ${minLen * 2} decisiones (Tito Core v0.2.0)...\n`);

  for (let i = 0; i < minLen; i++) {
    const spy = spyBars[i];
    const qqq = qqqBars[i];
    const vix = vixBars[i];

    const ivValue = vix.value ?? 20; // VIX proxy

    // SPY Decision
    const spySnapshot = createMarketSnapshot(spy, "SPY", ivValue);
    const spyRules = evaluateRules(spySnapshot);
    const spyDecision = buildDecision(
      spyRules,
      spy.volume > 0 ? ("alta" as DataQuality) : ("media" as DataQuality),
      { spot: spy.close, iv: ivValue / 100 }
    );
    allDecisions.push({
      ...spyDecision,
      symbol: "SPY",
      timestamp: spy.timestamp || new Date().toISOString(),
      index: i,
    });
    decisions++;

    // QQQ Decision
    const qqqSnapshot = createMarketSnapshot(qqq, "QQQ", ivValue);
    const qqqRules = evaluateRules(qqqSnapshot);
    const qqqDecision = buildDecision(
      qqqRules,
      qqq.volume > 0 ? ("alta" as DataQuality) : ("media" as DataQuality),
      { spot: qqq.close, iv: ivValue / 100 }
    );
    allDecisions.push({
      ...qqqDecision,
      symbol: "QQQ",
      timestamp: qqq.timestamp || new Date().toISOString(),
      index: i,
    });
    decisions++;

    if ((i + 1) % 1000 === 0) {
      console.log(`   ${decisions}/${minLen * 2}...`);
    }
  }

  const outputPath = "phase_b_decisions.json";
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      { decisions: allDecisions, metadata: { totalDecisions: decisions, timestamp: new Date().toISOString() } },
      null,
      2
    )
  );

  console.log(`\n✅ Backtesting completado: ${decisions} decisiones`);
  console.log(`📁 Guardado en: ${outputPath}\n`);
  console.log("=".repeat(70));
  console.log("📊 FASE B — Tito Core v0.2.0 INTEGRADO\n");
  console.log("✅ Bloqueador #1: Path Resolution (tsconfig.json)");
  console.log("✅ Bloqueador #2: Rule Engine (evaluateRules REAL)");
  console.log("✅ Bloqueador #3: Snapshot Format (MarketSnapshot REAL)");
  console.log("✅ buildDecision() REAL — arquitectura congelada\n");
  console.log("📋 Próximas tareas (7 entreables):");
  console.log("1. Performance Report");
  console.log("2. Operations Log");
  console.log("3. Top 10 Lessons Learned");
  console.log("4. Module Health Scorecard");
  console.log("5. Improvement Backlog");
  console.log("6. Version Changelog (v0.3.0)");
  console.log("7. Tito's Operating Manual\n");
  console.log("⚠️ VIX = proxy (rolling volatility SPY), NO oficial CBOE");
  console.log("=".repeat(70) + "\n");

} catch (err: any) {
  console.error("❌ Error:", err.message);
  if (err.code === "ENOENT") {
    console.error("\nℹ️  Datos históricos no encontrados. Proporciona rutas:");
    console.error("   npx ts-node backtestRunner.ts <SPY.json> <QQQ.json> <VIX.json>\n");
  }
  process.exit(1);
}
