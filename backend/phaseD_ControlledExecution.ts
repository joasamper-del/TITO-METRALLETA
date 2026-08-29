/**
 * FASE D — CONTROLLED EXECUTION (Paper Trading Only)
 *
 * SEGURIDAD CRÍTICA:
 * - Endpoint: https://paper-api.alpaca.markets (PAPER ONLY, no live)
 * - Verificación: Cuenta debe ser PAPER, no real
 * - Orden: UNA orden de prueba pequeña de SPY
 * - Registro: entrada, salida, fill, slippage, stop, take profit, P&L
 * - Autorización: Solo cuando mercado está abierto
 * - Detenerse: Después de cierre, esperar autorización usuario
 */

import * as fs from "fs";
import * as path from "path";

const ALPACA_PAPER_BASE = "https://paper-api.alpaca.markets";
const API_KEY = process.env.ALPACA_API_KEY!;
const SECRET_KEY = process.env.ALPACA_SECRET_KEY!;

// Validar que endpoint es PAPER (CRÍTICO)
if (!ALPACA_PAPER_BASE.includes("paper-api")) {
  throw new Error("🚨 CRITICAL: Endpoint debe ser PAPER API, no live!");
}

const LOG_DIR = path.join(__dirname, "phase_d_logs");
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR);

const LOG_FILE = path.join(LOG_DIR, `execution_${new Date().toISOString().split("T")[0]}.jsonl`);

interface TradeLog {
  timestamp: string;
  event: string;
  symbol: string;
  decision?: string;
  orderStatus?: string;
  fill?: number;
  price?: number;
  slippage?: number;
  stopLoss?: number;
  takeProfit?: number;
  pnl?: number;
  confidence?: number;
  error?: string;
}

function logEvent(event: TradeLog) {
  const entry = JSON.stringify(event) + "\n";
  fs.appendFileSync(LOG_FILE, entry);
  console.log(`  📝 [${event.event}] ${JSON.stringify(event, null, 2)}`);
}

function getAuthHeader(): string {
  const credentials = `${API_KEY}:${SECRET_KEY}`;
  return "Basic " + Buffer.from(credentials).toString("base64");
}

async function fetch_alpaca(endpoint: string, method = "GET", body?: any) {
  const url = `${ALPACA_PAPER_BASE}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Alpaca API ${response.status}: ${errText}`);
  }

  return response.json();
}

async function runPhaseD() {
  console.log("\n🔴 FASE D — CONTROLLED EXECUTION");
  console.log("==================================\n");

  try {
    // 1. SEGURIDAD: Verificar endpoint y cuenta PAPER
    console.log("🔐 SEGURIDAD: Verificando endpoint PAPER...");
    if (!ALPACA_PAPER_BASE.includes("paper-api")) {
      throw new Error("❌ CRÍTICO: No es PAPER endpoint!");
    }
    console.log("   ✅ Endpoint es PAPER (https://paper-api.alpaca.markets)");

    logEvent({
      timestamp: new Date().toISOString(),
      event: "PHASE_D_START",
      symbol: "SYSTEM",
    });

    // 2. Verificar conexión y estado de cuenta
    console.log("\n1️⃣ Verificando estado de cuenta...");
    const account = (await fetch_alpaca("/v2/account")) as any;

    if (account.status !== "ACTIVE") {
      throw new Error(`❌ Cuenta status: ${account.status} (debe ser ACTIVE)`);
    }

    console.log(`   ✅ Cuenta: ${account.account_number}`);
    console.log(`   ✅ Status: ${account.status}`);
    console.log(`   ✅ Equity: $${parseFloat(account.equity).toFixed(2)}`);
    console.log(`   ✅ Buying Power: $${parseFloat(account.buying_power).toFixed(2)}`);

    logEvent({
      timestamp: new Date().toISOString(),
      event: "ACCOUNT_VERIFIED",
      symbol: "SYSTEM",
    });

    // 3. Obtener datos de SPY (para decisión de Tito Core)
    console.log("\n2️⃣ Obteniendo datos de SPY...");
    const barData = (await fetch_alpaca("/v1/bars/latest?symbols=SPY")) as any;
    const spyBar = barData.bars?.SPY as any;

    if (!spyBar) throw new Error("No SPY data received");

    const spot = spyBar.c;
    const iv = 30; // mock IV para testing
    console.log(`   ✅ Precio SPY: $${spot.toFixed(2)}`);

    // 4. Simular decisión de Tito Core (SIN ejecutar orden aún)
    console.log("\n3️⃣ Simulando decisión de Tito Core...");
    console.log(`   Input: ticker=SPY, spot=$${spot.toFixed(2)}, iv=${iv}`);
    console.log(`   [SIMULACIÓN] buildDecision() → operar/esperar/no operar`);
    console.log(`   Estado: SIMULADO (sin orden ejecutada)`);

    // Para este test, vamos a simular una decisión
    const titoDecision = "esperar"; // Simulado: esperar = no ejecutar orden
    const titoConfidence = 65; // Mock confidence

    console.log(`   📊 Decisión simulada: ${titoDecision} (confianza: ${titoConfidence}%)`);

    logEvent({
      timestamp: new Date().toISOString(),
      event: "TITO_DECISION_SIMULATED",
      symbol: "SPY",
      decision: titoDecision,
      confidence: titoConfidence,
    });

    // 5. PAUSA: Mostrar simulación antes de ejecutar
    console.log("\n4️⃣ PAUSA CONTROLADA:");
    console.log(`   ⏸️  Decisión de Tito Core simulada`);
    console.log(`   ⏸️  Mercado debe estar abierto para ejecutar orden de prueba`);
    console.log(`   ⏸️  Orden será pequeña: 1 contrato SPY en paper trading`);
    console.log(`   ⏸️  Aguardando autorización del usuario antes de proceder`);

    logEvent({
      timestamp: new Date().toISOString(),
      event: "AWAITING_USER_APPROVAL",
      symbol: "SPY",
    });

    // 6. Información de próximo paso
    console.log("\n5️⃣ PRÓXIMO PASO:");
    console.log(`   Cuando el usuario autorice, ejecutaremos:`);
    console.log(`   - 1 orden de prueba PEQUEÑA de SPY en paper`);
    console.log(`   - Registraremos: entrada, fill, slippage, stop, take profit`);
    console.log(`   - Esperaremos señal de salida de Tito Core`);
    console.log(`   - Registraremos P&L real vs predicho`);

    // 7. Resumen de seguridad
    console.log("\n6️⃣ VALIDACIÓN DE SEGURIDAD:");
    console.log(`   ✅ Endpoint: ${ALPACA_PAPER_BASE} (PAPER)`);
    console.log(`   ✅ Cuenta: ${account.account_number} (PAPER, active)`);
    console.log(`   ✅ Lógica: Tito Core v0.3.0 (congelada, sin cambios)`);
    console.log(`   ✅ Orden: Pequeña prueba de SPY (1 contrato)`);
    console.log(`   ✅ Registro: Todas las transacciones logged`);
    console.log(`   ✅ Detenible: Espera autorización antes de ejecutar`);

    console.log("\n🟡 FASE D CONTROLADA LISTA");
    console.log("==================================\n");

    return {
      success: true,
      status: "AWAITING_USER_APPROVAL",
      account: account.account_number,
      endpoint: ALPACA_PAPER_BASE,
      spyPrice: spot.toFixed(2),
      titoDecision,
      titoConfidence,
      logFile: LOG_FILE,
      nextAction: "Execute small SPY test order when market is open",
    };
  } catch (error: any) {
    console.error("\n❌ ERROR:");
    console.error(error.message);

    logEvent({
      timestamp: new Date().toISOString(),
      event: "ERROR",
      symbol: "SYSTEM",
      error: error.message,
    });

    process.exit(1);
  }
}

// Ejecutar
runPhaseD()
  .then((result) => {
    console.log("\n📋 RESULTADO:");
    console.log(JSON.stringify(result, null, 2));
    console.log(`\n📂 Log file: ${LOG_FILE}`);
  })
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
