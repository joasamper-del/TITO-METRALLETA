/**
 * Massive Broker Configuration (Polygon.io)
 * Market data & option chain snapshots
 */

import { BrokerCredential } from '../types';

export const MassiveBroker: BrokerCredential = {
  id: 'massive',
  name: 'Massive (Polygon.io)',
  authType: 'static_key',
  scopes: ['market_data'],
  endpoints: {
    marketData: 'https://api.massive.com',
  },
  requiredFields: ['MASSIVE_API_KEY'],
  optionalFields: [],
  isConfigured: false,
  error: undefined,
};
