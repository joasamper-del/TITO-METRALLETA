/**
 * Trading Logger — Registro completo de operaciones Fase D
 *
 * Registra CADA operación con:
 * - Decisión de Tito Core (CALL/PUT/WAIT/NO TRADE)
 * - Confianza, razones, entrada/salida, S/L-T/P, slippage, P&L
 * - Resumen acumulado por ticker
 *
 * Formato: JSONL (1 línea = 1 operación JSON)
 */

import * as fs from "fs";
import * as path from "path";

export interface TradeRecord {
  // Timestamp
  timestamp: string;
  date: string;
  time: string;

  // Operación
  ticker: string;
  decision: "CALL" | "PUT" | "WAIT" | "NO TRADE";
  confidence: number; // 0-100

  // Entrada
  entryReason: string;
  entryPrice: number;
  entryTime: string;

  // Riesgo
  stopLoss: number;
  takeProfit: number;

  // Salida
  exitPrice: number;
  exitTime: string;
  exitReason: string;

  // Ejecución
  slippageEntry: number;
  slippageExit: number;
  duration: string; // "HH:MM:SS"

  // Resultado
  pnlDollars: number;
  pnlPercent: number;
  result: "WIN" | "LOSS" | "BREAK_EVEN";

  // Tito Core
  titoReasons: string[];
  titoValidation: string;

  // VIX Context (confirmación, NO señal principal)
  vixValue?: number;
  vixRegime?: "baja" | "normal" | "media" | "alta";
  vixConfirmation?: "alcista" | "neutral" | "bajista";
  vixAlignment?: "confirmada" | "neutral" | "contradice";

  // MOC Context (confirmación al cierre, NO señal principal)
  mocNetImbalance?: number; // Compra - Venta neto
  mocDirection?: "compra" | "venta" | "balance";
  mocMagnitude?: "muy alta" | "alta" | "media" | "baja";
  mocConfirmation?: "alcista" | "neutral" | "bajista";
  mocAlignment?: "confirmada" | "neutral" | "contradice";
  mocChangeFromOpen?: number;
}

export interface TradingSummary {
  date: string;
  totalTrades: number;
  winnersCount: number;
  losersCount: number;
  breakEvenCount: number;
  winRate: number; // Porcentaje
  totalPnlDollars: number;
  totalPnlPercent: number;
  byTicker: Record<string, TickerStats>;
  lastUpdate: string;
}

export interface TickerStats {
  ticker: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  pnlDollars: number;
  pnlPercent: number;
}

const LOG_DIR = path.join(__dirname, "phase_d_logs");
const TRADES_FILE = path.join(LOG_DIR, `trades_${new Date().toISOString().split("T")[0]}.jsonl`);
const SUMMARY_FILE = path.join(LOG_DIR, `summary_${new Date().toISOString().split("T")[0]}.json`);

// Crear directorio si no existe
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Registra una operación completada
 */
export function logTrade(trade: TradeRecord): void {
  const entry = JSON.stringify(trade) + "\n";
  fs.appendFileSync(TRADES_FILE, entry);
  console.log(`📝 Trade logged: ${trade.ticker} ${trade.decision} (${trade.result})`);
  updateSummary();
}

/**
 * Actualiza resumen acumulado
 */
function updateSummary(): void {
  try {
    // Leer todos los trades del archivo
    const tradesText = fs.readFileSync(TRADES_FILE, "utf8");
    const trades = tradesText
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as TradeRecord);

    // Calcular resumen
    const summary: TradingSummary = {
      date: new Date().toISOString().split("T")[0],
      totalTrades: trades.length,
      winnersCount: trades.filter((t) => t.result === "WIN").length,
      losersCount: trades.filter((t) => t.result === "LOSS").length,
      breakEvenCount: trades.filter((t) => t.result === "BREAK_EVEN").length,
      winRate: 0,
      totalPnlDollars: 0,
      totalPnlPercent: 0,
      byTicker: {},
      lastUpdate: new Date().toISOString(),
    };

    // Calcular win rate
    if (summary.totalTrades > 0) {
      summary.winRate = (summary.winnersCount / summary.totalTrades) * 100;
    }

    // Calcular P&L total
    summary.totalPnlDollars = trades.reduce((sum, t) => sum + t.pnlDollars, 0);
    summary.totalPnlPercent = trades.reduce((sum, t) => sum + t.pnlPercent, 0) / Math.max(trades.length, 1);

    // Stats por ticker
    const tickerMap = new Map<string, TradeRecord[]>();
    trades.forEach((t) => {
      if (!tickerMap.has(t.ticker)) {
        tickerMap.set(t.ticker, []);
      }
      tickerMap.get(t.ticker)!.push(t);
    });

    tickerMap.forEach((tickerTrades, ticker) => {
      const wins = tickerTrades.filter((t) => t.result === "WIN").length;
      const losses = tickerTrades.filter((t) => t.result === "LOSS").length;
      const pnl = tickerTrades.reduce((sum, t) => sum + t.pnlDollars, 0);
      const pnlPct = tickerTrades.reduce((sum, t) => sum + t.pnlPercent, 0) / tickerTrades.length;

      summary.byTicker[ticker] = {
        ticker,
        trades: tickerTrades.length,
        wins,
        losses,
        winRate: tickerTrades.length > 0 ? (wins / tickerTrades.length) * 100 : 0,
        pnlDollars: pnl,
        pnlPercent: pnlPct,
      };
    });

    // Guardar resumen
    fs.writeFileSync(SUMMARY_FILE, JSON.stringify(summary, null, 2));
  } catch (error: any) {
    console.error("Error updating summary:", error.message);
  }
}

/**
 * Obtiene resumen actual
 */
export function getSummary(): TradingSummary | null {
  try {
    if (!fs.existsSync(SUMMARY_FILE)) {
      return null;
    }
    const data = fs.readFileSync(SUMMARY_FILE, "utf8");
    return JSON.parse(data) as TradingSummary;
  } catch (error) {
    return null;
  }
}

/**
 * Crea un registro de operación desde datos crudos
 */
export function createTradeRecord(
  ticker: string,
  decision: "CALL" | "PUT" | "WAIT" | "NO TRADE",
  confidence: number,
  entryReason: string,
  entryPrice: number,
  stopLoss: number,
  takeProfit: number,
  exitPrice: number,
  exitReason: string,
  slippageEntry: number,
  slippageExit: number,
  duration: string,
  titoReasons: string[] = [],
  titoValidation: string = ""
): TradeRecord {
  const now = new Date();
  const entryTime = now.toISOString();
  const exitTime = now.toISOString(); // En una orden real, sería diferente

  // Calcular P&L
  const pnlDollars = exitPrice - entryPrice;
  const pnlPercent = (pnlDollars / entryPrice) * 100;

  // Determinar resultado
  let result: "WIN" | "LOSS" | "BREAK_EVEN";
  if (Math.abs(pnlDollars) < 0.01) {
    result = "BREAK_EVEN";
  } else if (pnlDollars > 0) {
    result = "WIN";
  } else {
    result = "LOSS";
  }

  return {
    timestamp: now.toISOString(),
    date: now.toISOString().split("T")[0],
    time: now.toTimeString().split(" ")[0],
    ticker,
    decision,
    confidence,
    entryReason,
    entryPrice,
    entryTime,
    stopLoss,
    takeProfit,
    exitPrice,
    exitTime,
    exitReason,
    slippageEntry,
    slippageExit,
    duration,
    pnlDollars,
    pnlPercent,
    result,
    titoReasons,
    titoValidation,
  };
}

/**
 * Imprime resumen en consola
 */
export function printSummary(): void {
  const summary = getSummary();
  if (!summary) {
    console.log("No trades logged yet.");
    return;
  }

  console.log("\n📊 TRADING SUMMARY");
  console.log("==================");
  console.log(`Date: ${summary.date}`);
  console.log(`Total Trades: ${summary.totalTrades}`);
  console.log(`  Win: ${summary.winnersCount} | Loss: ${summary.losersCount} | Break-even: ${summary.breakEvenCount}`);
  console.log(`Win Rate: ${summary.winRate.toFixed(1)}%`);
  console.log(`Total P&L: $${summary.totalPnlDollars.toFixed(2)} (${summary.totalPnlPercent.toFixed(2)}%)`);

  console.log("\n📈 BY TICKER:");
  Object.values(summary.byTicker).forEach((ticker) => {
    console.log(`  ${ticker.ticker}: ${ticker.trades} trades | Win rate: ${ticker.winRate.toFixed(1)}% | P&L: $${ticker.pnlDollars.toFixed(2)} (${ticker.pnlPercent.toFixed(2)}%)`);
  });
}

export default {
  logTrade,
  getSummary,
  createTradeRecord,
  printSummary,
};
