/**
 * TradingView Health Checks
 * Validates bearer token configuration
 */

import { HealthCheckConfig, HealthStatus } from '../types';

export const tradingviewHealthChecks: HealthCheckConfig[] = [
  {
    id: 'tradingview_credentials',
    broker: 'tradingview',
    critical: false,
    interval: 3600,
    timeout: 2000,
    checker: async (): Promise<HealthStatus> => {
      const token = process.env.TRADINGVIEW_BEARER_TOKEN;

      if (!token || token.trim() === '') {
        throw new Error('Missing TRADINGVIEW_BEARER_TOKEN');
      }

      return 'green';
    },
  },
  {
    id: 'tradingview_alerts',
    broker: 'tradingview',
    critical: false,
    interval: 3600,
    timeout: 2000,
    checker: async (): Promise<HealthStatus> => {
      // TradingView webhook is passive, so we check if the secret is configured
      const secret = process.env.TRADINGVIEW_WEBHOOK_SECRET;

      if (!secret || secret.trim() === '') {
        return 'gray';
      }

      return 'green';
    },
  },
];
