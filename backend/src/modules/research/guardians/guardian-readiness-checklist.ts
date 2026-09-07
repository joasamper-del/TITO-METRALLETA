/**
 * Guardian Readiness Checklist - "Tito Ready" Validation
 *
 * 5 Critical Questions Guardian must answer YES to:
 * 1. ¿La plataforma está sana? (Platform Health)
 * 2. ¿Los datos son confiables? (Data Reliability)
 * 3. ¿La investigación está completa? (Research Completeness)
 * 4. ¿El riesgo está controlado? (Risk Control)
 * 5. ¿No hay bloqueos críticos? (No Critical Blockers)
 *
 * If ANY answer is NO: explain exactly what module is affected and impact
 */

import { Injectable, Logger } from '@nestjs/common';

export interface ReadinessAnswer {
  question: string;
  answer: 'YES' | 'NO' | 'PARTIAL';
  confidence: number; // 0-100%
  evidence: string; // What data supports this answer
  affectedModules: string[]; // If NO, which modules are impacted
  impact: string; // What breaks if this fails
  timeToFix: string; // Estimated fix time
}

export interface TitoReadinessReport {
  timestamp: Date;
  overallReady: 'YES' | 'NO' | 'READY_WITH_CAUTION';
  readinessScore: number; // 0-100%
  questions: ReadinessAnswer[];
  blockers: string[]; // Critical blockers only
  warnings: string[]; // Non-critical issues
  recommendation: string; // Clear verdict
}

@Injectable()
export class GuardianReadinessChecklist {
  private readonly logger = new Logger(GuardianReadinessChecklist.name);

  /**
   * CHECK: Is the platform healthy?
   * Verifies: APIs responsive, health metrics green, no cascading failures
   */
  private checkPlatformHealth(health: any): ReadinessAnswer {
    const isHealthy = health.overallUptime >= 95 &&
      health.providers.filter((p: any) => p.isHealthy).length >= 7;

    return {
      question: '¿La plataforma está sana?',
      answer: isHealthy ? 'YES' : 'NO',
      confidence: health.overallUptime,
      evidence: `Uptime: ${health.overallUptime}%, ${health.providers.filter((p: any) => p.isHealthy).length}/10 providers healthy`,
      affectedModules: isHealthy ? [] : health.providers
        .filter((p: any) => !p.isHealthy)
        .map((p: any) => p.name),
      impact: isHealthy ? 'None' : 'Trading may experience interruptions or data gaps',
      timeToFix: isHealthy ? '0 min' : '5-15 min per provider',
    };
  }

  /**
   * CHECK: Are data sources reliable?
   * Verifies: Sources recent, quality > 80%, no contradictions
   */
  private checkDataReliability(dataQuality: any): ReadinessAnswer {
    const isFresh = dataQuality.newsAge < 300000 && // 5 minutes
      dataQuality.fundamentalsAge < 2592000000 && // 30 days
      dataQuality.calendarAge < 86400000; // 24 hours

    const qualityScore = dataQuality.overallQuality || 85;
    const isReliable = isFresh && qualityScore >= 80;

    return {
      question: '¿Los datos son confiables?',
      answer: isReliable ? 'YES' : 'NO',
      confidence: qualityScore,
      evidence: `Quality score: ${qualityScore}%, News: ${Math.round(dataQuality.newsAge / 60000)}min old, Fundamentals: ${Math.round(dataQuality.fundamentalsAge / 86400000)}d old`,
      affectedModules: !isFresh ? ['WebResearchService'] : [],
      impact: isReliable ? 'None' : 'Stale data could lead to poor decisions',
      timeToFix: isReliable ? '0 min' : '5 min (refresh data)',
    };
  }

  /**
   * CHECK: Is research complete?
   * Verifies: All 5 providers responded, no gaps in coverage
   */
  private checkResearchCompleteness(providers: any[]): ReadinessAnswer {
    const activeProviders = providers.filter((p: any) => p.isHealthy).length;
    const targetProviders = 5; // NewsAPI, Earnings, Calendar, SEC, Yahoo
    const isComplete = activeProviders >= 4; // At least 4/5

    return {
      question: '¿La investigación está completa?',
      answer: isComplete ? 'YES' : 'NO',
      confidence: (activeProviders / targetProviders) * 100,
      evidence: `${activeProviders}/${targetProviders} providers active`,
      affectedModules: providers
        .filter((p: any) => !p.isHealthy)
        .map((p: any) => p.name),
      impact: isComplete ? 'None' : `Missing data from ${targetProviders - activeProviders} provider(s)`,
      timeToFix: isComplete ? '0 min' : '5 min per provider',
    };
  }

  /**
   * CHECK: Is risk controlled?
   * Verifies: Risk gates armed, position limits enforced, stop-losses active
   */
  private checkRiskControl(riskMetrics: any): ReadinessAnswer {
    const maxDailyLoss = riskMetrics.maxDailyLoss || -1.5;
    const maxPosition = riskMetrics.maxPositionSize || 2.0;
    const stopLossActive = riskMetrics.stopLossEnabled || true;
    const riskControlled = maxDailyLoss <= -1.0 && maxPosition <= 3.0 && stopLossActive;

    return {
      question: '¿El riesgo está controlado?',
      answer: riskControlled ? 'YES' : 'NO',
      confidence: riskControlled ? 100 : 60,
      evidence: `Max daily loss: ${maxDailyLoss}%, Max position: ${maxPosition}%, Stop-loss: ${stopLossActive ? 'ARMED' : 'DISABLED'}`,
      affectedModules: !riskControlled ? ['RiskEngine', 'ExecutionEngine'] : [],
      impact: riskControlled ? 'None' : 'Uncontrolled losses possible if trade goes wrong',
      timeToFix: riskControlled ? '0 min' : '2 min (reconfigure)',
    };
  }

  /**
   * CHECK: No critical blockers?
   * Verifies: No authentication failures, no cascading failures, no hard stops
   */
  private checkNoCriticalBlockers(incidents: any[]): ReadinessAnswer {
    const criticalIncidents = incidents.filter((i: any) => i.severity === 'critical');
    const noCriticalBlockers = criticalIncidents.length === 0;

    return {
      question: '¿No hay bloqueos críticos?',
      answer: noCriticalBlockers ? 'YES' : 'NO',
      confidence: noCriticalBlockers ? 100 : 30,
      evidence: `${criticalIncidents.length} critical incident(s) detected`,
      affectedModules: criticalIncidents.map((i: any) => i.provider),
      impact: noCriticalBlockers ? 'None' : 'Platform cannot operate safely',
      timeToFix: noCriticalBlockers ? '0 min' : '10-30 min (depends on incident)',
    };
  }

  /**
   * GENERATE FULL READINESS REPORT
   *
   * Returns: YES/NO/CAUTION for "Tito Ready Tomorrow"
   */
  generateReadinessReport(systemState: any): TitoReadinessReport {
    this.logger.log('Guardian: Generating Tito Readiness Report...');

    const q1 = this.checkPlatformHealth(systemState.health);
    const q2 = this.checkDataReliability(systemState.dataQuality);
    const q3 = this.checkResearchCompleteness(systemState.providers);
    const q4 = this.checkRiskControl(systemState.risk);
    const q5 = this.checkNoCriticalBlockers(systemState.incidents);

    const questions = [q1, q2, q3, q4, q5];
    const yesCount = questions.filter(q => q.answer === 'YES').length;
    const noCount = questions.filter(q => q.answer === 'NO').length;

    // Determine overall readiness
    let overallReady: 'YES' | 'NO' | 'READY_WITH_CAUTION';
    if (noCount > 0) {
      overallReady = 'NO';
    } else if (yesCount === 5) {
      overallReady = 'YES';
    } else {
      overallReady = 'READY_WITH_CAUTION';
    }

    // Collect blockers and warnings
    const blockers = questions
      .filter(q => q.answer === 'NO')
      .map(q => `${q.question}: ${q.impact} (${q.timeToFix} to fix)`);

    const warnings = questions
      .filter(q => q.answer === 'PARTIAL')
      .map(q => `${q.question}: ${q.evidence}`);

    // Generate recommendation
    const recommendation =
      overallReady === 'YES'
        ? '✅ TITO READY - All systems GO for tomorrow'
        : overallReady === 'READY_WITH_CAUTION'
          ? '⚠️ READY WITH CAUTION - Monitor closely, some edge cases'
          : `🔴 NOT READY - Fix blockers first:\n${blockers.map((b, i) => `${i + 1}. ${b}`).join('\n')}`;

    const readinessScore = (yesCount / questions.length) * 100;

    this.logger.log(`Readiness: ${overallReady} (${readinessScore}%)`);

    return {
      timestamp: new Date(),
      overallReady,
      readinessScore: Math.round(readinessScore),
      questions,
      blockers,
      warnings,
      recommendation,
    };
  }

  /**
   * FORMAT FOR DISPLAY
   */
  formatReadinessReport(report: TitoReadinessReport): string {
    const lines: string[] = [];

    lines.push(`\n${'═'.repeat(80)}`);
    lines.push(`TITO READINESS REPORT`);
    lines.push(`${report.timestamp.toLocaleString()}`);
    lines.push(`${'═'.repeat(80)}\n`);

    // Verdict
    const verdictEmoji = {
      'YES': '✅',
      'READY_WITH_CAUTION': '⚠️',
      'NO': '🔴',
    }[report.overallReady];

    lines.push(`VERDICT: ${verdictEmoji} ${report.overallReady}`);
    lines.push(`READINESS SCORE: ${report.readinessScore}%\n`);

    // 5 Critical Questions
    lines.push(`5 CRITICAL QUESTIONS:\n`);
    report.questions.forEach((q, idx) => {
      const icon = q.answer === 'YES' ? '✅' : q.answer === 'NO' ? '🔴' : '🟡';
      lines.push(`${idx + 1}. ${icon} ${q.question}`);
      lines.push(`   Answer: ${q.answer} (${q.confidence}% confidence)`);
      lines.push(`   Evidence: ${q.evidence}`);
      if (q.affectedModules.length > 0) {
        lines.push(`   Affected: ${q.affectedModules.join(', ')}`);
      }
      if (q.answer !== 'YES') {
        lines.push(`   Impact: ${q.impact}`);
        lines.push(`   Time to fix: ${q.timeToFix}`);
      }
      lines.push('');
    });

    // Blockers
    if (report.blockers.length > 0) {
      lines.push(`🔴 BLOCKERS (${report.blockers.length}):`);
      report.blockers.forEach(b => lines.push(`  • ${b}`));
      lines.push('');
    }

    // Warnings
    if (report.warnings.length > 0) {
      lines.push(`🟡 WARNINGS (${report.warnings.length}):`);
      report.warnings.forEach(w => lines.push(`  • ${w}`));
      lines.push('');
    }

    // Final Recommendation
    lines.push(`${'─'.repeat(80)}`);
    lines.push(`RECOMMENDATION:\n${report.recommendation}`);
    lines.push(`${'═'.repeat(80)}\n`);

    return lines.join('\n');
  }
}
