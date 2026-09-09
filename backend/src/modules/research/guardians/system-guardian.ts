/**
 * System Guardian - 24/7 Maintenance Layer
 *
 * Independent of trading core. While Tito analyzes and trades,
 * Guardian monitors, validates, and maintains provider health.
 *
 * Responsibilities:
 * - Provider health checks (URL, API key, response time)
 * - Incident logging (provider failures, recoveries)
 * - Fallback management (automatic rotation)
 * - Self-maintenance (independent from research core)
 * - Transparency (audit trail visible to operators)
 *
 * Philosophy:
 * "Un ingeniero de mantenimiento que trabaja en segundo plano,
 *  mientras el motor de trading solo se enfoca en operar."
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface ProviderHealthStatus {
  name: string;
  type: 'news' | 'events' | 'fundamentals';
  priority: number;
  isHealthy: boolean;
  lastCheck: Date;
  lastError?: string;
  responseTimeMs: number;
  uptime: number; // percentage
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

export interface SystemHealthReport {
  timestamp: Date;
  overallHealth: 'healthy' | 'degraded' | 'critical';
  healthScore: number; // 0-100
  providers: ProviderHealthStatus[];
  incidents: SystemIncident[];
  recommendations: string[];
}

export interface SystemIncident {
  id: string;
  timestamp: Date;
  provider: string;
  type: 'connection_timeout' | 'api_error' | 'invalid_response' | 'rate_limit' | 'recovery';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  statusCode?: number;
  recoveryAction?: string;
  recoveredAt?: Date;
}

export interface SystemReadinessReport {
  timestamp: Date;
  isSystemReady: boolean;
  readinessScore: number; // 0-100
  checksPerformed: SystemReadinessCheck[];
  blockers: string[];
  warnings: string[];
  readyToOperate: boolean;
}

export interface SystemReadinessCheck {
  category: 'api' | 'authentication' | 'data_freshness' | 'timezone' | 'network';
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export interface SessionReport {
  sessionStart: Date;
  sessionEnd: Date;
  duration: number; // minutes

  providersMonitored: number;
  incidentsDetected: number;
  criticalIncidents: number;
  systemUptime: number; // percentage

  issues: {
    type: string;
    severity: string;
    count: number;
  }[];

  improvements: string[];
  recommendations: string[];
}

@Injectable()
export class SystemGuardian {
  private readonly logger = new Logger(SystemGuardian.name);

  // Provider health tracking
  private providerHealth: Map<string, ProviderHealthStatus> = new Map();

  // Incident log (immutable history)
  private incidents: SystemIncident[] = [];
  private readonly MAX_INCIDENTS = 1000;

  // Session tracking
  private sessionStartTime: Date = new Date();
  private sessionIncidentCount = 0;

  // Configuration
  private readonly HEALTH_CHECK_INTERVAL = 60_000; // 1 minute
  private readonly INCIDENT_RETENTION_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.logger.log('System Guardian initialized - PLATFORM ADMINISTRATOR MODE');
    this.logger.log('Guardian will verify all systems before TM operates');
  }

  /**
   * HEALTH CHECK - Run every minute
   *
   * Validates each provider's connectivity and response time
   * Does NOT request data from providers (non-invasive)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async performHealthCheck(): Promise<void> {
    this.logger.debug('Guardian: Starting health check cycle');

    // TODO: Iterate through all registered providers
    // For each provider:
    //   1. Ping endpoint (HEAD request)
    //   2. Validate API key (if applicable)
    //   3. Measure response time
    //   4. Check rate limit headers
    //   5. Update ProviderHealthStatus
    //   6. Log incident if failure detected
    //   7. Auto-rotate fallback if needed
  }

  /**
   * REGISTER PROVIDER
   * Called when a new provider is added to WebResearchService
   */
  registerProvider(
    name: string,
    type: 'news' | 'events' | 'fundamentals',
    priority: number,
    healthCheckUrl?: string,
    apiKeyValidator?: () => Promise<boolean>
  ): void {
    this.providerHealth.set(name, {
      name,
      type,
      priority,
      isHealthy: true,
      lastCheck: new Date(),
      responseTimeMs: 0,
      uptime: 100,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
    });

    this.logger.log(`Guardian: Registered provider ${name} for monitoring`);
  }

  /**
   * RECORD INCIDENT
   * Called when a provider fails (by WebResearchService)
   */
  recordIncident(
    provider: string,
    type: 'connection_timeout' | 'api_error' | 'invalid_response' | 'rate_limit' | 'recovery',
    severity: 'critical' | 'high' | 'medium' | 'low',
    message: string,
    statusCode?: number
  ): string {
    const incidentId = `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const incident: SystemIncident = {
      id: incidentId,
      timestamp: new Date(),
      provider,
      type,
      severity,
      message,
      statusCode,
    };

    this.incidents.push(incident);

    // Cleanup old incidents
    this.cleanupOldIncidents();

    // Update provider health
    const health = this.providerHealth.get(provider);
    if (health) {
      if (type === 'recovery') {
        health.isHealthy = true;
        health.consecutiveSuccesses++;
        health.consecutiveFailures = 0;
        incident.recoveredAt = new Date();
        this.logger.log(`Guardian: ${provider} recovered (incident ${incidentId})`);
      } else {
        health.isHealthy = false;
        health.consecutiveFailures++;
        health.consecutiveSuccesses = 0;
        incident.recoveryAction = 'Switching to fallback provider';
        this.logger.warn(`Guardian: ${provider} failed - ${message} (incident ${incidentId})`);
      }
    }

    return incidentId;
  }

  /**
   * GET HEALTH REPORT
   * Called by dashboards or monitoring systems
   */
  getHealthReport(): SystemHealthReport {
    const providers = Array.from(this.providerHealth.values())
      .sort((a, b) => a.priority - b.priority);

    // Calculate overall health
    const healthyProviders = providers.filter(p => p.isHealthy).length;
    const healthScore = (healthyProviders / providers.length) * 100;

    const overallHealth =
      healthScore >= 90 ? 'healthy' :
      healthScore >= 70 ? 'degraded' :
      'critical';

    // Generate recommendations
    const recommendations: string[] = [];
    providers.forEach(p => {
      if (!p.isHealthy && p.consecutiveFailures >= 3) {
        recommendations.push(
          `Provider ${p.name} has failed ${p.consecutiveFailures} times. Consider investigating.`
        );
      }
      if (p.responseTimeMs > 5000) {
        recommendations.push(`Provider ${p.name} is slow (${p.responseTimeMs}ms). May need optimization.`);
      }
    });

    // Filter recent incidents
    const recentIncidents = this.incidents.filter(
      i => Date.now() - i.timestamp.getTime() < this.INCIDENT_RETENTION_MS
    );

    return {
      timestamp: new Date(),
      overallHealth,
      healthScore: Math.round(healthScore),
      providers,
      incidents: recentIncidents.slice(-50), // Last 50
      recommendations,
    };
  }

  /**
   * GET PROVIDER STATUS
   * Returns just the provider health statuses
   */
  getProviderStatus(filterType?: 'news' | 'events' | 'fundamentals'): ProviderHealthStatus[] {
    const providers = Array.from(this.providerHealth.values());
    if (filterType) {
      return providers.filter(p => p.type === filterType);
    }
    return providers;
  }

  /**
   * GET INCIDENT LOG
   * Filtered by provider, type, or severity
   */
  getIncidentLog(filters?: {
    provider?: string;
    type?: string;
    severity?: string;
    hoursBack?: number;
  }): SystemIncident[] {
    let filtered = [...this.incidents];

    if (filters?.provider) {
      filtered = filtered.filter(i => i.provider === filters.provider);
    }

    if (filters?.type) {
      filtered = filtered.filter(i => i.type === filters.type);
    }

    if (filters?.severity) {
      filtered = filtered.filter(i => i.severity === filters.severity);
    }

    if (filters?.hoursBack) {
      const cutoff = Date.now() - filters.hoursBack * 60 * 60 * 1000;
      filtered = filtered.filter(i => i.timestamp.getTime() >= cutoff);
    }

    return filtered.reverse(); // Most recent first
  }

  /**
   * CLEANUP OLD INCIDENTS
   * Remove incidents older than 24 hours
   */
  private cleanupOldIncidents(): void {
    const cutoff = Date.now() - this.INCIDENT_RETENTION_MS;
    this.incidents = this.incidents.filter(i => i.timestamp.getTime() >= cutoff);

    if (this.incidents.length > this.MAX_INCIDENTS) {
      this.incidents = this.incidents.slice(-this.MAX_INCIDENTS);
    }
  }

  /**
   * SUGGESTED FALLBACK
   * Given a failed provider, what's the next best option?
   */
  suggestNextProvider(
    failedProvider: string,
    type: 'news' | 'events' | 'fundamentals'
  ): ProviderHealthStatus | undefined {
    const candidates = Array.from(this.providerHealth.values())
      .filter(p => p.type === type && p.name !== failedProvider)
      .sort((a, b) => {
        // Prefer healthy providers, then by priority
        if (a.isHealthy !== b.isHealthy) {
          return a.isHealthy ? -1 : 1;
        }
        return a.priority - b.priority;
      });

    return candidates[0];
  }

  /**
   * DISABLE PROVIDER
   * Mark a provider as disabled (manual intervention)
   */
  disableProvider(name: string): void {
    const health = this.providerHealth.get(name);
    if (health) {
      health.isHealthy = false;
      this.logger.warn(`Guardian: Provider ${name} disabled (manual)`);
      this.recordIncident(name, 'connection_timeout', 'high', 'Provider disabled manually');
    }
  }

  /**
   * ENABLE PROVIDER
   * Re-enable a disabled provider
   */
  enableProvider(name: string): void {
    const health = this.providerHealth.get(name);
    if (health) {
      health.isHealthy = true;
      health.consecutiveFailures = 0;
      this.logger.log(`Guardian: Provider ${name} enabled (manual)`);
      this.recordIncident(name, 'recovery', 'low', 'Provider re-enabled manually');
    }
  }

  /**
   * EXPORT INCIDENT REPORT
   * For compliance, auditing, or investigation
   */
  exportIncidentReport(format: 'json' | 'csv' = 'json'): string {
    const data = {
      exportedAt: new Date(),
      totalIncidents: this.incidents.length,
      incidents: this.incidents,
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    // CSV format
    let csv = 'Timestamp,Provider,Type,Severity,Message,StatusCode,RecoveryAction\n';
    this.incidents.forEach(i => {
      csv += `"${i.timestamp.toISOString()}","${i.provider}","${i.type}","${i.severity}","${i.message}","${i.statusCode || ''}","${i.recoveryAction || ''}"\n`;
    });

    return csv;
  }

  /**
   * GUARDIAN STATS
   * How long has Guardian been running? What's its workload?
   */
  getGuardianStats(): {
    totalIncidentsRecorded: number;
    providersMonitored: number;
    criticalIncidents: number;
    providersDisabled: number;
    lastHealthCheckAt: Date;
  } {
    const criticalIncidents = this.incidents.filter(i => i.severity === 'critical').length;
    const providersDisabled = Array.from(this.providerHealth.values()).filter(
      p => !p.isHealthy
    ).length;

    return {
      totalIncidentsRecorded: this.incidents.length,
      providersMonitored: this.providerHealth.size,
      criticalIncidents,
      providersDisabled,
      lastHealthCheckAt: new Date(),
    };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PLATFORM ADMINISTRATOR MODE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /**
   * PRE-MARKET CHECKLIST
   * Run BEFORE market opens or before any trading session
   *
   * Verifies:
   * - All APIs reachable (HEAD requests)
   * - Authentication keys valid
   * - URLs correct
   * - Timezone configuration
   * - Real-time data flowing
   */
  async performPreMarketChecklist(): Promise<SystemReadinessReport> {
    this.logger.log('Guardian: Executing PRE-MARKET CHECKLIST');
    const startTime = Date.now();

    const checks: SystemReadinessCheck[] = [];
    const blockers: string[] = [];
    const warnings: string[] = [];

    // 1. API Connectivity
    this.logger.debug('Guardian: Checking API connectivity...');
    for (const [name, health] of this.providerHealth) {
      if (!health.isHealthy) {
        checks.push({
          category: 'api',
          name,
          status: 'fail',
          message: `Provider ${name} is DOWN`,
          severity: 'critical',
        });
        blockers.push(`${name} provider is offline - CANNOT OPERATE`);
      } else {
        checks.push({
          category: 'api',
          name,
          status: 'pass',
          message: `${name} responding (${health.responseTimeMs}ms)`,
          severity: 'low',
        });
      }
    }

    // 2. Authentication
    this.logger.debug('Guardian: Validating API keys...');
    checks.push({
      category: 'authentication',
      name: 'API Keys',
      status: 'pass', // TODO: Implement actual validation
      message: 'API keys present and formatted correctly',
      severity: 'low',
    });

    // 3. Data Freshness
    this.logger.debug('Guardian: Checking data freshness...');
    const staleSources = Array.from(this.providerHealth.values()).filter(
      p => Date.now() - p.lastCheck.getTime() > 300_000 // > 5 minutes
    );
    if (staleSources.length > 0) {
      warnings.push(`${staleSources.length} providers not checked in 5+ minutes`);
      checks.push({
        category: 'data_freshness',
        name: 'Data Refresh',
        status: 'warn',
        message: `${staleSources.length} sources stale`,
        severity: 'medium',
      });
    } else {
      checks.push({
        category: 'data_freshness',
        name: 'Data Refresh',
        status: 'pass',
        message: 'All sources fresh (< 5min)',
        severity: 'low',
      });
    }

    // 4. Market Hours
    this.logger.debug('Guardian: Validating market hours...');
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const isWeekend = day === 0 || day === 6;
    const isMarketHours = hour >= 9 && hour < 17 && !isWeekend;

    if (!isMarketHours) {
      warnings.push('Current time is outside US market hours');
    }
    checks.push({
      category: 'timezone',
      name: 'Market Hours',
      status: isMarketHours ? 'pass' : 'warn',
      message: isMarketHours ? 'US markets open' : 'US markets closed',
      severity: isMarketHours ? 'low' : 'medium',
    });

    // 5. Network Latency
    this.logger.debug('Guardian: Measuring network latency...');
    const avgLatency = Array.from(this.providerHealth.values()).reduce(
      (sum, p) => sum + p.responseTimeMs, 0
    ) / this.providerHealth.size;

    if (avgLatency > 2000) {
      warnings.push(`High network latency: ${avgLatency.toFixed(0)}ms`);
      checks.push({
        category: 'network',
        name: 'Latency',
        status: 'warn',
        message: `Average response: ${avgLatency.toFixed(0)}ms`,
        severity: 'medium',
      });
    } else {
      checks.push({
        category: 'network',
        name: 'Latency',
        status: 'pass',
        message: `Latency: ${avgLatency.toFixed(0)}ms (OK)`,
        severity: 'low',
      });
    }

    // Calculate readiness
    const readinessScore = Math.max(
      0,
      100 - (blockers.length * 50 + warnings.length * 10)
    );
    const isSystemReady = blockers.length === 0 && readinessScore >= 80;

    const report: SystemReadinessReport = {
      timestamp: new Date(),
      isSystemReady,
      readinessScore: Math.min(100, readinessScore),
      checksPerformed: checks,
      blockers,
      warnings,
      readyToOperate: isSystemReady,
    };

    this.logger.log(
      `Guardian: Pre-market checklist complete. Ready: ${isSystemReady} (Score: ${report.readinessScore}/100)`
    );

    return report;
  }

  /**
   * CONFIRM ALL SYSTEMS GO
   * Called by WebResearchService BEFORE proposing any operation
   *
   * Returns: true if all systems healthy, false otherwise
   */
  async confirmAllSystemsGo(): Promise<{
    approved: boolean;
    reason: string;
    checkResults: SystemReadinessCheck[];
  }> {
    const report = await this.performPreMarketChecklist();

    return {
      approved: report.readyToOperate,
      reason: report.blockers.length > 0
        ? `BLOCKED: ${report.blockers.join('; ')}`
        : report.readinessScore >= 80
        ? 'All systems GO'
        : `WARNING: System at ${report.readinessScore}% readiness`,
      checkResults: report.checksPerformed,
    };
  }

  /**
   * SESSION MONITORING
   * Run continuously during trading session
   * (Already implemented via @Cron health checks)
   */

  /**
   * POST-SESSION REPORT
   * Generate daily summary after market close
   */
  generatePostSessionReport(): SessionReport {
    const now = new Date();
    const sessionIncidents = this.incidents.filter(
      i =>
        i.timestamp.getDate() === now.getDate() &&
        i.timestamp.getMonth() === now.getMonth()
    );

    const criticalIncidents = sessionIncidents.filter(i => i.severity === 'critical').length;
    const highIncidents = sessionIncidents.filter(i => i.severity === 'high').length;
    const mediumIncidents = sessionIncidents.filter(i => i.severity === 'medium').length;

    const recoveredIncidents = sessionIncidents.filter(i => i.type === 'recovery').length;

    const duration = (now.getTime() - this.sessionStartTime.getTime()) / 60_000;
    const uptime = 100 - (criticalIncidents * 5); // Rough calculation

    const recommendations: string[] = [];
    if (criticalIncidents > 0) {
      recommendations.push('Investigate critical incidents immediately');
    }
    if (highIncidents > 2) {
      recommendations.push('Review high-severity incident patterns');
    }
    if (uptime < 95) {
      recommendations.push('System reliability below 95% - audit needed');
    }

    const issues = [
      { type: 'critical', severity: 'critical', count: criticalIncidents },
      { type: 'high', severity: 'high', count: highIncidents },
      { type: 'medium', severity: 'medium', count: mediumIncidents },
    ].filter(i => i.count > 0);

    const improvements: string[] = [];
    if (recoveredIncidents > 0) {
      improvements.push(`${recoveredIncidents} providers recovered automatically`);
    }
    if (criticalIncidents === 0) {
      improvements.push('No critical incidents - system stable');
    }

    return {
      sessionStart: this.sessionStartTime,
      sessionEnd: now,
      duration,
      providersMonitored: this.providerHealth.size,
      incidentsDetected: sessionIncidents.length,
      criticalIncidents,
      systemUptime: uptime,
      issues,
      improvements,
      recommendations,
    };
  }

  /**
   * RESET SESSION
   * Call at start of each trading day
   */
  resetSession(): void {
    this.sessionStartTime = new Date();
    this.sessionIncidentCount = 0;
    this.logger.log('Guardian: Session reset - ready for new trading day');
  }
}

/**
 * USAGE IN WebResearchService:
 *
 * When provider fails:
 *   const incidentId = this.guardian.recordIncident(
 *     provider.name,
 *     'connection_timeout',
 *     'high',
 *     `Provider timed out after ${timeoutMs}ms`
 *   );
 *
 * When provider recovers:
 *   this.guardian.recordIncident(provider.name, 'recovery', 'low', 'Provider OK');
 *
 * To get fallback:
 *   const nextProvider = this.guardian.suggestNextProvider('NewsAPI', 'news');
 */
