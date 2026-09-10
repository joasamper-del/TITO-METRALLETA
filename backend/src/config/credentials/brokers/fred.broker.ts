/**
 * FRED (St. Louis Federal Reserve) Configuration
 * VIX economic data
 */

import { BrokerCredential } from '../types';

export const FREDBroker: BrokerCredential = {
  id: 'fred',
  name: 'FRED (St. Louis Federal Reserve)',
  authType: 'static_key',
  scopes: ['market_data'],
  endpoints: {
    marketData: 'https://api.stlouisfed.org/fred',
  },
  requiredFields: ['FRED_API_KEY'],
  optionalFields: [],
  isConfigured: false,
  error: undefined,
};
