/**
 * Preflight Guard
 * Validates credentials and health before market operations
 * RULE: Never proceed to market without passing preflight verification
 */

import { CredentialManager } from '../manager';
import { HealthChecker } from './checker';
import { HealthResult } from './types';

export class PreflightError extends Error {
  constructor(
    public message: string,
    public blockedSources?: string[],
  ) {
    super(message);
    this.name = 'PreflightError';
  }
}

export class PreflightGuard {
  constructor(
    private credentialMgr: CredentialManager,
    private healthChecker: HealthChecker,
  ) {}

  async verify(): Promise<HealthResult> {
    // Step 1: Validate credentials
    const credResult = this.credentialMgr.validate();
    if (!credResult.isValid) {
      const errors = credResult.errors.map(e => e.message).join('; ');
      throw new PreflightError(`Missing credentials: ${errors}`);
    }

    // Step 2: Check health
    const healthResult = await this.healthChecker.checkAll();

    // Step 3: Determine if we can proceed
    if (!healthResult.readyToOperate) {
      throw new PreflightError(
        `Blocked sources: ${healthResult.blockedSources.join(', ')}\n${healthResult.report}`,
        healthResult.blockedSources,
      );
    }

    return healthResult;
  }

  async verifyQuiet(): Promise<boolean> {
    try {
      await this.verify();
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Example usage in a market operation:
 *
 * export async function startTrading(userId: string) {
 *   const preflight = new PreflightGuard(credMgr, healthChecker);
 *
 *   try {
 *     const healthResult = await preflight.verify();
 *     console.log(healthResult.report);
 *   } catch (error) {
 *     logger.error(`Preflight failed: ${error.message}`);
 *     return { success: false, reason: error.message };
 *   }
 *
 *   // Proceed with trading...
 * }
 */
