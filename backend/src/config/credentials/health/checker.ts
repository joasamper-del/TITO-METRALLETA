/**
 * Health Checker
 * Orchestrates all health checks and aggregates results
 */

import { HealthCheck, HealthCheckConfig, HealthResult, HealthStatus } from './types';

export class HealthChecker {
  private checks: Map<string, HealthCheckConfig> = new Map();
  private lastResults: Map<string, HealthCheck> = new Map();

  register(config: HealthCheckConfig): void {
    this.checks.set(config.id, config);
  }

  registerMultiple(configs: HealthCheckConfig[]): void {
    configs.forEach(config => this.register(config));
  }

  async checkAll(): Promise<HealthResult> {
    const results: HealthCheck[] = [];

    for (const [id, config] of this.checks) {
      try {
        const status = await Promise.race([
          config.checker(),
          this.timeout(config.timeout),
        ]);

        const check: HealthCheck = {
          id: config.id,
          broker: config.broker,
          checkName: config.id.split('_')[1],
          status,
          message: this.statusToMessage(status),
          lastChecked: new Date(),
        };

        results.push(check);
        this.lastResults.set(config.id, check);
      } catch (error) {
        const check: HealthCheck = {
          id: config.id,
          broker: config.broker,
          checkName: config.id.split('_')[1],
          status: 'red',
          message: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          lastChecked: new Date(),
        };

        results.push(check);
        this.lastResults.set(config.id, check);
      }
    }

    // Determine overall status
    const criticalRed = results
      .filter(r => r.status === 'red' && this.isCritical(r.id))
      .map(r => r.broker);

    const hasAnyRed = results.some(r => r.status === 'red');
    const hasYellow = results.some(r => r.status === 'yellow');

    const overallStatus: HealthStatus =
      hasAnyRed
        ? 'red'
        : hasYellow
          ? 'yellow'
          : 'green';

    return {
      timestamp: new Date(),
      overallStatus,
      checks: results,
      blockedSources: criticalRed,
      readyToOperate: overallStatus !== 'red',
      report: this.formatReport(results, criticalRed),
    };
  }

  private statusToMessage(status: HealthStatus): string {
    switch (status) {
      case 'green':
        return '✓ Healthy';
      case 'yellow':
        return '⚠ Warning (refresh soon)';
      case 'red':
        return '✗ Failed (blocked)';
      case 'gray':
        return '? Unknown';
    }
  }

  private formatReport(checks: HealthCheck[], blocked: string[]): string {
    let report = '\n🏥 PREFLIGHT CHECK\n';
    report += '═'.repeat(65) + '\n\n';

    const byBroker = new Map<string, HealthCheck[]>();
    for (const check of checks) {
      if (!byBroker.has(check.broker)) byBroker.set(check.broker, []);
      byBroker.get(check.broker)!.push(check);
    }

    for (const [broker, brokerChecks] of byBroker) {
      const emoji = blocked.includes(broker) ? '🔴' : brokerChecks.some(c => c.status === 'yellow') ? '🟡' : '🟢';
      report += `${emoji} ${broker.toUpperCase()}\n`;

      for (const check of brokerChecks) {
        const icon = check.status === 'green' ? '✓' : check.status === 'red' ? '✗' : '⚠';
        report += `   ${icon} ${check.checkName}: ${check.message}\n`;
      }
      report += '\n';
    }

    report += '═'.repeat(65) + '\n';
    report += `READY TO OPERATE: ${blocked.length === 0 ? 'TRUE ✓' : 'FALSE ✗'}\n`;

    if (blocked.length > 0) {
      report += `\nBlocked sources: ${blocked.join(', ')}\n`;
      report += '\nAction: Fix blocked sources and retry.\n';
    }

    return report;
  }

  private isCritical(checkId: string): boolean {
    const config = this.checks.get(checkId);
    return config?.critical ?? true;
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => setTimeout(() => reject(new Error('Check timeout')), ms));
  }

  getLastResult(checkId: string): HealthCheck | undefined {
    return this.lastResults.get(checkId);
  }

  getAllResults(): HealthCheck[] {
    return Array.from(this.lastResults.values());
  }
}
