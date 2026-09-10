/**
 * Token Refresh Manager
 * Orchestrates automatic credential renewal across providers
 * Security: Prevents token-stale-token scenarios with validation before replacement
 */

import { RefreshProvider, RefreshAttempt, RefreshConfig } from './refresh.types';
import { logger } from './logger';

export class TokenRefreshManager {
  private providers: Map<string, RefreshProvider> = new Map();
  private configs: Map<string, RefreshConfig> = new Map();
  private attemptHistory: RefreshAttempt[] = [];
  private activeRefreshes: Set<string> = new Set();

  /**
   * Register a refresh provider for a broker
   */
  registerProvider(brokerId: string, provider: RefreshProvider, config: RefreshConfig): void {
    this.providers.set(brokerId, provider);
    this.configs.set(brokerId, config);
  }

  /**
   * Check if a broker supports auto-refresh
   */
  canAutoRefresh(brokerId: string): boolean {
    const provider = this.providers.get(brokerId);
    return provider?.canAutoRefresh() ?? false;
  }

  /**
   * Attempt to refresh a credential if it's expiring soon
   */
  async refreshIfNeeded(brokerId: string): Promise<void> {
    // Prevent concurrent refresh attempts for same broker
    if (this.activeRefreshes.has(brokerId)) {
      logger.debug(`Refresh already in progress for ${brokerId}`);
      return;
    }

    const provider = this.providers.get(brokerId);
    if (!provider) {
      logger.warn(`No refresh provider registered for ${brokerId}`);
      return;
    }

    this.activeRefreshes.add(brokerId);

    try {
      const timeUntilExpiry = await provider.getTimeUntilExpiry();

      if (timeUntilExpiry === null) {
        // Time unknown, skip refresh check
        return;
      }

      if (timeUntilExpiry < 0) {
        // Already expired
        logger.error(`${provider.getName()} token already expired`, { broker: brokerId });
        return;
      }

      const config = this.configs.get(brokerId);
      const warningThreshold = (config?.warningThresholdHours ?? 1) * 60 * 60 * 1000;

      if (timeUntilExpiry > warningThreshold) {
        // Not expiring soon, skip
        return;
      }

      // Token is expiring soon, attempt refresh
      await this.attemptRefresh(brokerId, provider, config!);
    } finally {
      this.activeRefreshes.delete(brokerId);
    }
  }

  /**
   * Force a refresh attempt regardless of expiry time
   */
  async forceRefresh(brokerId: string): Promise<boolean> {
    const provider = this.providers.get(brokerId);
    if (!provider) {
      logger.warn(`No refresh provider for ${brokerId}`);
      return false;
    }

    const config = this.configs.get(brokerId);
    if (!config) {
      logger.warn(`No config for ${brokerId}`);
      return false;
    }

    const result = await this.attemptRefresh(brokerId, provider, config);
    return result;
  }

  /**
   * Get last error reason for a broker
   */
  getLastError(brokerId: string): string | null {
    const provider = this.providers.get(brokerId);
    return provider?.getLastErrorReason() ?? null;
  }

  /**
   * Get refresh attempt history
   */
  getHistory(brokerId?: string, limit: number = 10): RefreshAttempt[] {
    if (brokerId) {
      return this.attemptHistory.filter((a) => a.brokerId === brokerId).slice(-limit);
    }
    return this.attemptHistory.slice(-limit);
  }

  private async attemptRefresh(
    brokerId: string,
    provider: RefreshProvider,
    config: RefreshConfig
  ): Promise<boolean> {
    const attempt: RefreshAttempt = {
      timestamp: new Date().toISOString(),
      brokerId,
      result: 'failure',
      attempt: 1,
    };

    try {
      logger.info(`Attempting token refresh for ${provider.getName()}`, {
        broker: brokerId,
        supportsRefresh: provider.canAutoRefresh(),
      });

      const result = await provider.refresh();
      attempt.result = result;

      if (result === 'success') {
        logger.info(`Token refresh successful for ${provider.getName()}`, { broker: brokerId });
      } else if (result === 'not_supported') {
        logger.warn(`Auto-refresh not supported for ${provider.getName()}`, { broker: brokerId });
        attempt.reason = 'Provider does not support automatic refresh';
      } else {
        attempt.reason = provider.getLastErrorReason() ?? 'Unknown error';
        logger.error(`Token refresh failed for ${provider.getName()}: ${attempt.reason}`, {
          broker: brokerId,
        });
      }

      this.attemptHistory.push(attempt);
      return result === 'success';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      attempt.reason = `Exception: ${message}`;
      attempt.result = 'failure';

      logger.error(`Token refresh exception for ${provider.getName()}`, {
        broker: brokerId,
        error: message,
      });

      this.attemptHistory.push(attempt);
      return false;
    }
  }
}
