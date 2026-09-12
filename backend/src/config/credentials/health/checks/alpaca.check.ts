/**
 * Alpaca Health Checks
 * Validates credentials, connection, account access, and token expiry
 */

import { HealthCheckConfig, HealthStatus } from '../types';

const ALPACA_API_BASE = process.env.ALPACA_API_BASE || 'https://paper-api.alpaca.markets';

function isAlpacaAccountResponse(data: unknown): data is { account_number: string | number } {
  return typeof data === 'object' && data !== null && 'account_number' in data;
}

export const alpacaHealthChecks: HealthCheckConfig[] = [
  {
    id: 'alpaca_credentials',
    broker: 'alpaca',
    critical: true,
    interval: 3600,
    timeout: 2000,
    checker: async (): Promise<HealthStatus> => {
      const apiKey = process.env.ALPACA_API_KEY;
      const secretKey = process.env.ALPACA_SECRET_KEY;

      if (!apiKey || !secretKey || apiKey.trim() === '' || secretKey.trim() === '') {
        throw new Error('Missing ALPACA_API_KEY or ALPACA_SECRET_KEY');
      }

      return 'green';
    },
  },
  {
    id: 'alpaca_connection',
    broker: 'alpaca',
    critical: true,
    interval: 300,
    timeout: 5000,
    checker: async (): Promise<HealthStatus> => {
      const apiKey = process.env.ALPACA_API_KEY;
      const secretKey = process.env.ALPACA_SECRET_KEY;

      if (!apiKey || !secretKey) {
        return 'red';
      }

      try {
        const response = await fetch(`${ALPACA_API_BASE}/v2/account`, {
          method: 'GET',
          headers: {
            'APCA-API-KEY-ID': apiKey,
            'APCA-API-SECRET-KEY': secretKey,
          },
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error('Authentication failed (401/403)');
          }
          if (response.status >= 500) {
            throw new Error('Server error (5xx)');
          }
          throw new Error(`HTTP ${response.status}`);
        }

        return 'green';
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Connection test failed: ${message}`);
      }
    },
  },
  {
    id: 'alpaca_account',
    broker: 'alpaca',
    critical: false,
    interval: 600,
    timeout: 5000,
    checker: async (): Promise<HealthStatus> => {
      const apiKey = process.env.ALPACA_API_KEY;
      const secretKey = process.env.ALPACA_SECRET_KEY;

      if (!apiKey || !secretKey) {
        return 'gray';
      }

      try {
        const response = await fetch(`${ALPACA_API_BASE}/v2/account`, {
          method: 'GET',
          headers: {
            'APCA-API-KEY-ID': apiKey,
            'APCA-API-SECRET-KEY': secretKey,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch account: ${response.status}`);
        }

        const account = await response.json() as unknown;

        if (!isAlpacaAccountResponse(account)) {
          throw new Error('Invalid account response');
        }

        return 'green';
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Account check failed: ${message}`);
      }
    },
  },
  {
    id: 'alpaca_token',
    broker: 'alpaca',
    critical: false,
    interval: 3600,
    timeout: 2000,
    checker: async (): Promise<HealthStatus> => {
      // Alpaca uses static keys, not tokens with expiry
      // This check is a placeholder for future OAuth support
      return 'green';
    },
  },
];
