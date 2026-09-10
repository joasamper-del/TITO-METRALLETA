/**
 * NewsAPI Health Checks
 * Validates API key and connection
 */

import { HealthCheckConfig, HealthStatus } from '../types';

const NEWSAPI_BASE = 'https://newsapi.org';

export const newsapiHealthChecks: HealthCheckConfig[] = [
  {
    id: 'newsapi_credentials',
    broker: 'newsapi',
    critical: false,
    interval: 3600,
    timeout: 2000,
    checker: async (): Promise<HealthStatus> => {
      const apiKey = process.env.NEWSAPI_KEY;

      if (!apiKey || apiKey.trim() === '') {
        throw new Error('Missing NEWSAPI_KEY');
      }

      return 'green';
    },
  },
  {
    id: 'newsapi_connection',
    broker: 'newsapi',
    critical: false,
    interval: 600,
    timeout: 8000,
    checker: async (): Promise<HealthStatus> => {
      const apiKey = process.env.NEWSAPI_KEY;

      if (!apiKey) {
        return 'gray';
      }

      try {
        const response = await fetch(`${NEWSAPI_BASE}/v2/top-headlines?country=us&pageSize=1&apiKey=${apiKey}`, {
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
