/**
 * Health Check Service
 * NestJS service for managing health checks and preflight verification
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { HealthChecker } from './checker';
import { PreflightGuard } from './preflight.guard';
import { CredentialManager } from '../manager';
import { getAllHealthChecks } from './checks';
import { HealthResult } from './types';

@Injectable()
export class HealthCheckService implements OnModuleInit {
  private healthChecker: HealthChecker;
  private preflightGuard: PreflightGuard;

  constructor(private credentialMgr: CredentialManager) {
    this.healthChecker = new HealthChecker();
    this.preflightGuard = new PreflightGuard(credentialMgr, this.healthChecker);
  }

  onModuleInit(): void {
    const configs = getAllHealthChecks();
    this.healthChecker.registerMultiple(configs);
  }

  async checkAll(): Promise<HealthResult> {
    return this.healthChecker.checkAll();
  }

  async verify(): Promise<HealthResult> {
    return this.preflightGuard.verify();
  }

  async isReady(): Promise<boolean> {
    return this.preflightGuard.verifyQuiet();
  }

  getHealthChecker(): HealthChecker {
    return this.healthChecker;
  }

  getPreflightGuard(): PreflightGuard {
    return this.preflightGuard;
  }
}
