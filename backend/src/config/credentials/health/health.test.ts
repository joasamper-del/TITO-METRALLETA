/**
 * Health Check System Tests
 * Comprehensive validation of health checks and preflight guard
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HealthChecker } from './checker';
import { PreflightGuard, PreflightError } from './preflight.guard';
import { CredentialManager } from '../manager';
import { HealthStatus } from './types';
import { AlpacaBroker, MassiveBroker } from '../brokers';

describe('HealthChecker', () => {
  let checker: HealthChecker;

  beforeEach(() => {
    checker = new HealthChecker();
  });

  it('should register single health check', () => {
    const config = {
      id: 'test_check',
      broker: 'test',
      critical: true,
      interval: 300,
      timeout: 2000,
      checker: async () => 'green' as HealthStatus,
    };

    checker.register(config);
    const lastResult = checker.getLastResult('test_check');
    expect(lastResult).toBeUndefined();
  });

  it('should register multiple health checks', () => {
    const configs = [
      {
        id: 'test_check_1',
        broker: 'test1',
        critical: true,
        interval: 300,
        timeout: 2000,
        checker: async () => 'green' as HealthStatus,
      },
      {
        id: 'test_check_2',
        broker: 'test2',
        critical: false,
        interval: 300,
        timeout: 2000,
        checker: async () => 'yellow' as HealthStatus,
      },
    ];

    checker.registerMultiple(configs);
    expect(checker.getAllResults().length).toBe(0);
  });

  it('should execute all checks and return green status', async () => {
    checker.register({
      id: 'check_1',
      broker: 'broker1',
      critical: true,
      interval: 300,
      timeout: 2000,
      checker: async () => 'green' as HealthStatus,
    });

    checker.register({
      id: 'check_2',
      broker: 'broker1',
      critical: false,
      interval: 300,
      timeout: 2000,
      checker: async () => 'green' as HealthStatus,
    });

    const result = await checker.checkAll();

    expect(result.overallStatus).toBe('green');
    expect(result.readyToOperate).toBe(true);
    expect(result.blockedSources.length).toBe(0);
    expect(result.checks.length).toBe(2);
  });

  it('should return yellow when any check is yellow', async () => {
    checker.register({
      id: 'check_1',
      broker: 'broker1',
      critical: false,
      interval: 300,
      timeout: 2000,
      checker: async () => 'green' as HealthStatus,
    });

    checker.register({
      id: 'check_2',
      broker: 'broker1',
      critical: false,
      interval: 300,
      timeout: 2000,
      checker: async () => 'yellow' as HealthStatus,
    });

    const result = await checker.checkAll();

    expect(result.overallStatus).toBe('yellow');
    expect(result.readyToOperate).toBe(true);
    expect(result.checks[1].status).toBe('yellow');
  });

  it('should return red and block when critical check fails', async () => {
    checker.register({
      id: 'critical_check',
      broker: 'alpaca',
      critical: true,
      interval: 300,
      timeout: 2000,
      checker: async () => {
        throw new Error('Critical failure');
      },
    });

    checker.register({
      id: 'noncritical_check',
      broker: 'massive',
      critical: false,
      interval: 300,
      timeout: 2000,
      checker: async () => 'green' as HealthStatus,
    });

    const result = await checker.checkAll();

    expect(result.overallStatus).toBe('red');
    expect(result.readyToOperate).toBe(false);
    expect(result.blockedSources).toContain('alpaca');
    expect(result.blockedSources).not.toContain('massive');
  });

  it('should not block when non-critical check fails', async () => {
    checker.register({
      id: 'noncritical_fail',
      broker: 'newsapi',
      critical: false,
      interval: 300,
      timeout: 2000,
      checker: async () => {
        throw new Error('Non-critical failure');
      },
    });

    const result = await checker.checkAll();

    expect(result.overallStatus).toBe('red');
    expect(result.readyToOperate).toBe(false);
    expect(result.blockedSources.length).toBe(0);
  });

  it('should handle timeout', async () => {
    checker.register({
      id: 'slow_check',
      broker: 'test',
      critical: true,
      interval: 300,
      timeout: 100,
      checker: async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return 'green' as HealthStatus;
      },
    });

    const result = await checker.checkAll();

    expect(result.overallStatus).toBe('red');
    expect(result.checks[0].status).toBe('red');
    expect(result.checks[0].message).toContain('timeout');
  });

  it('should format report with emojis and structure', async () => {
    checker.register({
      id: 'alpaca_creds',
      broker: 'alpaca',
      critical: true,
      interval: 300,
      timeout: 2000,
      checker: async () => 'green' as HealthStatus,
    });

    checker.register({
      id: 'massive_conn',
      broker: 'massive',
      critical: true,
      interval: 300,
      timeout: 2000,
      checker: async () => 'red' as HealthStatus,
    });

    const result = await checker.checkAll();

    expect(result.report).toContain('PREFLIGHT CHECK');
    expect(result.report).toContain('ALPACA');
    expect(result.report).toContain('MASSIVE');
    expect(result.report).toContain('READY TO OPERATE');
  });
});

describe('PreflightGuard', () => {
  let manager: CredentialManager;
  let checker: HealthChecker;
  let guard: PreflightGuard;

  beforeEach(() => {
    manager = new CredentialManager();
    checker = new HealthChecker();
    guard = new PreflightGuard(manager, checker);
  });

  afterEach(() => {
    delete process.env.ALPACA_API_KEY;
    delete process.env.ALPACA_SECRET_KEY;
  });

  it('should fail if credentials are missing', async () => {
    manager.registerBroker(AlpacaBroker);
    await manager.load();

    expect(async () => await guard.verify()).rejects.toThrow(PreflightError);
  });

  it('should fail if health check is red', async () => {
    process.env.ALPACA_API_KEY = 'test_key';
    process.env.ALPACA_SECRET_KEY = 'test_secret';

    manager.registerBroker(AlpacaBroker);
    await manager.load();

    checker.register({
      id: 'alpaca_conn',
      broker: 'alpaca',
      critical: true,
      interval: 300,
      timeout: 2000,
      checker: async () => {
        throw new Error('Connection failed');
      },
    });

    expect(async () => await guard.verify()).rejects.toThrow(PreflightError);
  });

  it('should pass when credentials and health are good', async () => {
    process.env.ALPACA_API_KEY = 'test_key';
    process.env.ALPACA_SECRET_KEY = 'test_secret';

    manager.registerBroker(AlpacaBroker);
    await manager.load();

    checker.register({
      id: 'alpaca_conn',
      broker: 'alpaca',
      critical: true,
      interval: 300,
      timeout: 2000,
      checker: async () => 'green' as HealthStatus,
    });

    const result = await guard.verify();

    expect(result.overallStatus).toBe('green');
    expect(result.readyToOperate).toBe(true);
  });

  it('should return false on verifyQuiet when verification fails', async () => {
    manager.registerBroker(AlpacaBroker);
    await manager.load();

    const result = await guard.verifyQuiet();

    expect(result).toBe(false);
  });

  it('should return true on verifyQuiet when verification passes', async () => {
    process.env.ALPACA_API_KEY = 'test_key';
    process.env.ALPACA_SECRET_KEY = 'test_secret';

    manager.registerBroker(AlpacaBroker);
    await manager.load();

    checker.register({
      id: 'alpaca_conn',
      broker: 'alpaca',
      critical: true,
      interval: 300,
      timeout: 2000,
      checker: async () => 'green' as HealthStatus,
    });

    const result = await guard.verifyQuiet();

    expect(result).toBe(true);
  });

  it('should include blocked sources in error', async () => {
    process.env.ALPACA_API_KEY = 'test_key';
    process.env.ALPACA_SECRET_KEY = 'test_secret';
    process.env.MASSIVE_API_KEY = 'massive_key';

    manager.registerBroker(AlpacaBroker);
    manager.registerBroker(MassiveBroker);
    await manager.load();

    checker.register({
      id: 'alpaca_conn',
      broker: 'alpaca',
      critical: true,
      interval: 300,
      timeout: 2000,
      checker: async () => 'green' as HealthStatus,
    });

    checker.register({
      id: 'massive_conn',
      broker: 'massive',
      critical: true,
      interval: 300,
      timeout: 2000,
      checker: async () => {
        throw new Error('Connection failed');
      },
    });

    try {
      await guard.verify();
      expect.fail('Should have thrown PreflightError');
    } catch (error) {
      expect(error).toBeInstanceOf(PreflightError);
      expect((error as PreflightError).blockedSources).toContain('massive');
    }
  });
});
