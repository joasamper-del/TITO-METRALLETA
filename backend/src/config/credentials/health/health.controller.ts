/**
 * Health Check Controller
 * Exposes API endpoint for credential and connection health status
 * Security: Never exposes secrets, keys, tokens, or sensitive values
 */

import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { HealthCheckService } from './health.service';
import { HealthResult } from './types';

@Controller('api/health')
export class HealthCheckController {
  constructor(private healthService: HealthCheckService) {}

  /**
   * GET /api/health
   * Returns complete health status for all registered brokers
   * Security: Returns only status (green/yellow/red/gray), broker name, auth type,
   * and reason without exposing any secrets or sensitive configuration
   *
   * Response:
   * {
   *   timestamp: ISO timestamp,
   *   overallStatus: "green|yellow|red|gray",
   *   readyToOperate: boolean,
   *   blockedSources: ["broker1", "broker2"],
   *   checks: [
   *     {
   *       id: "alpaca_credentials",
   *       broker: "alpaca",
   *       checkName: "Credentials",
   *       status: "green",
   *       message: "✓ Healthy"
   *     },
   *     ...
   *   ],
   *   report: "formatted human-readable report with emojis"
   * }
   */
  @Get()
  async getHealth(): Promise<HealthResult> {
    try {
      return await this.healthService.checkAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        {
          timestamp: new Date().toISOString(),
          overallStatus: 'red',
          readyToOperate: false,
          blockedSources: ['system'],
          checks: [],
          report: `System health check failed: ${message}`,
          error: 'HEALTH_CHECK_FAILED',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * GET /api/health/ready
   * Simple boolean check for preflight readiness
   * Returns 200 if ready to operate, 503 if not
   *
   * Useful for quick health checks from clients
   */
  @Get('ready')
  async isReady(): Promise<{ ready: boolean }> {
    try {
      const ready = await this.healthService.isReady();
      if (!ready) {
        throw new HttpException(
          { ready: false, message: 'System not ready to operate' },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      return { ready: true };
    } catch (error) {
      throw new HttpException(
        { ready: false, message: 'Health check failed' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * GET /api/health/status
   * Returns simple text report for monitoring/dashboards
   * Useful for status displays, logs, and monitoring systems
   */
  @Get('status')
  async getStatus(): Promise<{ status: string; report: string }> {
    try {
      const result = await this.healthService.checkAll();
      return {
        status: result.overallStatus,
        report: result.report,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new HttpException(
        {
          status: 'error',
          report: `Failed to check health: ${message}`,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
