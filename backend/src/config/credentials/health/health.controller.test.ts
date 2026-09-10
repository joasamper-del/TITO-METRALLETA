/**
 * Health Check Controller Tests
 * Verify API endpoints return correct data without exposing secrets
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HealthCheckController } from './health.controller';
import { HealthCheckService } from './health.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('HealthCheckController', () => {
  let controller: HealthCheckController;
  let mockHealthService: any;

  beforeEach(() => {
    mockHealthService = {
      checkAll: vi.fn(),
      isReady: vi.fn(),
    };
    controller = new HealthCheckController(mockHealthService);
  });

  describe('GET /api/health', () => {
    it('should return health status when all systems green', async () => {
      const mockResult = {
        timestamp: new Date(),
        overallStatus: 'green' as const,
        readyToOperate: true,
        blockedSources: [],
        checks: [
          {
            id: 'alpaca_credentials',
            broker: 'alpaca',
            checkName: 'Credentials',
            status: 'green' as const,
            message: '✓ Healthy',
            lastChecked: new Date(),
          },
        ],
        report: '🟢 ALPACA\n   ✓ Credentials: ✓ Healthy\n',
      };

      mockHealthService.checkAll.mockResolvedValue(mockResult);

      const result = await controller.getHealth();

      expect(result.overallStatus).toBe('green');
      expect(result.readyToOperate).toBe(true);
      expect(result.blockedSources.length).toBe(0);
      expect(result.checks).toHaveLength(1);
    });

    it('should return red status when critical source is red', async () => {
      const mockResult = {
        timestamp: new Date(),
        overallStatus: 'red' as const,
        readyToOperate: false,
        blockedSources: ['alpaca'],
        checks: [
          {
            id: 'alpaca_connection',
            broker: 'alpaca',
            checkName: 'Connection',
            status: 'red' as const,
            message: '✗ Connection test failed: HTTP 401',
            lastChecked: new Date(),
          },
        ],
        report: '🔴 ALPACA\n   ✗ Connection: ✗ Connection test failed: HTTP 401\n',
      };

      mockHealthService.checkAll.mockResolvedValue(mockResult);

      const result = await controller.getHealth();

      expect(result.overallStatus).toBe('red');
      expect(result.readyToOperate).toBe(false);
      expect(result.blockedSources).toContain('alpaca');
    });

    it('should never expose API keys, tokens, or secrets in response', async () => {
      const mockResult = {
        timestamp: new Date(),
        overallStatus: 'green' as const,
        readyToOperate: true,
        blockedSources: [],
        checks: [
          {
            id: 'alpaca_credentials',
            broker: 'alpaca',
            checkName: 'Credentials',
            status: 'green' as const,
            message: '✓ Healthy',
            lastChecked: new Date(),
          },
        ],
        report: '🟢 ALPACA\n   ✓ Credentials: ✓ Healthy\n',
      };

      mockHealthService.checkAll.mockResolvedValue(mockResult);

      const result = await controller.getHealth();

      const resultString = JSON.stringify(result);

      expect(resultString).not.toContain('API_KEY');
      expect(resultString).not.toContain('SECRET');
      expect(resultString).not.toContain('TOKEN');
      expect(resultString).not.toContain('PASSWORD');
      expect(resultString).not.toContain('COOKIE');
    });

    it('should handle service errors gracefully', async () => {
      mockHealthService.checkAll.mockRejectedValue(new Error('Service unavailable'));

      try {
        await controller.getHealth();
        expect.fail('Should have thrown HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      }
    });

    it('should include report in response', async () => {
      const mockResult = {
        timestamp: new Date(),
        overallStatus: 'yellow' as const,
        readyToOperate: true,
        blockedSources: [],
        checks: [
          {
            id: 'alpaca_token',
            broker: 'alpaca',
            checkName: 'Token',
            status: 'yellow' as const,
            message: '⚠ Warning (refresh soon)',
            lastChecked: new Date(),
          },
        ],
        report: '🟡 ALPACA\n   ⚠ Token: ⚠ Warning (refresh soon)\n',
      };

      mockHealthService.checkAll.mockResolvedValue(mockResult);

      const result = await controller.getHealth();

      expect(result.report).toContain('ALPACA');
      expect(result.report).toContain('🟡');
      expect(result.report).toContain('Warning');
    });
  });

  describe('GET /api/health/ready', () => {
    it('should return ready when system is operational', async () => {
      mockHealthService.isReady.mockResolvedValue(true);

      const result = await controller.isReady();

      expect(result.ready).toBe(true);
    });

    it('should throw SERVICE_UNAVAILABLE when not ready', async () => {
      mockHealthService.isReady.mockResolvedValue(false);

      try {
        await controller.isReady();
        expect.fail('Should have thrown HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      }
    });

    it('should handle errors from service', async () => {
      mockHealthService.isReady.mockRejectedValue(new Error('Check failed'));

      try {
        await controller.isReady();
        expect.fail('Should have thrown HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      }
    });
  });

  describe('GET /api/health/status', () => {
    it('should return simple status text', async () => {
      const mockResult = {
        timestamp: new Date(),
        overallStatus: 'green' as const,
        readyToOperate: true,
        blockedSources: [],
        checks: [],
        report: '🟢 ALL SYSTEMS OPERATIONAL',
      };

      mockHealthService.checkAll.mockResolvedValue(mockResult);

      const result = await controller.getStatus();

      expect(result.status).toBe('green');
      expect(result.report).toContain('OPERATIONAL');
    });

    it('should return red status with report', async () => {
      const mockResult = {
        timestamp: new Date(),
        overallStatus: 'red' as const,
        readyToOperate: false,
        blockedSources: ['alpaca', 'massive'],
        checks: [],
        report: '🔴 SYSTEM BLOCKED\nBlocked: alpaca, massive',
      };

      mockHealthService.checkAll.mockResolvedValue(mockResult);

      const result = await controller.getStatus();

      expect(result.status).toBe('red');
      expect(result.report).toContain('BLOCKED');
    });

    it('should handle service errors', async () => {
      mockHealthService.checkAll.mockRejectedValue(new Error('Service failed'));

      try {
        await controller.getStatus();
        expect.fail('Should have thrown HttpException');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
      }
    });
  });

  describe('Security Verification', () => {
    it('should never expose environment variable names in error messages', async () => {
      mockHealthService.checkAll.mockResolvedValue({
        timestamp: new Date(),
        overallStatus: 'green' as const,
        readyToOperate: true,
        blockedSources: [],
        checks: [],
        report: 'OK',
      });

      const result = await controller.getHealth();
      const resultString = JSON.stringify(result);

      expect(resultString).not.toContain('ALPACA_API_KEY');
      expect(resultString).not.toContain('MASSIVE_API_KEY');
      expect(resultString).not.toContain('SCHWAB_CLIENT_SECRET');
      expect(resultString).not.toContain('TRADINGVIEW_BEARER_TOKEN');
    });

    it('should display only status codes (green/yellow/red/gray)', async () => {
      const mockResult = {
        timestamp: new Date(),
        overallStatus: 'yellow' as const,
        readyToOperate: true,
        blockedSources: [],
        checks: [
          {
            id: 'test_check',
            broker: 'test',
            checkName: 'Test',
            status: 'yellow' as const,
            message: '⚠ Warning',
            lastChecked: new Date(),
          },
        ],
        report: '🟡 TEST\n   ⚠ Test: ⚠ Warning\n',
      };

      mockHealthService.checkAll.mockResolvedValue(mockResult);

      const result = await controller.getHealth();

      const validStatuses = ['green', 'yellow', 'red', 'gray'];
      expect(validStatuses).toContain(result.overallStatus);
      expect(validStatuses).toContain(result.checks[0].status);
    });
  });
});
