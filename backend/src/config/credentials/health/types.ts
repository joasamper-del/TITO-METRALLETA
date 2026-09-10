/**
 * Health Check System Types
 * Defines the contract for credential and connection health verification
 */

export type HealthStatus = 'green' | 'yellow' | 'red' | 'gray';

export interface HealthCheck {
  id: string;
  broker: string;
  checkName: string;
  status: HealthStatus;
  message: string;
  lastChecked: Date;
  nextCheck?: Date;
}

export interface HealthResult {
  timestamp: Date;
  overallStatus: HealthStatus;
  checks: HealthCheck[];
  blockedSources: string[];
  readyToOperate: boolean;
  report: string;
}

export interface HealthCheckConfig {
  id: string;
  broker: string;
  critical: boolean;
  interval: number;
  timeout: number;
  checker: () => Promise<HealthStatus>;
}

export interface BrokerHealthCheckFactory {
  broker: string;
  configs: HealthCheckConfig[];
}
