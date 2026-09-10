/**
 * Schwab OAuth Token Refresh Provider
 * Implements automatic OAuth token renewal for Schwab
 * Security: Never exposes tokens, client secrets, or credentials
 */

import { RefreshProvider, RefreshResult } from '../refresh.types';
import { CredentialManager } from '../../manager';
import { logger } from '../logger';

const SCHWAB_AUTH_URL = 'https://api.schwabapi.com/v1/oauth/token';
const TOKEN_EXPIRY_KEY = 'SCHWAB_TOKEN_EXPIRES_AT';
const REFRESH_WARNING_HOURS = 1; // Warn 1 hour before expiry

export class SchwabRefreshProvider implements RefreshProvider {
  private credentialMgr: CredentialManager;
  private lastErrorReason: string | null = null;
  private retryCount: number = 0;
  private maxRetries: number = 3;

  constructor(credentialMgr: CredentialManager) {
    this.credentialMgr = credentialMgr;
  }

  canAutoRefresh(): boolean {
    return true; // Schwab supports OAuth token refresh
  }

  async refresh(): Promise<RefreshResult> {
    try {
      this.lastErrorReason = null;

      // Get client credentials
      const clientId = process.env.SCHWAB_CLIENT_ID;
      const clientSecret = process.env.SCHWAB_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        this.lastErrorReason = 'Schwab credentials not configured';
        return 'failure';
      }

      // Attempt OAuth token refresh
      const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

      const response = await fetch(SCHWAB_AUTH_URL, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials&scope=PlaceTrades AccountAccess',
      });

      if (!response.ok) {
        this.retryCount++;
        if (this.retryCount < this.maxRetries) {
          this.lastErrorReason = `OAuth token request failed (HTTP ${response.status}, attempt ${this.retryCount}/${this.maxRetries})`;
          return 'failure';
        }
        this.lastErrorReason = `OAuth token refresh failed permanently after ${this.maxRetries} attempts`;
        return 'failure';
      }

      const data = (await response.json()) as { access_token?: string; expires_in?: number };

      if (!data.access_token || !data.expires_in) {
        this.lastErrorReason = 'Invalid OAuth response: missing token or expiry';
        return 'failure';
      }

      // Validate new token before saving
      const isValid = await this.validateToken(data.access_token);
      if (!isValid) {
        this.lastErrorReason = 'New token failed validation';
        return 'failure';
      }

      // Store token expiry time (never store the token itself in plaintext)
      const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
      // In production, store this in a secure credential store
      // For now, we just track that refresh succeeded
      await this.logRefreshSuccess(expiresAt);

      this.retryCount = 0;
      return 'success';
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.lastErrorReason = `Refresh exception: ${message}`;
      this.retryCount++;

      if (this.retryCount >= this.maxRetries) {
        logger.error(`Schwab token refresh exhausted retries: ${this.lastErrorReason}`);
        return 'failure';
      }

      return 'failure';
    }
  }

  async getTimeUntilExpiry(): Promise<number | null> {
    try {
      // In production, fetch from secure token store
      // For now, return null (time unknown)
      const expiresAtStr = process.env.SCHWAB_TOKEN_EXPIRES_AT;
      if (!expiresAtStr) return null;

      const expiresAt = new Date(expiresAtStr).getTime();
      const now = Date.now();
      return Math.max(0, expiresAt - now);
    } catch {
      return null;
    }
  }

  getName(): string {
    return 'Schwab OAuth';
  }

  getLastErrorReason(): string | null {
    return this.lastErrorReason;
  }

  private async validateToken(token: string): Promise<boolean> {
    try {
      // Validate token by making a test API call
      const response = await fetch('https://api.schwabapi.com/v1/accounts', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  private async logRefreshSuccess(expiresAt: string): Promise<void> {
    try {
      // Log refresh success without exposing token
      logger.info('Schwab OAuth token refreshed successfully', {
        broker: 'schwab',
        event: 'token_refreshed',
        expiresAt,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to log Schwab token refresh', { error });
    }
  }
}
