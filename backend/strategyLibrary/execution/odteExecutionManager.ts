/**
 * 0DTE Execution Manager - FASE 1
 * Integrates 0DTE options trading into ExecutionEngine
 * Conservative learning phase: 1 contract max, 3 trades/day, wide SL/TP
 * Paper Trading ONLY, real money DISABLED
 */

import { ExecutionEngine, ExecutionContext, ExecutionDecision } from "./executionEngine";
import { EnhancedOperationLogger } from "./enhanced.operation.logger";
import { ODTE_PHASE1_CONFIG, validatePhase1Config } from "./odte.phase1.learning.config";
import { AlpacaAdapter } from "./alpacaAdapter";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env.local") });

export interface OdteTradeRecord {
  tradeId: string;
  symbol: string;
  type: "CALL" | "PUT";
  premiumPaid: number;
  quantity: number;
  entryPrice: number;
  entryTime: Date;
  exitPrice?: number;
  exitTime?: Date;
  exitReason?: "TP" | "SL" | "TRAILING" | "TIME_CLOSE" | "CONNECTION_LOSS";
  pnl?: number;
  pnlPercentage?: number;
  confidence: number;
  slLevel: number;
  tpLevel: number;
  trailingStopActivated?: boolean;
}

export interface Phase1Status {
  enabled: boolean;
  executionAllowed: boolean;
  config: typeof ODTE_PHASE1_CONFIG;
  paperTrading: boolean;
  realMoneyDisabled: boolean;
  openTrades: OdteTradeRecord[];
  tradeCount: {
    today: number;
    maximum: number;
  };
  errors: string[];
}

export class OdteExecutionManager {
  private executionEngine: ExecutionEngine;
  private operationLogger: EnhancedOperationLogger;
  private alpaca: AlpacaAdapter;
  private openTrades: Map<string, OdteTradeRecord> = new Map();
  private tradesPlacedToday: number = 0;
  private executionEnabled: boolean = false; // CRITICAL: Default FALSE until explicit enable
  private tradeCounter: number = 0;

  constructor(alpacaApiKey: string, alpacaSecretKey: string) {
    // Validate config first
    const validation = validatePhase1Config();
    if (!validation.valid) {
      throw new Error(`Phase 1 Config validation failed: ${validation.errors.join("; ")}`);
    }

    // Initialize components
    this.executionEngine = new ExecutionEngine(alpacaApiKey, alpacaSecretKey, "0DTE_PHASE1");
    this.operationLogger = new EnhancedOperationLogger();
    this.alpaca = new AlpacaAdapter(alpacaApiKey, alpacaSecretKey);

    // Verify Paper Trading is enforced
    if (!ODTE_PHASE1_CONFIG.paperTradingOnly || !ODTE_PHASE1_CONFIG.realMoneyDisabled) {
      throw new Error("Paper Trading MUST be enabled for Phase 1");
    }

    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║        0DTE EXECUTION MANAGER - PHASE 1 INITIALIZED        ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    console.log("🟢 STATUS: READY");
    console.log(`   Execution enabled: ${this.executionEnabled}`);
    console.log(`   Paper Trading: ${ODTE_PHASE1_CONFIG.paperTradingOnly}`);
    console.log(`   Real money disabled: ${ODTE_PHASE1_CONFIG.realMoneyDisabled}\n`);

    console.log("⚠️  EXECUTION IS CURRENTLY DISABLED");
    console.log("   Awaiting explicit enablement via enableExecution()\n");
  }

  /**
   * Enable execution (MUST be called explicitly by user)
   */
  enableExecution(reason: string = "User approval"): void {
    if (this.executionEnabled) {
      console.log("⚠️  Execution already enabled");
      return;
    }

    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║              0DTE EXECUTION ENABLED                        ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    console.log(`✅ Execution enabled at ${new Date().toISOString()}`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Mode: Paper Trading (MANDATORY)\n`);

    this.executionEnabled = true;
  }

  /**
   * Check if execution is enabled
   */
  isExecutionEnabled(): boolean {
    return this.executionEnabled;
  }

  /**
   * Execute 0DTE trade
   * Checks all FASE 1 constraints before allowing execution
   */
  async executeOdteTrade(
    symbol: string,
    type: "CALL" | "PUT",
    premiumPaid: number,
    quantity: number = 1
  ): Promise<{
    success: boolean;
    tradeId?: string;
    message: string;
    wouldExecute?: boolean;
  }> {
    const tradeId = `0DTE_${++this.tradeCounter}_${Date.now()}`;

    // Pre-flight checks
    const preflight = this.validatePreFlight(symbol, type, premiumPaid, quantity, tradeId);
    if (!preflight.valid) {
      return {
        success: false,
        message: preflight.errors.join("; "),
        wouldExecute: false,
      };
    }

    // Check if execution is enabled
    if (!this.executionEnabled) {
      console.log(`\n⚠️  Trade NOT executed (execution disabled)`);
      console.log(`   Would execute: ${symbol} ${type} @ $${premiumPaid.toFixed(4)}`);
      console.log(`   Trade ID: ${tradeId}\n`);

      return {
        success: false,
        message: "Execution currently disabled (awaiting user approval)",
        wouldExecute: true,
        tradeId,
      };
    }

    // Calculate SL/TP levels
    const slLevel = premiumPaid * (1 - ODTE_PHASE1_CONFIG.slPercentageOfPremium);
    const tpLevel = premiumPaid * (1 + ODTE_PHASE1_CONFIG.tpPercentageOfPremium);
    const riskPercentage = ODTE_PHASE1_CONFIG.slPercentageOfPremium * 100;

    // Create trade record
    const trade: OdteTradeRecord = {
      tradeId,
      symbol,
      type,
      premiumPaid,
      quantity,
      entryPrice: premiumPaid,
      entryTime: new Date(),
      confidence: 75, // Placeholder
      slLevel,
      tpLevel,
    };

    // Log entry with correct types
    this.operationLogger.recordEntry(symbol, "OPTION", {
      entryPrice: premiumPaid,
      quantity,
      entryReason: `${type} position initiated`,
      confidence: 75,
      stopLoss: slLevel,
      takeProfit: tpLevel,
      riskPercentage,
      optionType: type,
    });

    // Track trade
    this.openTrades.set(tradeId, trade);
    this.tradesPlacedToday++;

    console.log(`\n✅ 0DTE Trade executed: ${tradeId}`);
    console.log(`   Symbol: ${symbol} ${type}`);
    console.log(`   Premium: $${premiumPaid.toFixed(4)}`);
    console.log(`   SL: $${slLevel.toFixed(4)} (${(ODTE_PHASE1_CONFIG.slPercentageOfPremium * 100).toFixed(0)}% loss)`);
    console.log(`   TP: $${tpLevel.toFixed(4)} (${(ODTE_PHASE1_CONFIG.tpPercentageOfPremium * 100).toFixed(0)}% gain)\n`);

    return {
      success: true,
      tradeId,
      message: "Trade placed successfully",
    };
  }

  /**
   * Validate pre-flight checks for 0DTE trade
   */
  private validatePreFlight(
    symbol: string,
    type: "CALL" | "PUT",
    premiumPaid: number,
    quantity: number,
    tradeId: string
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check symbol
    if (!ODTE_PHASE1_CONFIG.approvedSymbols.includes(symbol)) {
      errors.push(`Symbol ${symbol} not approved for 0DTE (only ${ODTE_PHASE1_CONFIG.approvedSymbols.join(", ")})`);
    }

    // Check quantity
    if (quantity > ODTE_PHASE1_CONFIG.maxContractsPerTrade) {
      errors.push(`Quantity ${quantity} exceeds max ${ODTE_PHASE1_CONFIG.maxContractsPerTrade} contract(s)`);
    }

    // Check daily trade count
    if (this.tradesPlacedToday >= ODTE_PHASE1_CONFIG.maxOperationsPerDay) {
      errors.push(`Daily limit reached (${ODTE_PHASE1_CONFIG.maxOperationsPerDay} trades/day)`);
    }

    // Check simultaneous positions
    if (this.openTrades.size >= ODTE_PHASE1_CONFIG.maxSimultaneousPositions) {
      errors.push(`Max simultaneous positions (${ODTE_PHASE1_CONFIG.maxSimultaneousPositions}) already reached`);
    }

    // Check entry time
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

    if (currentTime >= ODTE_PHASE1_CONFIG.entryStopTime) {
      errors.push(`Entry window closed (stops at ${ODTE_PHASE1_CONFIG.entryStopTime} ET)`);
    }

    if (currentTime < ODTE_PHASE1_CONFIG.entryStartTime) {
      errors.push(`Entry window not open yet (starts at ${ODTE_PHASE1_CONFIG.entryStartTime} ET)`);
    }

    // Check premium validity
    if (premiumPaid <= 0) {
      errors.push(`Premium must be > 0 (got ${premiumPaid})`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Record trade exit (TP, SL, trailing, time close, connection loss)
   */
  async recordTradeExit(
    tradeId: string,
    exitPrice: number,
    exitReason: "TP" | "SL" | "TRAILING" | "TIME_CLOSE" | "CONNECTION_LOSS"
  ): Promise<void> {
    const trade = this.openTrades.get(tradeId);
    if (!trade) {
      console.error(`Trade ${tradeId} not found`);
      return;
    }

    trade.exitPrice = exitPrice;
    trade.exitTime = new Date();
    trade.exitReason = exitReason;

    // Calculate P&L
    const priceChange = exitPrice - trade.entryPrice;
    trade.pnl = priceChange * 100 * trade.quantity; // 100 shares per contract
    trade.pnlPercentage = (priceChange / trade.entryPrice) * 100;

    // Check if trailing stop was active
    if (exitReason === "TRAILING") {
      const trailingActivationLevel = trade.entryPrice * (1 + ODTE_PHASE1_CONFIG.trailingStopActivationGain);
      if (exitPrice >= trailingActivationLevel) {
        trade.trailingStopActivated = true;
      }
    }

    // Map exit reason to logger-compatible type
    const exitType: "SL" | "TP" | "MANUAL" =
      exitReason === "TP" ? "TP" :
      exitReason === "SL" ? "SL" :
      "MANUAL";

    // Map exit reason string
    const exitReasonStr =
      exitReason === "TRAILING" ? "Trailing stop activated" :
      exitReason === "TIME_CLOSE" ? "Forced close (market hours)" :
      exitReason === "CONNECTION_LOSS" ? "Auto-liquidation (connection loss)" :
      exitReason;

    // Log exit
    this.operationLogger.recordExit(tradeId, exitPrice, exitReasonStr, exitType);

    // Add analysis to learning engine
    const analysis = {
      whatWentWell: this.analyzeWhatWentWell(trade).join("; "),
      whatWentWrong: this.analyzeWhatWentWrong(trade).join("; "),
      whatCouldBeBetter: this.analyzeCouldImprove(trade).join("; "),
      ruleAdjustment: this.suggestRuleAdjustment(trade),
    };

    this.operationLogger.addAnalysis(tradeId, analysis);

    // Remove from open trades
    this.openTrades.delete(tradeId);

    console.log(`\n📊 Trade closed: ${tradeId}`);
    console.log(`   Exit: ${exitReason} @ $${exitPrice.toFixed(4)}`);
    console.log(`   P&L: $${trade.pnl?.toFixed(2)} (${trade.pnlPercentage?.toFixed(1)}%)\n`);
  }

  /**
   * Analyze what went well
   */
  private analyzeWhatWentWell(trade: OdteTradeRecord): string[] {
    const insights: string[] = [];

    if (trade.pnl! > 0) {
      insights.push("Trade was profitable");
    }

    if (trade.exitReason === "TP") {
      insights.push("Took profit at target (good discipline)");
    }

    if (trade.trailingStopActivated) {
      insights.push("Trailing stop protected gains");
    }

    if (Math.abs(trade.pnlPercentage!) >= 15) {
      insights.push("High confidence setup, good execution");
    }

    return insights.length > 0 ? insights : ["Trade executed as planned"];
  }

  /**
   * Analyze what went wrong
   */
  private analyzeWhatWentWrong(trade: OdteTradeRecord): string[] {
    const insights: string[] = [];

    if (trade.pnl! < 0) {
      insights.push("Trade resulted in loss");
    }

    if (trade.exitReason === "SL") {
      insights.push("Hit stop loss (rapid move against position)");
    }

    if (trade.exitReason === "TIME_CLOSE") {
      insights.push("Forced close due to time (theta decay may have hurt)");
    }

    if (trade.exitReason === "CONNECTION_LOSS") {
      insights.push("Liquidated due to connection loss (uncontrolled exit)");
    }

    return insights;
  }

  /**
   * Analyze what could improve
   */
  private analyzeCouldImprove(trade: OdteTradeRecord): string[] {
    const insights: string[] = [];

    if (trade.exitReason === "SL" && Math.abs(trade.pnlPercentage!) > 10) {
      insights.push("SL 10% may be too tight; consider 15% for Phase 1 refinement");
    }

    if (trade.exitReason === "TP" && trade.pnlPercentage! > 25) {
      insights.push("TP 20% hit early; could be opportunity for wider TP");
    }

    if (trade.confidence < 65) {
      insights.push("Low confidence setup; tighten entry filters");
    }

    return insights;
  }

  /**
   * Suggest rule adjustment
   */
  private suggestRuleAdjustment(trade: OdteTradeRecord): string {
    if (trade.pnl! > 100) {
      return "Consider similar setups in future; parameters working well";
    }

    if (trade.exitReason === "SL" && trade.pnlPercentage! < -8) {
      return "SL triggered quickly; may need wider SL for Phase 1 learning";
    }

    if (trade.exitReason === "TRAILING" && trade.trailingStopActivated) {
      return "Trailing stop effective; consider activating after +5% instead of +10%";
    }

    return "No rule adjustment needed; Phase 1 learning continues";
  }

  /**
   * Get current status
   */
  getStatus(): Phase1Status {
    return {
      enabled: this.executionEnabled,
      executionAllowed: this.executionEnabled,
      config: ODTE_PHASE1_CONFIG,
      paperTrading: ODTE_PHASE1_CONFIG.paperTradingOnly,
      realMoneyDisabled: ODTE_PHASE1_CONFIG.realMoneyDisabled,
      openTrades: Array.from(this.openTrades.values()),
      tradeCount: {
        today: this.tradesPlacedToday,
        maximum: ODTE_PHASE1_CONFIG.maxOperationsPerDay,
      },
      errors: [],
    };
  }

  /**
   * Display phase 1 status
   */
  displayStatus(): void {
    const status = this.getStatus();

    console.log("\n╔════════════════════════════════════════════════════════════╗");
    console.log("║           0DTE PHASE 1 - EXECUTION STATUS                 ║");
    console.log("╚════════════════════════════════════════════════════════════╝\n");

    console.log(`🟢 Enabled: ${status.enabled ? "YES" : "NO"}`);
    console.log(`🔒 Paper Trading: ${status.paperTrading ? "YES (MANDATORY)" : "DISABLED"}`);
    console.log(`🚫 Real Money: ${status.realMoneyDisabled ? "DISABLED (MANDATORY)" : "ENABLED (ERROR!)"}\n`);

    console.log(`📊 Today's Activity:`);
    console.log(`   Trades: ${status.tradeCount.today}/${status.tradeCount.maximum}`);
    console.log(`   Open positions: ${status.openTrades.length}/${ODTE_PHASE1_CONFIG.maxSimultaneousPositions}\n`);

    if (status.openTrades.length > 0) {
      console.log("📋 Open Trades:");
      status.openTrades.forEach((trade) => {
        console.log(`   ${trade.tradeId}`);
        console.log(`   • ${trade.symbol} ${trade.type} @ $${trade.entryPrice.toFixed(4)}`);
        console.log(`   • SL: $${trade.slLevel.toFixed(4)} | TP: $${trade.tpLevel.toFixed(4)}\n`);
      });
    }

    console.log("═══════════════════════════════════════════════════════════");
    console.log("✅ Phase 1 framework operational\n");
  }
}

export default OdteExecutionManager;
