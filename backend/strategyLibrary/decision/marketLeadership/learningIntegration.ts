/**
 * Market Leadership Index - Learning Engine Integration
 * Records every MLI decision, audits accuracy, proposes improvements
 */

import { MarketLeadershipResult, MarketLeadershipLearning } from "./types";
import fs from "fs";
import path from "path";

export interface MLIDecisionRecord {
  entryId: string; // Unique ID for this trade
  timestamp: Date;
  symbol: string;
  indexSnapshot: MarketLeadershipResult;
  tradeEntry?: {
    // Only populated after trade completes
    timestamp: Date;
    direction: "LONG" | "SHORT";
    entryPrice: number;
    quantity: number;
  };
  tradeExit?: {
    // Only populated after trade closes
    timestamp: Date;
    exitPrice: number;
    pnlPercent: number;
    reason: "TP" | "SL" | "SIGNAL_CHANGE" | "MANUAL";
  };
  prediction: {
    expectedDirection: "BULLISH" | "BEARISH" | "NEUTRAL";
    expectedAction: "ENTER" | "ESPERAR" | "EVITAR";
    expectedConfidence: number;
  };
  outcome?: {
    actualDirection: "BULLISH" | "BEARISH" | "NEUTRAL";
    whatReallyHappened: string;
    correctPredictions: string[];
    incorrectPredictions: string[];
    componentEvaluation: {
      componentName: string;
      wasAccurate: boolean;
      reasoning: string;
    }[];
  };
  suggestedAdjustments?: {
    componentName: string;
    currentWeight: number;
    suggestedWeight?: number;
    confidence: number;
    reasoning: string;
  }[];
}

export class MLILearningIntegration {
  private records: Map<string, MLIDecisionRecord> = new Map();
  private logsDir: string;
  private decisionLogFile: string;
  private auditFile: string;

  constructor() {
    this.logsDir = path.resolve(__dirname, "../../logs");
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    this.decisionLogFile = path.join(this.logsDir, `mli-decisions_${timestamp}.json`);
    this.auditFile = path.join(this.logsDir, `mli-audit_${timestamp}.json`);

    // Initialize files
    fs.writeFileSync(this.decisionLogFile, JSON.stringify({ decisions: [] }, null, 2));
    fs.writeFileSync(this.auditFile, JSON.stringify({ audits: [], summary: {} }, null, 2));
  }

  /**
   * Record an MLI decision when a trade signal is issued
   */
  recordDecision(
    entryId: string,
    symbol: string,
    result: MarketLeadershipResult
  ): MLIDecisionRecord {
    const record: MLIDecisionRecord = {
      entryId,
      timestamp: result.timestamp,
      symbol,
      indexSnapshot: result,
      prediction: {
        expectedDirection: result.direction,
        expectedAction: result.action,
        expectedConfidence: result.confidence,
      },
    };

    this.records.set(entryId, record);
    this.saveDecision(record);

    console.log(`\n📋 MLI DECISION RECORDED:`);
    console.log(`   Entry ID: ${entryId}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Index: ${result.marketLeadershipIndex}/100`);
    console.log(`   Action: ${result.action}`);
    console.log(`   Confidence: ${result.confidence}%`);

    return record;
  }

  /**
   * Record the actual trade execution (entry)
   */
  recordTradeEntry(
    entryId: string,
    direction: "LONG" | "SHORT",
    entryPrice: number,
    quantity: number
  ): void {
    const record = this.records.get(entryId);
    if (!record) {
      console.warn(`⚠️  Entry ID ${entryId} not found in MLI records`);
      return;
    }

    record.tradeEntry = {
      timestamp: new Date(),
      direction,
      entryPrice,
      quantity,
    };

    this.records.set(entryId, record);
    this.saveDecision(record);

    console.log(`\n✅ TRADE EXECUTED:`);
    console.log(`   Entry ID: ${entryId}`);
    console.log(`   ${direction} @ ${entryPrice}`);
    console.log(`   Qty: ${quantity}`);
  }

  /**
   * Record trade exit and analyze accuracy
   */
  recordTradeExit(
    entryId: string,
    exitPrice: number,
    pnlPercent: number,
    reason: "TP" | "SL" | "SIGNAL_CHANGE" | "MANUAL"
  ): MLIDecisionRecord | null {
    const record = this.records.get(entryId);
    if (!record) {
      console.warn(`⚠️  Entry ID ${entryId} not found`);
      return null;
    }

    record.tradeExit = {
      timestamp: new Date(),
      exitPrice,
      pnlPercent,
      reason,
    };

    // Analyze accuracy
    this.analyzeAccuracy(record);
    this.records.set(entryId, record);
    this.saveDecision(record);

    console.log(`\n📊 TRADE CLOSED:`);
    console.log(`   Exit: ${exitPrice} (${reason})`);
    console.log(`   P&L: ${pnlPercent.toFixed(2)}%`);

    return record;
  }

  /**
   * Analyze how accurate the MLI prediction was
   */
  private analyzeAccuracy(record: MLIDecisionRecord): void {
    if (!record.tradeEntry || !record.tradeExit) return;

    const { direction: tradeDir, entryPrice } = record.tradeEntry;
    const { exitPrice, pnlPercent } = record.tradeExit;
    const { expectedDirection, expectedAction } = record.prediction;

    // Determine actual market direction
    const actualDirection = exitPrice > entryPrice ? "BULLISH" : "BEARISH";

    // Build outcome
    record.outcome = {
      actualDirection: actualDirection as any,
      whatReallyHappened: `Entered ${tradeDir} @ ${entryPrice}, exited @ ${exitPrice}, P&L ${pnlPercent.toFixed(2)}%`,
      correctPredictions: [],
      incorrectPredictions: [],
      componentEvaluation: this.evaluateComponents(record),
    };

    // Check if main direction was correct
    if (expectedDirection === actualDirection) {
      record.outcome.correctPredictions.push(`Direction prediction: ${expectedDirection} ✓`);
    } else {
      record.outcome.incorrectPredictions.push(`Direction prediction: expected ${expectedDirection}, got ${actualDirection} ✗`);
    }

    // Check if action was appropriate
    if (
      (expectedAction === "ENTER" && pnlPercent > 0) ||
      (expectedAction === "ESPERAR" && Math.abs(pnlPercent) < 2) ||
      (expectedAction === "EVITAR" && pnlPercent < 0)
    ) {
      record.outcome.correctPredictions.push(`Action recommendation: ${expectedAction} was appropriate ✓`);
    } else {
      record.outcome.incorrectPredictions.push(
        `Action recommendation: ${expectedAction} led to ${pnlPercent.toFixed(2)}% result ✗`
      );
    }

    // Propose component adjustments
    this.proposeAdjustments(record);

    console.log(`\n🔍 ACCURACY ANALYSIS:`);
    console.log(`   Expected: ${expectedDirection}, Got: ${actualDirection}`);
    console.log(`   Correct: ${record.outcome.correctPredictions.length}`);
    console.log(`   Incorrect: ${record.outcome.incorrectPredictions.length}`);
  }

  /**
   * Evaluate which components were accurate
   */
  private evaluateComponents(record: MLIDecisionRecord): any[] {
    const { outcome, indexSnapshot } = record;
    if (!outcome || !indexSnapshot) return [];

    return indexSnapshot.components.map((comp) => {
      const wasAccurate =
        (outcome.actualDirection === "BULLISH" && comp.verdict === "BULLISH") ||
        (outcome.actualDirection === "BEARISH" && comp.verdict === "BEARISH") ||
        comp.verdict === "NEUTRAL";

      return {
        componentName: comp.name,
        wasAccurate,
        reasoning: `${comp.name} predicted ${comp.verdict}, market went ${outcome.actualDirection} → ${
          wasAccurate ? "✓" : "✗"
        }`,
      };
    });
  }

  /**
   * Propose weight adjustments based on accuracy
   */
  private proposeAdjustments(record: MLIDecisionRecord): void {
    if (!record.outcome) return;

    record.suggestedAdjustments = [];

    record.outcome.componentEvaluation.forEach((eval_) => {
      const component = record.indexSnapshot.components.find((c) => c.name === eval_.componentName);
      if (!component) return;

      if (eval_.wasAccurate && component.score > 70) {
        // This component is consistently accurate
        record.suggestedAdjustments!.push({
          componentName: eval_.componentName,
          currentWeight: component.weight,
          suggestedWeight: Math.min(component.weight * 1.1, 0.3), // Increase by 10%, max 30%
          confidence: 65,
          reasoning: `${eval_.componentName} was accurate in this trade (score ${component.score}/100). Consider +10% weight.`,
        });
      } else if (!eval_.wasAccurate && component.score < 40) {
        // This component is often wrong
        record.suggestedAdjustments!.push({
          componentName: eval_.componentName,
          currentWeight: component.weight,
          suggestedWeight: Math.max(component.weight * 0.8, 0.05), // Decrease by 20%, min 5%
          confidence: 45,
          reasoning: `${eval_.componentName} was inaccurate in this trade (score ${component.score}/100). Consider -20% weight.`,
        });
      }
    });
  }

  /**
   * Get summary of MLI accuracy
   */
  getSummary(): {
    totalDecisions: number;
    correctPredictions: number;
    accuracy: number;
    avgConfidence: number;
    suggestedAdjustments: any[];
  } {
    let correctCount = 0;
    let totalWithOutcome = 0;
    let confidenceSum = 0;
    const adjustments: any[] = [];

    this.records.forEach((record) => {
      confidenceSum += record.prediction.expectedConfidence;

      if (record.outcome) {
        totalWithOutcome++;
        if (record.outcome.correctPredictions.length > record.outcome.incorrectPredictions.length) {
          correctCount++;
        }
      }

      if (record.suggestedAdjustments) {
        adjustments.push(...record.suggestedAdjustments);
      }
    });

    return {
      totalDecisions: this.records.size,
      correctPredictions: correctCount,
      accuracy: totalWithOutcome > 0 ? (correctCount / totalWithOutcome) * 100 : 0,
      avgConfidence: this.records.size > 0 ? confidenceSum / this.records.size : 0,
      suggestedAdjustments: adjustments,
    };
  }

  private saveDecision(record: MLIDecisionRecord): void {
    const current = JSON.parse(fs.readFileSync(this.decisionLogFile, "utf-8"));
    current.decisions.push(record);
    fs.writeFileSync(this.decisionLogFile, JSON.stringify(current, null, 2));
  }

  private saveAudit(summary: any): void {
    const current = JSON.parse(fs.readFileSync(this.auditFile, "utf-8"));
    current.summary = summary;
    current.lastUpdate = new Date().toISOString();
    fs.writeFileSync(this.auditFile, JSON.stringify(current, null, 2));
  }

  /**
   * Print audit report
   */
  printAuditReport(): void {
    const summary = this.getSummary();

    console.log("\n╔════════════════════════════════════════════════════════════════╗");
    console.log("║      MARKET LEADERSHIP INDEX - AUDIT REPORT (Phase B)        ║");
    console.log("╚════════════════════════════════════════════════════════════════╝\n");

    console.log(`📊 SUMMARY:`);
    console.log(`   Total Decisions: ${summary.totalDecisions}`);
    console.log(`   Correct Predictions: ${summary.correctPredictions}`);
    console.log(`   Accuracy: ${summary.accuracy.toFixed(1)}%`);
    console.log(`   Avg Confidence: ${summary.avgConfidence.toFixed(1)}%\n`);

    if (summary.suggestedAdjustments.length > 0) {
      console.log(`💡 SUGGESTED WEIGHT ADJUSTMENTS:`);
      summary.suggestedAdjustments.forEach((adj) => {
        const change = (((adj.suggestedWeight || 0) - adj.currentWeight) / adj.currentWeight) * 100;
        console.log(
          `   ${adj.componentName}: ${(adj.currentWeight * 100).toFixed(1)}% → ${(
            (adj.suggestedWeight || 0) * 100
          ).toFixed(1)}% (${change > 0 ? "+" : ""}${change.toFixed(0)}%)`
        );
        console.log(`      Confidence: ${adj.confidence}% | Reason: ${adj.reasoning}`);
      });
    } else {
      console.log(`✓ NO ADJUSTMENTS NEEDED - Components performing well`);
    }

    this.saveAudit(summary);
  }
}

export default MLILearningIntegration;
