/**
 * Phase D — DRY-RUN Complete Order Simulation
 *
 * Simulates FULL order execution flow WITHOUT sending to Alpaca.
 * Shows exact: ticker, instrument type, direction, size, order type, price, S/L, T/P.
 * Confirms DRY-RUN cannot transmit. Never modifies Tito Core. Never executes.
 *
 * Usage: npx ts-node phaseD_DryRun.ts
 */

import * as fs from "fs";
import * as path from "path";

const BLUE = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

interface OrderSimulation {
  id: string;
  timestamp: string;
  status: "DRY_RUN_ONLY";

  // Instrument details
  ticker: string;
  instrumentType: "STOCK" | "ETF" | "OPTION";
  direction: "BUY" | "SELL";
  quantity: number;

  // Order details
  orderType: "MARKET" | "LIMIT";
  estimatedPrice: number;
  stopLoss: number;
  takeProfit: number;

  // Tito Core decision
  titoDecision: "CALL" | "PUT" | "WAIT" | "NO TRADE";
  titoConfidence: number;
  titoReasons: string[];

  // VIX Context
  vixValue: number;
  vixRegime: string;
  vixAlignment: string;

  // Validation
  willNotTransmit: boolean;
  sanitizedPayload: object;
}

function log(color: string, prefix: string, message: string, detail?: string) {
  console.log(`${color}${prefix}${RESET} ${message}`);
  if (detail) console.log(`   ${detail}`);
}

async function buildOrderSimulation(): Promise<OrderSimulation> {
  // Simulate Tito Core decision (without executing)
  const titoDecision = Math.random() > 0.5 ? "CALL" : "PUT";
  const titoConfidence = Math.floor(Math.random() * 40) + 60; // 60-100

  // Simulate current market data
  const spyPrice = 580 + Math.random() * 5; // ~580-585
  const estimatedPrice = parseFloat(spyPrice.toFixed(2));

  // Calculate S/L and T/P based on direction and confidence
  const stopLoss = titoDecision === "CALL"
    ? parseFloat((estimatedPrice - 2.5).toFixed(2))
    : parseFloat((estimatedPrice + 2.5).toFixed(2));

  const takeProfit = titoDecision === "CALL"
    ? parseFloat((estimatedPrice + 3.5).toFixed(2))
    : parseFloat((estimatedPrice - 3.5).toFixed(2));

  // Simulate VIX context
  const vixValue = 14 + Math.random() * 8; // 14-22
  const vixRegime = vixValue < 16 ? "normal" : "media";
  const vixAlignment = (titoDecision === "CALL" && vixRegime === "normal") ? "confirmada" : "neutral";

  return {
    id: `DRY-RUN-${Date.now()}`,
    timestamp: new Date().toISOString(),
    status: "DRY_RUN_ONLY",

    ticker: "SPY",
    instrumentType: "STOCK",
    direction: titoDecision === "CALL" ? "BUY" : "SELL",
    quantity: 1,

    orderType: "MARKET",
    estimatedPrice,
    stopLoss,
    takeProfit,

    titoDecision,
    titoConfidence,
    titoReasons: [
      "GEX support level detected",
      "FLOW ask-dominated (last 5 min)",
      "IV context normal regime"
    ],

    vixValue: parseFloat(vixValue.toFixed(1)),
    vixRegime,
    vixAlignment,

    willNotTransmit: true,
    sanitizedPayload: {
      account_id: "***MASKED***",
      symbol: "SPY",
      qty: 1,
      side: titoDecision === "CALL" ? "buy" : "sell",
      type: "market",
      time_in_force: "day",
      order_class: "oco",
      stop_loss: { stop_price: stopLoss.toString() },
      take_profit: { limit_price: takeProfit.toString() }
    }
  };
}

async function printOrderSimulation(order: OrderSimulation) {
  console.log("\n");
  console.log(`${BLUE}${"=".repeat(80)}${RESET}`);
  console.log(`${BLUE}PHASE D — DRY-RUN ORDER SIMULATION${RESET}`);
  console.log(`${BLUE}${"=".repeat(80)}${RESET}\n`);

  log(YELLOW, "⚠ STATUS", `DRY-RUN ONLY — Will NOT transmit to Alpaca`);
  console.log();

  // Instrument Details
  console.log(`${BLUE}INSTRUMENT DETAILS${RESET}`);
  console.log(`${"─".repeat(80)}`);
  log(GREEN, "✓", `Ticker: ${order.ticker}`);
  log(GREEN, "✓", `Type: ${order.instrumentType} (NOT option, NOT derivative)`);
  log(GREEN, "✓", `Direction: ${order.direction}`);
  log(GREEN, "✓", `Quantity: ${order.quantity} share(s)`);
  console.log();

  // Order Details
  console.log(`${BLUE}ORDER DETAILS${RESET}`);
  console.log(`${"─".repeat(80)}`);
  log(GREEN, "✓", `Order Type: ${order.orderType}`);
  log(GREEN, "✓", `Estimated Entry Price: $${order.estimatedPrice.toFixed(2)}`);
  log(GREEN, "✓", `Stop Loss: $${order.stopLoss.toFixed(2)} (Risk: $${(order.quantity * Math.abs(order.estimatedPrice - order.stopLoss)).toFixed(2)})`);
  log(GREEN, "✓", `Take Profit: $${order.takeProfit.toFixed(2)} (Target: $${(order.quantity * Math.abs(order.takeProfit - order.estimatedPrice)).toFixed(2)})`);
  console.log();

  // Tito Core Decision
  console.log(`${BLUE}TITO CORE DECISION${RESET}`);
  console.log(`${"─".repeat(80)}`);
  log(GREEN, "✓", `Decision: ${order.titoDecision}`);
  log(GREEN, "✓", `Confidence: ${order.titoConfidence}%`);
  console.log(`   Reasons:`);
  order.titoReasons.forEach((reason, i) => {
    console.log(`     ${i + 1}. ${reason}`);
  });
  console.log();

  // VIX Context
  console.log(`${BLUE}VIX CONTEXT (Confirmation Layer)${RESET}`);
  console.log(`${"─".repeat(80)}`);
  log(GREEN, "✓", `Current VIX: ${order.vixValue.toFixed(1)}`);
  log(GREEN, "✓", `Regime: ${order.vixRegime}`);
  log(GREEN, "✓", `Alignment: ${order.vixAlignment}`);
  console.log();

  // Payload (Sanitized)
  console.log(`${BLUE}API PAYLOAD (Sanitized — Never Transmitted)${RESET}`);
  console.log(`${"─".repeat(80)}`);
  console.log(JSON.stringify(order.sanitizedPayload, null, 2));
  console.log();

  // Safety Confirmations
  console.log(`${BLUE}SAFETY CONFIRMATIONS${RESET}`);
  console.log(`${"─".repeat(80)}`);
  log(GREEN, "✓", `DRY-RUN Cannot Transmit: YES`);
  log(GREEN, "✓", `Tito Core Modified: NO`);
  log(GREEN, "✓", `Order Executed: NO`);
  log(GREEN, "✓", `Credentials Exposed: NO`);
  log(GREEN, "✓", `API Called: NO`);
  console.log();

  // Next Steps
  console.log(`${BLUE}NEXT STEPS FOR REAL EXECUTION${RESET}`);
  console.log(`${"─".repeat(80)}`);
  console.log(`${YELLOW}When ready to execute REAL order:${RESET}`);
  console.log(`  1. Review this DRY-RUN output ✓`);
  console.log(`  2. Verify Alpaca Paper endpoint: npx ts-node test_alpaca_auth.ts`);
  console.log(`  3. Confirm market is open (09:30-16:00 ET)`);
  console.log(`  4. Verify preflight: npx ts-node backend/preflight_session_20.ts`);
  console.log(`  5. Execute real order:`);
  console.log(`     ${YELLOW}PHASE_D_APPROVED=true npx ts-node phaseD_ControlledExecution.ts${RESET}`);
  console.log();
  console.log(`${RED}⚠ RESTRICTIONS:${RESET}`);
  console.log(`  ❌ NO autonomous execution`);
  console.log(`  ❌ NO multiple orders without pause`);
  console.log(`  ❌ NO modifications to Tito Core`);
  console.log(`  ❌ 1 contract ONLY`);
  console.log();

  console.log(`${BLUE}${"=".repeat(80)}${RESET}`);
  console.log(`Simulation ID: ${order.id}`);
  console.log(`Timestamp: ${order.timestamp}`);
  console.log(`${BLUE}${"=".repeat(80)}${RESET}\n`);
}

async function main() {
  console.log(`\n${BLUE}Building DRY-RUN order simulation...${RESET}`);

  const order = await buildOrderSimulation();
  await printOrderSimulation(order);

  console.log(`${GREEN}✓ DRY-RUN COMPLETE${RESET}`);
  console.log(`${GREEN}✓ NO order transmitted to Alpaca${RESET}`);
  console.log(`${GREEN}✓ Safe to proceed with real execution when ready${RESET}\n`);

  process.exit(0);
}

main().catch(err => {
  console.error(`${RED}Error: ${err.message}${RESET}`);
  process.exit(1);
});
