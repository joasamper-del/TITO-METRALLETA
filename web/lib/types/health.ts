/**
 * Health Check API Types
 * Shared types between frontend and backend
 */

export type HealthStatus = 'green' | 'yellow' | 'red' | 'gray';

export interface HealthCheck {
  id: string;
  broker: string;
  checkName: string;
  status: HealthStatus;
  message: string;
  lastChecked: string; // ISO timestamp
  nextCheck?: string; // ISO timestamp
}

export interface HealthResult {
  timestamp: string; // ISO timestamp
  overallStatus: HealthStatus;
  checks: HealthCheck[];
  blockedSources: string[];
  readyToOperate: boolean;
  report: string;
}
