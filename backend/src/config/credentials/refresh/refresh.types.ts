/**
 * Token Refresh System Types
 * Extensible architecture for credential renewal across providers
 */

export type RefreshResult = 'success' | 'failure' | 'not_supported';

export interface RefreshConfig {
  brokerId: string;
  brokerName: string;
  supportsAutoRefresh: boolean;
  warningThresholdHours?: number; // Hours before expiry to trigger warning
  maxRetries: number;
  retryDelayMs: number;
}

export interface RefreshAttempt {
  timestamp: string; // ISO timestamp
  brokerId: string;
  result: RefreshResult;
  reason?: string; // Human-readable reason (NEVER includes secrets)
  newExpiresAt?: string; // ISO timestamp of new token expiry
  attempt: number;
  nextRetryAt?: string; // ISO timestamp
}

export interface RefreshError {
  code: string; // Machine-readable code
  message: string; // Safe message (never includes secrets)
  isRetryable: boolean;
  timestamp: string; // ISO timestamp
}

export interface RefreshProvider {
  /**
   * Check if this provider supports automatic token refresh
   */
  canAutoRefresh(): boolean;

  /**
   * Attempt to refresh the credential/token
   * Returns: 'success' if token was refreshed and validated
   *          'failure' if refresh failed (permanent or after retries exhausted)
   *          'not_supported' if provider doesn't support auto-refresh
   */
  refresh(): Promise<RefreshResult>;

  /**
   * Get time until credential expires (in milliseconds)
   * Returns: -1 if already expired
   *          null if expiry time unknown
   */
  getTimeUntilExpiry(): Promise<number | null>;

  /**
   * Get human-readable name of the provider
   */
  getName(): string;

  /**
   * Get error reason if last refresh failed (safe to display)
   */
  getLastErrorReason(): string | null;
}
