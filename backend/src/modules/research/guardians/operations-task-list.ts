/**
 * Operations Task List - Daily Prioritized Actions
 *
 * Guardian generates a prioritized task list so operator doesn't need to think
 *
 * Categories:
 * - CRITICAL: Must resolve before operating
 * - IMPORTANT: Should resolve today
 * - RECOMMENDED: Nice to have, can wait
 */

import { Injectable, Logger } from '@nestjs/common';

export interface OperationTask {
  id: string;
  priority: 'CRITICAL' | 'IMPORTANT' | 'RECOMMENDED';
  title: string;
  description: string;
  reason: string; // Why this matters
  estimatedEffort: string; // "5 min", "1 hour", "next week"
  action: string; // What to do
  blocker: boolean; // Does this block trading?
  impact: string; // What improves if fixed
}

export interface TaskList {
  generatedAt: Date;
  critical: OperationTask[];
  important: OperationTask[];
  recommended: OperationTask[];
  summary: string; // One-line summary for busy operator
}

@Injectable()
export class OperationsTaskList {
  private readonly logger = new Logger(OperationsTaskList.name);

  /**
   * GENERATE PRIORITIZED TASK LIST
   *
   * Takes incidents, patterns, and system state
   * Returns: What to do today, in priority order
   */
  generateTaskList(
    incidents: any[],
    patterns: any[],
    metrics: any,
    confidence: number
  ): TaskList {
    this.logger.log('Guardian: Generating prioritized task list...');

    const critical: OperationTask[] = [];
    const important: OperationTask[] = [];
    const recommended: OperationTask[] = [];

    // CRITICAL: Blockers that prevent trading
    if (confidence < 70) {
      critical.push({
        id: 'task-conf-low',
        priority: 'CRITICAL',
        title: 'Investigate low confidence score',
        description: `Confidence at ${confidence}%. Need to identify root cause.`,
        reason: 'System not ready to operate at this confidence level',
        estimatedEffort: '15-30 min',
        action: 'Review health report and fix blockers',
        blocker: true,
        impact: 'Confidence will increase to ≥80%',
      });
    }

    // CRITICAL: Missing provider data
    const missingProviders = this.identifyMissingProviders(metrics);
    missingProviders.forEach((provider, idx) => {
      critical.push({
        id: `task-provider-${idx}`,
        priority: 'CRITICAL',
        title: `Restore ${provider.name} data`,
        description: `${provider.name} offline or stale for ${provider.duration}`,
        reason: 'Missing critical data source for trading context',
        estimatedEffort: provider.fixTime,
        action: `Check ${provider.name} status and reconnect`,
        blocker: true,
        impact: `${provider.name} data will be fresh and available`,
      });
    });

    // IMPORTANT: High-frequency incidents
    patterns
      .filter((p: any) => p.frequency >= 3)
      .forEach((pattern: any, idx: number) => {
        important.push({
          id: `task-pattern-${idx}`,
          priority: 'IMPORTANT',
          title: `Reduce ${pattern.pattern}`,
          description: pattern.pattern,
          reason: `Occurred ${pattern.frequency}x in 24h - recurring issue`,
          estimatedEffort: '1-2 hours',
          action: pattern.suggestedSolution,
          blocker: false,
          impact: 'System stability will improve, fewer interruptions',
        });
      });

    // IMPORTANT: API limits approaching
    this.identifyRateLimitRisks(metrics).forEach((risk: any, idx: number) => {
      important.push({
        id: `task-ratelimit-${idx}`,
        priority: 'IMPORTANT',
        title: `Upgrade ${risk.provider} API plan`,
        description: `Approaching rate limit: ${risk.remaining} requests remaining today`,
        reason: 'Provider could cut off mid-session if limits hit',
        estimatedEffort: 'Upgrade: 5 min + restart services: 10 min',
        action: `Upgrade ${risk.provider} API plan or add fallback`,
        blocker: false,
        impact: 'Rate limit pressure removed for tomorrow',
      });
    });

    // RECOMMENDED: Optimizations
    if (confidence >= 80 && confidence < 95) {
      recommended.push({
        id: 'task-optimize-cache',
        priority: 'RECOMMENDED',
        title: 'Cache optimization',
        description: 'Enable caching for frequently accessed data',
        reason: 'Would reduce latency by ~10-15%',
        estimatedEffort: '30 min',
        action: 'Enable Redis caching for provider responses',
        blocker: false,
        impact: 'Response times will drop, system feels snappier',
      });
    }

    if (metrics.averageLatency > 400) {
      recommended.push({
        id: 'task-network-optimize',
        priority: 'RECOMMENDED',
        title: 'Network optimization',
        description: `Current latency: ${metrics.averageLatency}ms (target: <250ms)`,
        reason: 'Better latency = faster execution',
        estimatedEffort: '2-3 hours',
        action: 'Review network routes and CDN configuration',
        blocker: false,
        impact: 'Latency will improve to <250ms',
      });
    }

    // Generate summary
    const summary =
      critical.length > 0
        ? `🔴 ${critical.length} CRITICAL: Fix before operating`
        : important.length > 0
          ? `🟡 ${important.length} IMPORTANT: Address today`
          : `✅ Green. ${recommended.length} optional improvements available`;

    this.logger.log(`Task list ready: ${summary}`);

    return {
      generatedAt: new Date(),
      critical,
      important,
      recommended,
      summary,
    };
  }

  /**
   * FORMAT FOR DISPLAY
   * Pretty-print task list for operator
   */
  formatForDisplay(taskList: TaskList): string {
    const lines: string[] = [];

    lines.push(`\n${'═'.repeat(80)}`);
    lines.push(`GUARDIAN - TODAY'S TASK LIST`);
    lines.push(`${taskList.generatedAt.toLocaleTimeString()}`);
    lines.push(`${taskList.summary}`);
    lines.push(`${'═'.repeat(80)}\n`);

    if (taskList.critical.length > 0) {
      lines.push(`🔴 CRITICAL (${taskList.critical.length}) - MUST FIX:`);
      taskList.critical.forEach((task, idx) => {
        lines.push(`\n${idx + 1}. ${task.title}`);
        lines.push(`   Why: ${task.reason}`);
        lines.push(`   Do this: ${task.action}`);
        lines.push(`   Time: ${task.estimatedEffort}`);
        lines.push(`   Benefit: ${task.impact}`);
      });
      lines.push('\n');
    }

    if (taskList.important.length > 0) {
      lines.push(`🟡 IMPORTANT (${taskList.important.length}) - TODAY:`);
      taskList.important.forEach((task, idx) => {
        lines.push(`\n${idx + 1}. ${task.title} (${task.estimatedEffort})`);
        lines.push(`   → ${task.action}`);
      });
      lines.push('\n');
    }

    if (taskList.recommended.length > 0) {
      lines.push(`💡 RECOMMENDED (${taskList.recommended.length}) - OPTIONAL:`);
      taskList.recommended.forEach((task, idx) => {
        lines.push(`${idx + 1}. ${task.title} (${task.estimatedEffort})`);
      });
      lines.push('\n');
    }

    lines.push(`${'─'.repeat(80)}`);
    lines.push(`OPERATOR FOCUS: Resolve CRITICAL first, then IMPORTANT`);
    lines.push(`${'═'.repeat(80)}\n`);

    return lines.join('\n');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HELPERS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private identifyMissingProviders(metrics: any): any[] {
    const missing: any[] = [];

    // Check each provider's freshness
    if (metrics.newsLatency > 300000) {
      // 5 minutes
      missing.push({
        name: 'NewsAPI',
        duration: '> 5 minutes',
        fixTime: '5 min (restart service)',
      });
    }

    if (metrics.calendarOutdated) {
      missing.push({
        name: 'Economic Calendar',
        duration: '> 24 hours',
        fixTime: '1 min (refresh)',
      });
    }

    if (metrics.fundamentalsStale) {
      missing.push({
        name: 'Fundamentals',
        duration: '> 30 days',
        fixTime: '10 min (fetch latest)',
      });
    }

    return missing;
  }

  private identifyRateLimitRisks(metrics: any): any[] {
    const risks: any[] = [];

    if (metrics.newsAPIRemaining && metrics.newsAPIRemaining < 20) {
      risks.push({
        provider: 'NewsAPI',
        remaining: metrics.newsAPIRemaining,
        limit: 100,
        riskLevel: 'high',
      });
    }

    return risks;
  }
}
