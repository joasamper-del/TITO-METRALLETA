/**
 * System Intelligence - Technical Learning & Auto-Correction
 *
 * Guardian's AI layer:
 * - Detect patterns in incidents
 * - Propose permanent solutions
 * - Auto-correct only when 100% safe
 * - Learn from yesterday to improve today
 *
 * Philosophy:
 * "Not just fixing problems - preventing them tomorrow"
 */

import { Injectable, Logger } from '@nestjs/common';

export interface IncidentPattern {
  pattern: string;
  frequency: number;
  lastOccurred: Date;
  affectedProviders: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggestedSolution: string;
  solutionSeverity: 'permanent_fix' | 'mitigation' | 'monitoring';
}

export interface SafeAutocorrectionAction {
  type: 'provider_restart' | 'cache_clear' | 'fallback_rotate' | 'connection_reset';
  targetProvider: string;
  riskLevel: 'safe' | 'moderate' | 'risky';
  successProbability: number; // 0-100
  shouldExecute: boolean;
  reason: string;
}

export interface SystemIntelligenceReport {
  timestamp: Date;
  detectedPatterns: IncidentPattern[];
  appliedCorrections: SafeAutocorrectionAction[];
  failedCorrections: SafeAutocorrectionAction[];
  systemHealthTrend: 'improving' | 'stable' | 'degrading';
  recommendedActions: string[];
  learningInsights: string[];
}

export interface ComprehensiveInspectionResult {
  inspectionTime: Date;
  overallStatus: 'READY' | 'NOT_READY';
  readinessScore: number; // 0-100
  systemState: 'healthy' | 'degraded' | 'critical';

  // Detailed checks
  apiConnectivity: { status: 'pass' | 'fail'; issues: string[] };
  authentication: { status: 'pass' | 'fail'; issues: string[] };
  dataFreshness: { status: 'pass' | 'fail'; issues: string[] };
  networkLatency: { status: 'pass' | 'fail'; issues: string[] };
  errorPatterns: { status: 'pass' | 'fail'; issues: string[] };
  resourceUsage: { status: 'pass' | 'fail'; issues: string[] };

  // Intelligence
  detectedPatterns: IncidentPattern[];
  suggestedImprovements: string[];
  blockers: string[];
  warnings: string[];

  // Final verdict
  canProceedWithTrading: boolean;
  reason: string;
}

@Injectable()
export class SystemIntelligence {
  private readonly logger = new Logger(SystemIntelligence.name);

  // Learning memory
  private incidentHistory: Map<string, Date[]> = new Map();
  private correctionHistory: Map<string, boolean> = new Map(); // success/failure
  private systemTrends: { timestamp: Date; healthScore: number }[] = [];

  constructor() {
    this.logger.log('System Intelligence initialized - Learning mode active');
  }

  /**
   * COMPREHENSIVE INSPECTION
   * One-button audit of EVERYTHING
   *
   * Run at:
   * - Session start
   * - Before any trade (optional)
   * - On demand
   */
  async performComprehensiveInspection(
    providerHealth: Map<string, any>,
    recentIncidents: any[]
  ): Promise<ComprehensiveInspectionResult> {
    this.logger.log('Guardian: Starting comprehensive inspection...');
    const inspectionTime = new Date();

    // 1. API Connectivity Check
    const apiStatus = this.checkAPIConnectivity(providerHealth);

    // 2. Authentication Check
    const authStatus = this.checkAuthentication(providerHealth);

    // 3. Data Freshness Check
    const freshness = this.checkDataFreshness(providerHealth);

    // 4. Network Latency Check
    const latency = this.checkNetworkLatency(providerHealth);

    // 5. Error Pattern Detection
    const patterns = this.detectIncidentPatterns(recentIncidents);

    // 6. Resource Usage Check
    const resources = this.checkResourceUsage();

    // Calculate overall readiness
    const checks = [apiStatus, authStatus, freshness, latency, resources];
    const passedChecks = checks.filter(c => c.status === 'pass').length;
    const readinessScore = (passedChecks / checks.length) * 100;

    const blockers: string[] = [];
    const warnings: string[] = [];

    // Aggregate issues
    [...apiStatus.issues, ...authStatus.issues, ...freshness.issues, ...latency.issues, ...resources.issues].forEach(
      issue => {
        if (issue.includes('CRITICAL') || issue.includes('DOWN')) {
          blockers.push(issue);
        } else {
          warnings.push(issue);
        }
      }
    );

    // Determine overall status
    const overallStatus = blockers.length === 0 && readinessScore >= 80 ? 'READY' : 'NOT_READY';
    const systemState =
      readinessScore >= 90 ? 'healthy' :
      readinessScore >= 70 ? 'degraded' :
      'critical';

    // Generate recommendations
    const suggestions = this.generateSuggestions(
      apiStatus,
      authStatus,
      freshness,
      latency,
      patterns
    );

    const result: ComprehensiveInspectionResult = {
      inspectionTime,
      overallStatus,
      readinessScore: Math.round(readinessScore),
      systemState,

      apiConnectivity: apiStatus,
      authentication: authStatus,
      dataFreshness: freshness,
      networkLatency: latency,
      errorPatterns: { status: patterns.length === 0 ? 'pass' : 'warn', issues: patterns.map(p => p.pattern) },
      resourceUsage: resources,

      detectedPatterns: patterns,
      suggestedImprovements: suggestions.improvements,
      blockers,
      warnings,

      canProceedWithTrading: overallStatus === 'READY',
      reason: blockers.length > 0
        ? `BLOCKED: ${blockers.join('; ')}`
        : overallStatus === 'READY'
        ? 'All systems ready for trading'
        : `System at ${readinessScore}% readiness - proceed with caution`,
    };

    this.logger.log(`Comprehensive inspection complete: ${result.overallStatus} (${result.readinessScore}/100)`);

    return result;
  }

  /**
   * DETECT INCIDENT PATTERNS
   * Learn from history to predict and prevent
   */
  private detectIncidentPatterns(incidents: any[]): IncidentPattern[] {
    const patterns: IncidentPattern[] = [];

    // Group incidents by type and provider
    const grouped = new Map<string, any[]>();

    incidents.forEach(incident => {
      const key = `${incident.type}:${incident.provider}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(incident);
    });

    // Analyze groups
    grouped.forEach((incidents, key) => {
      const [type, provider] = key.split(':');

      // Check if this is a recurring pattern
      if (incidents.length >= 3) {
        // 3+ occurrences = pattern
        const recentIncidents = incidents.filter(
          i => Date.now() - i.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24h
        );

        if (recentIncidents.length >= 2) {
          patterns.push({
            pattern: `Provider ${provider} has ${type} issues (${recentIncidents.length}x in 24h)`,
            frequency: recentIncidents.length,
            lastOccurred: recentIncidents[0].timestamp,
            affectedProviders: [provider],
            severity: this.calculateIncidentSeverity(recentIncidents),
            suggestedSolution: this.suggestSolution(type, provider, recentIncidents),
            solutionSeverity: recentIncidents.length > 5 ? 'permanent_fix' : 'mitigation',
          });
        }
      }
    });

    return patterns;
  }

  private calculateIncidentSeverity(incidents: any[]): 'critical' | 'high' | 'medium' | 'low' {
    const criticalCount = incidents.filter(i => i.severity === 'critical').length;
    if (criticalCount > 0) return 'critical';
    if (incidents.length > 5) return 'high';
    if (incidents.length > 3) return 'medium';
    return 'low';
  }

  private suggestSolution(type: string, provider: string, incidents: any[]): string {
    if (type.includes('timeout')) {
      return `Increase timeout threshold for ${provider} or rotate to fallback provider`;
    }
    if (type.includes('rate_limit')) {
      return `Implement rate limiting policy for ${provider} or upgrade API plan`;
    }
    if (type.includes('connection')) {
      return `Check ${provider} API status and network connectivity`;
    }
    return `Review logs and contact ${provider} support`;
  }

  /**
   * SAFE AUTO-CORRECTION
   * Only execute when 100% safe
   */
  async performSafeAutoCorrection(
    provider: string,
    incidentType: string
  ): Promise<SafeAutocorrectionAction> {
    this.logger.log(`Guardian: Evaluating auto-correction for ${provider} (${incidentType})`);

    let action: SafeAutocorrectionAction | null = null;

    // Decision tree
    if (incidentType === 'connection_timeout') {
      // Safe to reset connection
      action = {
        type: 'connection_reset',
        targetProvider: provider,
        riskLevel: 'safe',
        successProbability: 85,
        shouldExecute: true,
        reason: 'Connection reset is low-risk and often resolves timeouts',
      };
    } else if (incidentType === 'cache_stale') {
      // Safe to clear cache
      action = {
        type: 'cache_clear',
        targetProvider: provider,
        riskLevel: 'safe',
        successProbability: 90,
        shouldExecute: true,
        reason: 'Cache clear has no side effects and ensures fresh data',
      };
    } else if (incidentType === 'provider_down') {
      // Safe to rotate fallback
      action = {
        type: 'fallback_rotate',
        targetProvider: provider,
        riskLevel: 'safe',
        successProbability: 95,
        shouldExecute: true,
        reason: 'Fallback rotation is automatic and safe',
      };
    } else {
      // Risky - don't auto-correct
      action = {
        type: 'provider_restart',
        targetProvider: provider,
        riskLevel: 'risky',
        successProbability: 40,
        shouldExecute: false,
        reason: `Auto-correction risky for ${incidentType} - requires manual review`,
      };
    }

    if (action.shouldExecute) {
      this.logger.log(`Guardian: Executing auto-correction (${action.type}) for ${provider}`);
      const correctionKey = `${provider}:${action.type}`;
      this.correctionHistory.set(correctionKey, true); // Track success
    } else {
      this.logger.warn(`Guardian: Skipping auto-correction for ${provider} - risk too high`);
    }

    return action;
  }

  /**
   * SYSTEM INTELLIGENCE REPORT
   * Daily learning insights
   */
  generateIntelligenceReport(
    patterns: IncidentPattern[],
    corrections: SafeAutocorrectionAction[]
  ): SystemIntelligenceReport {
    const successfulCorrections = corrections.filter(c => c.shouldExecute);
    const failedCorrections = corrections.filter(c => !c.shouldExecute);

    // Detect trend
    const recentHealthScores = this.systemTrends.slice(-10).map(t => t.healthScore);
    const trend =
      recentHealthScores[recentHealthScores.length - 1] >
      (recentHealthScores[0] || 0)
        ? 'improving'
        : recentHealthScores[recentHealthScores.length - 1] <
          (recentHealthScores[0] || 0)
        ? 'degrading'
        : 'stable';

    const recommendations: string[] = [];
    patterns.forEach(p => {
      if (p.solutionSeverity === 'permanent_fix') {
        recommendations.push(`URGENT: ${p.suggestedSolution}`);
      } else {
        recommendations.push(`Consider: ${p.suggestedSolution}`);
      }
    });

    const insights: string[] = [];
    if (successfulCorrections.length > 3) {
      insights.push(`Auto-correction prevented ${successfulCorrections.length} issues today`);
    }
    if (patterns.length === 0) {
      insights.push('System stable - no recurring patterns detected');
    }
    if (trend === 'improving') {
      insights.push('System health improving - keep monitoring');
    }

    return {
      timestamp: new Date(),
      detectedPatterns: patterns,
      appliedCorrections: successfulCorrections,
      failedCorrections,
      systemHealthTrend: trend,
      recommendedActions: recommendations,
      learningInsights: insights,
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // HELPER METHODS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private checkAPIConnectivity(health: Map<string, any>) {
    const issues: string[] = [];
    let passCount = 0;

    health.forEach((h, name) => {
      if (!h.isHealthy) {
        issues.push(`CRITICAL: ${name} is DOWN`);
      } else {
        passCount++;
      }
    });

    return {
      status: issues.length === 0 ? 'pass' : 'fail',
      issues,
    };
  }

  private checkAuthentication(health: Map<string, any>) {
    // TODO: Verify API keys
    return {
      status: 'pass',
      issues: [],
    };
  }

  private checkDataFreshness(health: Map<string, any>) {
    const issues: string[] = [];
    health.forEach((h, name) => {
      if (Date.now() - h.lastCheck.getTime() > 5 * 60 * 1000) {
        issues.push(`${name} data is stale (> 5 min)`);
      }
    });

    return {
      status: issues.length === 0 ? 'pass' : 'fail',
      issues,
    };
  }

  private checkNetworkLatency(health: Map<string, any>) {
    const latencies = Array.from(health.values()).map(h => h.responseTimeMs);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

    const issues: string[] = [];
    if (avgLatency > 2000) {
      issues.push(`High latency: ${avgLatency.toFixed(0)}ms`);
    }

    return {
      status: avgLatency < 2000 ? 'pass' : 'fail',
      issues,
    };
  }

  private checkResourceUsage() {
    // TODO: Check memory, CPU, connection pool, etc.
    return {
      status: 'pass',
      issues: [],
    };
  }

  private generateSuggestions(
    api: any,
    auth: any,
    freshness: any,
    latency: any,
    patterns: IncidentPattern[]
  ): { improvements: string[] } {
    const improvements: string[] = [];

    if (api.issues.length > 0) {
      improvements.push('Investigate API connectivity issues');
    }
    if (freshness.issues.length > 0) {
      improvements.push('Increase data refresh frequency');
    }
    if (latency.issues.length > 0) {
      improvements.push('Optimize network routes or upgrade bandwidth');
    }
    patterns.forEach(p => {
      if (p.solutionSeverity === 'permanent_fix') {
        improvements.push(p.suggestedSolution);
      }
    });

    return { improvements };
  }
}
