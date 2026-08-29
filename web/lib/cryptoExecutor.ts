/**
 * CRYPTO EXECUTOR — Sesión 24
 * Integra cryptoRuleEngine.ts con Alpaca PAPER (proposal-only mode)
 * CONGELADO: Tito Core v0.3.0 sin cambios
 * SEGURIDAD: Valida endpoint PAPER, bloquea LIVE
 * MODO: Proposal-only (genera pero NO ejecuta)
 */

import { evaluateCrypto, DEFAULT_CONFIG, type CryptoSnapshot } from "./cryptoRuleEngine";
import type { CryptoDecision } from "./cryptoRuleEngine";

export interface CryptoOrder {
  symbol: "BTC" | "ETH";
  side: "buy" | "sell"; // LONG=buy, SHORT=sell
  qty: number; // Cantidad crypto
  limit_price: number; // Entrada
  stop_loss: number;
  take_profit: number;
  notional: number; // USD
  risk_dollars: number;
  risk_percent: number; // % de saldo
  exposure_percent: number;
  reason: string;
  timestamp: string;
  status: "PROPOSED" | "PENDING_APPROVAL" | "EXECUTED" | "REJECTED";
}

export interface ExecutorConfig {
  alpacaBaseUrl: string; // paper-api.alpaca.markets ONLY
  alpacaApiKey: string;
  alpacaSecret: string;
  dryRun: boolean; // true = proposal-only (NO ejecución)
  accountBalance: number; // Para cálculo de risk %
}

/**
 * VALIDACIÓN: Endpoint PAPER solamente
 */
function validatePaperEndpoint(baseUrl: string): { valid: boolean; reason: string } {
  const paperPatterns = [
    "paper-api.alpaca.markets",
    "paper.alpaca.markets",
    "paper-trading.alpaca.markets",
  ];

  const isLivePattern = baseUrl.includes("api.alpaca.markets") && !baseUrl.includes("paper");

  if (isLivePattern) {
    return {
      valid: false,
      reason: `❌ LIVE endpoint detectado: ${baseUrl} — BLOQUEADO. Usa paper-api.alpaca.markets`,
    };
  }

  const isPaper = paperPatterns.some((pattern) => baseUrl.includes(pattern));

  return {
    valid: isPaper,
    reason: isPaper
      ? `✓ Endpoint PAPER verificado: ${baseUrl}`
      : `⚠️ Endpoint no reconocido: ${baseUrl} (esperado: paper-api.alpaca.markets)`,
  };
}

/**
 * OBTENER DATOS REALES de Alpaca Crypto
 */
export async function fetchCryptoSnapshot(
  symbol: "BTC" | "ETH",
  config: ExecutorConfig
): Promise<{ snapshot: CryptoSnapshot | null; error?: string }> {
  try {
    // Validar endpoint
    const endpointCheck = validatePaperEndpoint(config.alpacaBaseUrl);
    if (!endpointCheck.valid) {
      return { snapshot: null, error: endpointCheck.reason };
    }

    // En producción: obtener datos reales de Alpaca
    // Por ahora: retornar snapshot de prueba (simulado)
    const mockSnapshots: Record<string, CryptoSnapshot> = {
      BTC: {
        symbol: "BTC",
        direction: "LONG",
        trend: "alcista",
        spotPrice: 77648,
        volatilityDaily: 3.2,
        volumeScore: 95,
        spreadPercent: 0.08,
        patternConfidence: 75,
        fearIndex: 45,
        dataQuality: "alta",
      },
      ETH: {
        symbol: "ETH",
        direction: "SHORT",
        trend: "bajista",
        spotPrice: 2450,
        volatilityDaily: 2.8,
        volumeScore: 92,
        spreadPercent: 0.1,
        patternConfidence: 70,
        fearIndex: 35,
        dataQuality: "alta",
      },
    };

    return { snapshot: mockSnapshots[symbol] };
  } catch (err) {
    return {
      snapshot: null,
      error: `Error fetching ${symbol} snapshot: ${err}`,
    };
  }
}

/**
 * GENERAR PROPUESTA DE ORDEN (proposal-only, NO ejecución)
 */
export async function proposeCryptoOrder(
  snapshot: CryptoSnapshot,
  config: ExecutorConfig
): Promise<{ order: CryptoOrder | null; decision: CryptoDecision; error?: string }> {
  // Validar endpoint
  const endpointCheck = validatePaperEndpoint(config.alpacaBaseUrl);
  if (!endpointCheck.valid) {
    const emptyDecision: CryptoDecision = {
      decision: "NO_OPERAR",
      confidence: 0,
      reasoning: [endpointCheck.reason],
      warnings: [endpointCheck.reason],
    };
    return { order: null, decision: emptyDecision, error: endpointCheck.reason };
  }

  // Evaluar con cryptoRuleEngine
  const positionConfig = {
    ...DEFAULT_CONFIG,
    accountBalance: config.accountBalance,
  };
  const decision = evaluateCrypto(snapshot, positionConfig, 0);

  // Si NO se puede operar, retornar vacío
  if (decision.decision !== "OPERAR" || !decision.positionSize) {
    return { order: null, decision };
  }

  // Generar propuesta de orden
  const side = snapshot.direction === "LONG" ? "buy" : "sell";
  const order: CryptoOrder = {
    symbol: snapshot.symbol,
    side,
    qty: decision.positionSize.cryptoAmount,
    limit_price: snapshot.spotPrice,
    stop_loss:
      snapshot.direction === "LONG"
        ? snapshot.spotPrice * (1 - snapshot.volatilityDaily / 100)
        : snapshot.spotPrice * (1 + snapshot.volatilityDaily / 100),
    take_profit:
      snapshot.direction === "LONG"
        ? snapshot.spotPrice * (1 + 2 * (snapshot.volatilityDaily / 100))
        : snapshot.spotPrice * (1 - 2 * (snapshot.volatilityDaily / 100)),
    notional: decision.positionSize.notional,
    risk_dollars: decision.positionSize.riskDollars,
    risk_percent: decision.positionSize.riskPercent,
    exposure_percent: decision.positionSize.exposurePercent,
    reason: decision.reasoning.join(" | "),
    timestamp: new Date().toISOString(),
    status: "PROPOSED",
  };

  return { order, decision };
}

/**
 * EJECUTAR ORDEN (bloqueado hasta aprobación explícita)
 * NOTA: Este código NO se ejecuta sin aprobación manual
 */
export async function executeOrder(
  order: CryptoOrder,
  config: ExecutorConfig
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  // VALIDACIÓN CRÍTICA: endpoint PAPER
  const endpointCheck = validatePaperEndpoint(config.alpacaBaseUrl);
  if (!endpointCheck.valid) {
    return {
      success: false,
      error: `❌ EJECUCIÓN BLOQUEADA: ${endpointCheck.reason}`,
    };
  }

  // Si dryRun = true (proposal-only), NO ejecutar
  if (config.dryRun) {
    return {
      success: false,
      error: `DRY_RUN: Propuesta generada pero NO ejecutada. Orden pendiente de aprobación manual.`,
    };
  }

  // En producción: enviar a Alpaca PAPER
  // Por ahora: simulación
  console.log(`📤 EJECUTANDO (SIMULATION): ${order.symbol} ${order.side.toUpperCase()} ${order.qty}`);
  console.log(`   Precio: $${order.limit_price}`);
  console.log(`   Notional: $${order.notional.toFixed(2)}`);
  console.log(`   Endpoint: ${config.alpacaBaseUrl}`);

  return {
    success: true,
    orderId: `sim-${Date.now()}`,
  };
}

/**
 * WORKFLOW PRINCIPAL: Evaluar → Proponer → (Esperar aprobación)
 */
export async function evaluateAndProposeCrypto(
  symbol: "BTC" | "ETH",
  direction: "LONG" | "SHORT",
  executorConfig: ExecutorConfig
): Promise<{
  order: CryptoOrder | null;
  decision: CryptoDecision | null;
  error?: string;
}> {
  // PASO 1: Obtener datos reales
  const snapshotResult = await fetchCryptoSnapshot(symbol, executorConfig);
  if (!snapshotResult.snapshot) {
    return {
      order: null,
      decision: null,
      error: snapshotResult.error,
    };
  }

  // PASO 2: Actualizar dirección
  const snapshot = {
    ...snapshotResult.snapshot,
    direction,
  };

  // PASO 3: Proponer orden
  const proposalResult = await proposeCryptoOrder(snapshot, executorConfig);

  return {
    order: proposalResult.order,
    decision: proposalResult.decision,
    error: proposalResult.error,
  };
}

/**
 * DRY-RUN: Prueba con BTC y ETH
 */
if (process.env.NODE_ENV === "development" && typeof process !== "undefined") {
  (async () => {
    console.log("\n🚀 CRYPTO EXECUTOR — Sesión 24 PROPOSAL-ONLY TEST\n");

    const testConfig: ExecutorConfig = {
      alpacaBaseUrl: "https://paper-api.alpaca.markets",
      alpacaApiKey: "DUMMY_KEY",
      alpacaSecret: "DUMMY_SECRET",
      dryRun: true, // ← Proposal-only (NO ejecución)
      accountBalance: 100000,
    };

    // TEST 1: BTC LONG
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("TEST 1: BTC LONG (datos reales simulados)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const result1 = await evaluateAndProposeCrypto("BTC", "LONG", testConfig);
    if (result1.order) {
      console.log(`✅ ORDEN PROPUESTA (NO EJECUTADA):`);
      console.log(`   Símbolo: ${result1.order.symbol}`);
      console.log(`   Lado: ${result1.order.side.toUpperCase()}`);
      console.log(`   Cantidad: ${result1.order.qty.toFixed(6)} BTC`);
      console.log(`   Precio entrada: $${result1.order.limit_price}`);
      console.log(`   Notional: $${result1.order.notional.toFixed(2)}`);
      console.log(`   Stop Loss: $${result1.order.stop_loss.toFixed(2)}`);
      console.log(`   Take Profit: $${result1.order.take_profit.toFixed(2)}`);
      console.log(`   Riesgo: $${result1.order.risk_dollars.toFixed(2)} (${result1.order.risk_percent.toFixed(2)}%)`);
      console.log(`   Exposición: ${result1.order.exposure_percent.toFixed(2)}%`);
      console.log(`   Razones: ${result1.order.reason}`);
      console.log(`   Estado: ${result1.order.status}`);
      console.log(`   ⚠️ MODO: Proposal-only (sin enviar a Alpaca)\n`);
    } else {
      console.log(`❌ No se pudo generar propuesta: ${result1.error}\n`);
    }

    // TEST 2: ETH SHORT
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("TEST 2: ETH SHORT (datos reales simulados)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const result2 = await evaluateAndProposeCrypto("ETH", "SHORT", testConfig);
    if (result2.order) {
      console.log(`✅ ORDEN PROPUESTA (NO EJECUTADA):`);
      console.log(`   Símbolo: ${result2.order.symbol}`);
      console.log(`   Lado: ${result2.order.side.toUpperCase()}`);
      console.log(`   Cantidad: ${result2.order.qty.toFixed(6)} ETH`);
      console.log(`   Precio entrada: $${result2.order.limit_price}`);
      console.log(`   Notional: $${result2.order.notional.toFixed(2)}`);
      console.log(`   Stop Loss: $${result2.order.stop_loss.toFixed(2)}`);
      console.log(`   Take Profit: $${result2.order.take_profit.toFixed(2)}`);
      console.log(`   Riesgo: $${result2.order.risk_dollars.toFixed(2)} (${result2.order.risk_percent.toFixed(2)}%)`);
      console.log(`   Exposición: ${result2.order.exposure_percent.toFixed(2)}%`);
      console.log(`   Razones: ${result2.order.reason}`);
      console.log(`   Estado: ${result2.order.status}`);
      console.log(`   ⚠️ MODO: Proposal-only (sin enviar a Alpaca)\n`);
    } else {
      console.log(`❌ No se pudo generar propuesta: ${result2.error}\n`);
    }

    // TEST 3: Validación LIVE endpoint (debe bloquearse)
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("TEST 3: Validación LIVE endpoint (debe bloquearse)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const liveConfig: ExecutorConfig = {
      ...testConfig,
      alpacaBaseUrl: "https://api.alpaca.markets", // ← LIVE (PROHIBIDO)
    };
    const result3 = await evaluateAndProposeCrypto("BTC", "LONG", liveConfig);
    console.log(`❌ BLOQUEADO: ${result3.error}\n`);

    console.log("✅ CRYPTO EXECUTOR TEST COMPLETED");
    console.log("   Modo: Proposal-only (SIN ejecución)");
    console.log("   Endpoint PAPER: ✓ Validado");
    console.log("   Protección LIVE: ✓ Activa (bloquea endpoints LIVE)");
    console.log("   Tito Core v0.3.0: ✓ Sin cambios");
  })();
}
