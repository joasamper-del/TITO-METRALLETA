/**
 * Massive Health Checks
 * Validates API key and connection to Massive/Polygon
 */

import { HealthCheckConfig, HealthStatus } from '../types';

const MASSIVE_API_BASE = 'https://api.massive.com';

export const massiveHealthChecks: HealthCheckConfig[] = [
  {
    id: 'massive_credentials',
    broker: 'massive',
    critical: true,
    interval: 3600,
    timeout: 2000,
    checker: async (): Promise<HealthStatus> => {
      const apiKey = process.env.MASSIVE_API_KEY;

      if (!apiKey || apiKey.trim() === '') {
        throw new Error('Missing MASSIVE_API_KEY');
      }

      return 'green';
    },
  },
  {
    id: 'massive_connection',
    broker: 'massive',
    critical: true,
    interval: 300,
    timeout: 8000,
    checker: async (): Promise<HealthStatus> => {
      const apiKey = process.env.MASSIVE_API_KEY;

      if (!apiKey) {
        return 'red';
      }

      try {
        const response = await fetch(`${MASSIVE_API_BASE}/v2/snapshot/locale/us/markets/stocks/tickers/SPY`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
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
    id: 'massive_ratelimit',
    broker: 'massive',
    critical: false,
    interval: 600,
    timeout: 5000,
    checker: async (): Promise<HealthStatus> => {
      const apiKey = process.env.MASSIVE_API_KEY;

      if (!apiKey) {
        return 'gray';
      }

      try {
        const response = await fetch(`${MASSIVE_API_BASE}/v2/snapshot/locale/us/markets/stocks/tickers/SPY`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });

        const remaining = response.headers.get('x-ratelimit-remaining');
        if (remaining) {
          const count = parseInt(remaining, 10);
          if (count < 100) {
            return 'yellow';
          }
        }

        return 'green';
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Rate limit check failed: ${message}`);
      }
    },
  },
];
