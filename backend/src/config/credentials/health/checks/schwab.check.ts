/**
 * Schwab Health Checks
 * Validates OAuth credentials and token refresh capability
 */

import { HealthCheckConfig, HealthStatus } from '../types';

const SCHWAB_AUTH_URL = 'https://api.schwabapi.com/v1/oauth/token';

export const schwabHealthChecks: HealthCheckConfig[] = [
  {
    id: 'schwab_credentials',
    broker: 'schwab',
    critical: true,
    interval: 3600,
    timeout: 2000,
    checker: async (): Promise<HealthStatus> => {
      const clientId = process.env.SCHWAB_CLIENT_ID;
      const clientSecret = process.env.SCHWAB_CLIENT_SECRET;

      if (!clientId || !clientSecret || clientId.trim() === '' || clientSecret.trim() === '') {
        throw new Error('Missing SCHWAB_CLIENT_ID or SCHWAB_CLIENT_SECRET');
      }

      return 'green';
    },
  },
  {
    id: 'schwab_oauth',
    broker: 'schwab',
    critical: true,
    interval: 600,
    timeout: 8000,
    checker: async (): Promise<HealthStatus> => {
      const clientId = process.env.SCHWAB_CLIENT_ID;
      const clientSecret = process.env.SCHWAB_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return 'red';
      }

      try {
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
          if (response.status === 401 || response.status === 403) {
            throw new Error('Authentication failed (401/403)');
          }
          if (response.status >= 500) {
            throw new Error('Server error (5xx)');
          }
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!data.access_token) {
          throw new Error('No access token in response');
        }

        return 'green';
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`OAuth check failed: ${message}`);
      }
    },
  },
  {
    id: 'schwab_token',
    broker: 'schwab',
    critical: false,
    interval: 3600,
    timeout: 2000,
    checker: async (): Promise<HealthStatus> => {
      // Token expiry check depends on persisted token, not credentials
      // For now, check that we can request one
      const clientId = process.env.SCHWAB_CLIENT_ID;
      const clientSecret = process.env.SCHWAB_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return 'gray';
      }

      try {
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
          throw new Error(`Failed to get token: ${response.status}`);
        }

        return 'green';
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Token check failed: ${message}`);
      }
    },
  },
];
