/**
 * FRED Health Checks
 * Validates API key and connection to Federal Reserve Economic Data
 */

import { HealthCheckConfig, HealthStatus } from '../types';

const FRED_BASE = 'https://api.stlouisfed.org/fred';

export const fredHealthChecks: HealthCheckConfig[] = [
  {
    id: 'fred_credentials',
    broker: 'fred',
    critical: false,
    interval: 3600,
    timeout: 2000,
    checker: async (): Promise<HealthStatus> => {
      const apiKey = process.env.FRED_API_KEY;

      if (!apiKey || apiKey.trim() === '') {
        throw new Error('Missing FRED_API_KEY');
      }

      return 'green';
    },
  },
  {
    id: 'fred_connection',
    broker: 'fred',
    critical: false,
    interval: 600,
    timeout: 8000,
    checker: async (): Promise<HealthStatus> => {
      const apiKey = process.env.FRED_API_KEY;

      if (!apiKey) {
        return 'gray';
      }

      try {
        const response = await fetch(`${FRED_BASE}/series?series_id=VIXCLS&api_key=${apiKey}&file_type=json`, {
          method: 'GET',
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
];
