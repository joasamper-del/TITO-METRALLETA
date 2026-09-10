/**
 * MarketSnack Health Checks
 * Validates session cookie configuration and connection
 */

import { HealthCheckConfig, HealthStatus } from '../types';

const MARKETSNACK_API_BASE = 'https://app.marketsnack.com';

export const marketsnackHealthChecks: HealthCheckConfig[] = [
  {
    id: 'marketsnack_credentials',
    broker: 'marketsnack',
    critical: false,
    interval: 3600,
    timeout: 2000,
    checker: async (): Promise<HealthStatus> => {
      const cookie = process.env.MARKETSNACK_COOKIE;

      if (!cookie || cookie.trim() === '') {
        throw new Error('Missing MARKETSNACK_COOKIE');
      }

      return 'green';
    },
  },
  {
    id: 'marketsnack_connection',
    broker: 'marketsnack',
    critical: false,
    interval: 300,
    timeout: 8000,
    checker: async (): Promise<HealthStatus> => {
      const cookie = process.env.MARKETSNACK_COOKIE;

      if (!cookie) {
        return 'red';
      }

      try {
        const response = await fetch(`${MARKETSNACK_API_BASE}/api/flow_feed?filter[scope]=all&period=1d&limit=1`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Cookie: cookie,
          },
          redirect: 'manual',
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
