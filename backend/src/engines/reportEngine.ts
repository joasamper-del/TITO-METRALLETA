import { AnalysisResult, OpportunityReport, OperationPlan, TradeResult } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ReportEngine {
  /**
   * Genera un reporte de oportunidad a partir del análisis
   */
  generateReport(
    analysis: AnalysisResult,
    strategy: string,
    plan: OperationPlan
  ): OpportunityReport {
    return {
      id: this.generateId(),
      symbol: analysis.symbol,
      strategy,
      state: analysis.decision,
      confidence: analysis.confidence,
      risk: analysis.riskLevel,
      mainReasons: analysis.mainReasons,
      invalidationConditions: analysis.invalidationConditions,
      plan: {
        entry: plan.entry,
        target: plan.target,
        stop: plan.stop,
        notes: plan.notes || '',
      },
      analysis,
      createdAt: new Date(),
    };
  }

  /**
   * Genera un reporte de revisión manual cuando faltan datos
   */
  generateManualReviewReport(
    symbol: string,
    strategy: string,
    missingData: string[]
  ): OpportunityReport {
    return {
      id: this.generateId(),
      symbol,
      strategy,
      state: 'esperar',
      confidence: 0,
      risk: 'alto',
      mainReasons: ['Revisión manual requerida'],
      invalidationConditions: missingData,
      plan: {
        entry: null,
        target: null,
        stop: null,
        notes: `Revisión manual requerida. Datos faltantes: ${missingData.join(', ')}`,
      },
      analysis: null as any,
      createdAt: new Date(),
    };
  }

  /**
   * Formatea el reporte para mostrar en consola o interfaz
   */
  formatReportForDisplay(report: OpportunityReport): string {
    const separator = '═══════════════════════════════════════════════════';
    const lines: string[] = [
      separator,
      `📊 REPORTE TITO METRALLETA - ${report.symbol}`,
      separator,
      '',
      `🎯 DECISIÓN FINAL: ${this.formatDecision(report.state)}`,
      `📈 Confianza: ${report.confidence.toFixed(0)}%`,
      `⚠️  Riesgo: ${this.formatRisk(report.risk)}`,
      '',
      `📋 ESTRATEGIA: ${report.strategy}`,
      '',
      `✅ RAZONES PRINCIPALES:`,
      ...report.mainReasons.map((r) => `   • ${r}`),
      '',
      `❌ CONDICIONES DE INVALIDACIÓN:`,
      ...report.invalidationConditions.map((c) => `   • ${c}`),
      '',
      `📍 PLAN:`,
      `   Entrada: ${this.formatPrice(report.plan.entry)}`,
      `   Objetivo: ${this.formatPrice(report.plan.target)}`,
      `   Stop: ${this.formatPrice(report.plan.stop)}`,
    ];

    if (report.plan.notes) {
      lines.push(`   Notas: ${report.plan.notes}`);
    }

    if (report.analysis?.manualReviewNeeded) {
      lines.push('');
      lines.push(`⚠️  REVISIÓN MANUAL REQUERIDA:`);
      lines.push(
        ...report.analysis.manualReviewReasons.map((r) => `   • ${r}`)
      );
    }

    lines.push('');
    lines.push(separator);

    return lines.join('\n');
  }

  /**
   * Registra el resultado de una operación paper
   */
  recordTradeResult(
    report: OpportunityReport,
    result: 'ganancia' | 'pérdida',
    successReasons: string[] = [],
    failureReasons: string[] = [],
    lessons: string[] = []
  ): TradeResult {
    const tradeResult: TradeResult = {
      reportId: report.id,
      symbol: report.symbol,
      result,
      points: report.confidence,
      successReasons,
      failureReasons,
      lessons,
      recordedAt: new Date(),
    };

    // Actualiza el reporte con el resultado
    report.result = result;
    report.points = report.confidence;
    report.successReasons = successReasons;
    report.failureReasons = failureReasons;
    report.lessons = lessons;

    return tradeResult;
  }

  /**
   * Genera estadísticas de rendimiento a partir de resultados
   */
  generatePerformanceStats(results: TradeResult[]) {
    if (results.length === 0) {
      return {
        totalTrades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        avgPointsPerWin: 0,
        avgPointsPerLoss: 0,
        bestTrade: null,
        worstTrade: null,
      };
    }

    const wins = results.filter((r) => r.result === 'ganancia');
    const losses = results.filter((r) => r.result === 'pérdida');

    const avgPointsWin =
      wins.length > 0
        ? wins.reduce((sum, r) => sum + (r.points || 0), 0) / wins.length
        : 0;

    const avgPointsLoss =
      losses.length > 0
        ? losses.reduce((sum, r) => sum + (r.points || 0), 0) / losses.length
        : 0;

    const bestTrade = results.reduce((best, current) =>
      (current.points || 0) > (best.points || 0) ? current : best
    );

    const worstTrade = results.reduce((worst, current) =>
      (current.points || 0) < (worst.points || 0) ? current : worst
    );

    return {
      totalTrades: results.length,
      wins: wins.length,
      losses: losses.length,
      winRate: ((wins.length / results.length) * 100).toFixed(2) + '%',
      avgPointsPerWin: avgPointsWin.toFixed(2),
      avgPointsPerLoss: avgPointsLoss.toFixed(2),
      bestTrade,
      worstTrade,
    };
  }

  /**
   * Analiza qué reglas funcionan mejor
   */
  analyzeRuleEffectiveness(reports: OpportunityReport[]): Map<string, { successes: number; failures: number; effectivenessRate: number }> {
    const ruleStats = new Map<string, { successes: number; failures: number }>();

    for (const report of reports) {
      if (!report.analysis) continue;

      for (const evaluation of report.analysis.ruleEvaluations) {
        if (!ruleStats.has(evaluation.ruleId)) {
          ruleStats.set(evaluation.ruleId, { successes: 0, failures: 0 });
        }

        const stats = ruleStats.get(evaluation.ruleId)!;
        if (report.result === 'ganancia' && evaluation.passed) {
          stats.successes++;
        } else if (report.result === 'pérdida' && !evaluation.passed) {
          stats.failures++;
        }
      }
    }

    // Convierte a porcentaje de efectividad
    const effectiveness = new Map<
      string,
      { successes: number; failures: number; effectivenessRate: number }
    >();

    for (const [ruleId, stats] of ruleStats) {
      const total = stats.successes + stats.failures;
      const rate = total > 0 ? (stats.successes / total) * 100 : 0;
      effectiveness.set(ruleId, {
        successes: stats.successes,
        failures: stats.failures,
        effectivenessRate: parseFloat(rate.toFixed(2)),
      });
    }

    return effectiveness;
  }

  /**
   * Genera un ID único para el reporte
   */
  private generateId(): string {
    return `TM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private formatDecision(decision: string): string {
    const emojis: Record<string, string> = {
      operar: '✅ OPERAR',
      esperar: '⏳ ESPERAR',
      no_operar: '❌ NO OPERAR',
    };
    return emojis[decision] || decision;
  }

  private formatRisk(risk: string): string {
    const labels: Record<string, string> = {
      bajo: '🟢 Bajo',
      medio: '🟡 Medio',
      alto: '🔴 Alto',
    };
    return labels[risk] || risk;
  }

  private formatPrice(price: number | null): string {
    return price !== null ? `$${price.toFixed(2)}` : 'No definido';
  }
}
