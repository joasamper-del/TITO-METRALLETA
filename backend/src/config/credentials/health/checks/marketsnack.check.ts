/**
 * MarketSnack Health Checks
 * Validates session cookie configuration
 */

import { HealthCheckConfig, HealthStatus } from '../types';

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
];
