/**
 * Operations Director - Executive Summary Report
 *
 * Guardian as Director of Operations:
 * - What did we find? (Issues detected)
 * - What did we fix? (Corrections applied)
 * - What's pending? (Action items)
 * - Should we operate? (Go/No-Go decision)
 * - Confidence index (Trust score)
 *
 * ONE BUTTON. COMPLETE VISIBILITY.
 */

import { Injectable, Logger } from '@nestjs/common';

export interface OperationIssue {
  id: string;
  category: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  detectedAt: Date;
  provider?: string;
  impact: string;
  severity: number; // 1-10
}

export interface AppliedFix {
  id: string;
  type: 'auto_correction' | 'manual_intervention' | 'monitoring' | 'escalation';
  issue: OperationIssue;
  action: string;
  result: 'success' | 'partial' | 'pending' | 'failed';
  appliedAt: Date;
  notes?: string;
}

export interface PendingAction {
  id: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimatedEffort: string; // "5 min", "1 hour", "1 day"
  recommendedBy: string;
  targetCompletion?: Date;
}

export interface ConfidenceIndex {
  overall: number; // 0-100
  infrastructure: number; // API health, latency
  dataquality: number; // Freshness, accuracy
  resilience: number; // Fallback capacity, uptime
  knowledge: number; // Pattern detection, learning
  recommendation: 'PROCEED' | 'PROCEED_CAUTIOUS' | 'HOLD' | 'ESCALATE';
  reasoning: string;
}

export interface ExecutiveSummary {
  sessionDate: Date;
  operationsPeriod: { start: Date; end: Date };

  // Executive Section
  overallStatus: 'OPERATIONAL' | 'DEGRADED' | 'CRITICAL';
  confidenceIndex: ConfidenceIndex;
  recommendation: 'GO' | 'NO-GO' | 'GO_WITH_CAUTION';

  // What We Found
  issuesDetected: {
    critical: OperationIssue[];
    warnings: OperationIssue[];
    info: OperationIssue[];
  };

  // What We Fixed
  appliedFixes: AppliedFix[];
  autoCorrectionsSuccessRate: number; // %

  // What's Pending
  pendingActions: PendingAction[];
  blockers: string[];

  // Performance Metrics
  metrics: {
    systemUptime: number; // %
    averageLatency: number; // ms
    dataFreshness: number; // %
    incidentsDetected: number;
    incidentsResolved: number;
    autoCorrectionsExecuted: number;
  };

  // Insights
  insights: {
    patterns: string[];
    improvements: string[];
    risks: string[];
  };

  // Action Plan
  actionPlan: {
    immediate: PendingAction[]; // Today
    short_term: PendingAction[]; // This week
    long_term: PendingAction[]; // Planned
  };

  // Full Report
  fullReport: string; // Rich text narrative
}

@Injectable()
export class OperationsDirector {
  private readonly logger = new Logger(OperationsDirector.name);

  /**
   * EXECUTIVE SUMMARY REPORT
   * One-button complete visibility into platform operations
   *
   * This is what the operator reads every morning:
   * - Status
   * - Issues found
   * - Fixes applied
   * - What's pending
   * - Can we trade?
   * - Confidence score
   */
  async generateExecutiveSummary(
    sessionDate: Date,
    issues: OperationIssue[],
    fixes: AppliedFix[],
    pendingActions: PendingAction[],
    metrics: any,
    insights: any
  ): Promise<ExecutiveSummary> {
    this.logger.log('Director: Generating executive summary...');

    // Categorize issues
    const critical = issues.filter(i => i.category === 'critical');
    const warnings = issues.filter(i => i.category === 'warning');
    const info = issues.filter(i => i.category === 'info');

    // Determine overall status
    const overallStatus =
      critical.length > 0 ? 'CRITICAL' :
      warnings.length > 5 ? 'DEGRADED' :
      'OPERATIONAL';

    // Calculate confidence index
    const confidenceIndex = this.calculateConfidenceIndex(metrics, fixes, issues);

    // Determine recommendation
    const recommendation =
      confidenceIndex.recommendation === 'PROCEED' ? 'GO' :
      confidenceIndex.recommendation === 'PROCEED_CAUTIOUS' ? 'GO_WITH_CAUTION' :
      'NO-GO';

    // Calculate auto-correction success rate
    const successCount = fixes.filter(f => f.result === 'success').length;
    const autoCorrectionsSuccessRate = fixes.length > 0 ? (successCount / fixes.length) * 100 : 0;

    // Categorize pending actions
    const immediate = pendingActions.filter(a => a.priority === 'critical');
    const shortTerm = pendingActions.filter(a => a.priority === 'high');
    const longTerm = pendingActions.filter(a => ['medium', 'low'].includes(a.priority));

    // Generate narrative report
    const fullReport = this.generateNarrativeReport({
      overallStatus,
      confidenceIndex,
      issues,
      fixes,
      pendingActions,
      metrics,
      insights,
    });

    const summary: ExecutiveSummary = {
      sessionDate,
      operationsPeriod: {
        start: new Date(sessionDate.getTime() - 24 * 60 * 60 * 1000),
        end: sessionDate,
      },

      overallStatus,
      confidenceIndex,
      recommendation,

      issuesDetected: {
        critical,
        warnings,
        info,
      },

      appliedFixes: fixes,
      autoCorrectionsSuccessRate: Math.round(autoCorrectionsSuccessRate),

      pendingActions,
      blockers: critical.map(i => i.description),

      metrics,

      insights,

      actionPlan: {
        immediate,
        short_term: shortTerm,
        long_term: longTerm,
      },

      fullReport,
    };

    this.logger.log(`Director: Summary ready. Status: ${overallStatus}. Recommendation: ${recommendation}`);

    return summary;
  }

  /**
   * CALCULATE CONFIDENCE INDEX
   * Composite score: Infrastructure + Data Quality + Resilience + Knowledge
   */
  private calculateConfidenceIndex(
    metrics: any,
    fixes: AppliedFix[],
    issues: OperationIssue[]
  ): ConfidenceIndex {
    // Infrastructure score: uptime + latency
    const infrastructure = Math.max(0, 100 - (100 - metrics.systemUptime) * 2 - Math.min(metrics.averageLatency / 20, 10));

    // Data quality score: freshness
    const dataquality = metrics.dataFreshness || 80;

    // Resilience score: corrections applied + success rate
    const correctionRate = fixes.length > 0 ? (fixes.filter(f => f.result === 'success').length / fixes.length) * 100 : 100;
    const resilience = Math.min(100, correctionRate + (fixes.length > 0 ? 20 : 0));

    // Knowledge score: patterns detected + insights
    const knowledge = 70 + Math.min(issues.filter(i => i.category === 'info').length * 5, 20);

    // Overall
    const overall = (infrastructure + dataquality + resilience + knowledge) / 4;

    // Recommendation logic
    let recommendation: 'PROCEED' | 'PROCEED_CAUTIOUS' | 'HOLD' | 'ESCALATE';
    if (issues.filter(i => i.category === 'critical').length > 0) {
      recommendation = 'ESCALATE';
    } else if (overall < 70) {
      recommendation = 'HOLD';
    } else if (overall < 85) {
      recommendation = 'PROCEED_CAUTIOUS';
    } else {
      recommendation = 'PROCEED';
    }

    return {
      overall: Math.round(overall),
      infrastructure: Math.round(infrastructure),
      dataquality: Math.round(dataquality),
      resilience: Math.round(resilience),
      knowledge: Math.round(knowledge),
      recommendation,
      reasoning: this.generateConfidenceReasoning(overall, issues),
    };
  }

  private generateConfidenceReasoning(score: number, issues: OperationIssue[]): string {
    if (score >= 90) {
      return 'All systems operating normally. No concerns.';
    }
    if (score >= 75) {
      return `System operating but with ${issues.length} issues detected. Monitoring recommended.`;
    }
    if (score >= 60) {
      return `System degraded. ${issues.filter(i => i.category === 'critical').length} critical issues require attention.`;
    }
    return 'System critical. Operations should be suspended until resolved.';
  }

  /**
   * NARRATIVE REPORT
   * Rich text story of what happened and why
   */
  private generateNarrativeReport(data: any): string {
    let report = '';

    // Executive summary line
    report += `OPERATIONS REPORT - ${new Date().toLocaleDateString()}\n`;
    report += `Status: ${data.overallStatus} | Confidence: ${data.confidenceIndex.overall}% | Recommendation: ${data.confidenceIndex.reasoning}\n`;
    report += `\n`;

    // Issues Found
    if (data.issues.length > 0) {
      report += `ISSUES DETECTED (${data.issues.length}):\n`;
      data.critical.forEach((i: any) => {
        report += `  🔴 [CRITICAL] ${i.title}: ${i.description}\n`;
      });
      data.warnings.forEach((i: any) => {
        report += `  🟡 [WARNING] ${i.title}: ${i.description}\n`;
      });
      report += `\n`;
    }

    // Fixes Applied
    if (data.fixes.length > 0) {
      const successCount = data.fixes.filter((f: any) => f.result === 'success').length;
      report += `FIXES APPLIED (${successCount}/${data.fixes.length} successful):\n`;
      data.fixes.filter((f: any) => f.result === 'success').forEach((f: any) => {
        report += `  ✅ ${f.action}\n`;
      });
      report += `\n`;
    }

    // Pending Actions
    if (data.pendingActions.length > 0) {
      report += `PENDING ACTIONS:\n`;
      data.pendingActions.filter((p: any) => p.priority === 'critical').forEach((p: any) => {
        report += `  🔴 [CRITICAL] ${p.title} - Est: ${p.estimatedEffort}\n`;
      });
      data.pendingActions.filter((p: any) => p.priority === 'high').forEach((p: any) => {
        report += `  🟡 [HIGH] ${p.title} - Est: ${p.estimatedEffort}\n`;
      });
      report += `\n`;
    }

    // Metrics
    report += `METRICS:\n`;
    report += `  System Uptime: ${data.metrics.systemUptime}%\n`;
    report += `  Avg Latency: ${data.metrics.averageLatency}ms\n`;
    report += `  Data Freshness: ${data.metrics.dataFreshness}%\n`;
    report += `  Incidents Detected: ${data.metrics.incidentsDetected}\n`;
    report += `  Incidents Resolved: ${data.metrics.incidentsResolved}\n`;
    report += `\n`;

    // Insights
    if (data.insights.patterns.length > 0) {
      report += `PATTERNS & INSIGHTS:\n`;
      data.insights.patterns.forEach((p: string) => {
        report += `  • ${p}\n`;
      });
      report += `\n`;
    }

    // Recommendation
    report += `RECOMMENDATION:\n`;
    report += `  ${data.confidenceIndex.reasoning}\n`;
    report += `  Ready to operate: ${data.confidenceIndex.recommendation === 'PROCEED' ? '✅ YES' : '⚠️ WITH CAUTION'}\n`;

    return report;
  }

  /**
   * FORMAT FOR DISPLAY
   * Pretty-print the summary for the operator
   */
  formatForDisplay(summary: ExecutiveSummary): string {
    const lines: string[] = [];

    lines.push(`\n${'═'.repeat(80)}`);
    lines.push(`OPERATIONS DIRECTOR - DAILY REPORT`);
    lines.push(`${summary.sessionDate.toLocaleString()}`);
    lines.push(`${'═'.repeat(80)}\n`);

    // Status bar
    const statusEmoji = {
      OPERATIONAL: '🟢',
      DEGRADED: '🟡',
      CRITICAL: '🔴',
    }[summary.overallStatus];

    lines.push(`STATUS: ${statusEmoji} ${summary.overallStatus}`);
    lines.push(`CONFIDENCE: ${summary.confidenceIndex.overall}% (${summary.confidenceIndex.recommendation})`);
    lines.push(`RECOMMENDATION: ${summary.recommendation}\n`);

    // Issues
    if (summary.issuesDetected.critical.length > 0) {
      lines.push(`🔴 CRITICAL ISSUES (${summary.issuesDetected.critical.length}):`);
      summary.issuesDetected.critical.forEach(i => {
        lines.push(`   • ${i.title}: ${i.description}`);
      });
      lines.push('');
    }

    if (summary.issuesDetected.warnings.length > 0) {
      lines.push(`🟡 WARNINGS (${summary.issuesDetected.warnings.length}):`);
      summary.issuesDetected.warnings.slice(0, 3).forEach(i => {
        lines.push(`   • ${i.title}`);
      });
      if (summary.issuesDetected.warnings.length > 3) {
        lines.push(`   ... and ${summary.issuesDetected.warnings.length - 3} more`);
      }
      lines.push('');
    }

    // Fixes
    const successFixes = summary.appliedFixes.filter(f => f.result === 'success');
    if (successFixes.length > 0) {
      lines.push(`✅ FIXES APPLIED (${summary.autoCorrectionsSuccessRate}% success rate):`);
      successFixes.slice(0, 3).forEach(f => {
        lines.push(`   • ${f.action}`);
      });
      if (successFixes.length > 3) {
        lines.push(`   ... and ${successFixes.length - 3} more`);
      }
      lines.push('');
    }

    // Pending
    if (summary.pendingActions.length > 0) {
      lines.push(`📋 PENDING ACTIONS (${summary.pendingActions.length}):`);
      summary.actionPlan.immediate.forEach(a => {
        lines.push(`   🔴 [CRITICAL] ${a.title} (${a.estimatedEffort})`);
      });
      summary.actionPlan.short_term.forEach(a => {
        lines.push(`   🟡 [HIGH] ${a.title} (${a.estimatedEffort})`);
      });
      lines.push('');
    }

    // Metrics
    lines.push(`📊 METRICS:`);
    lines.push(`   Uptime: ${summary.metrics.systemUptime}% | Latency: ${summary.metrics.averageLatency}ms | Data Fresh: ${summary.metrics.dataFreshness}%`);
    lines.push('');

    // Final verdict
    lines.push(`${'─'.repeat(80)}`);
    lines.push(`VERDICT: ${summary.recommendation === 'GO' ? '✅ READY TO OPERATE' : summary.recommendation === 'GO_WITH_CAUTION' ? '⚠️ PROCEED WITH CAUTION' : '🔴 DO NOT OPERATE'}`);
    lines.push(`${'═'.repeat(80)}\n`);

    return lines.join('\n');
  }
}
