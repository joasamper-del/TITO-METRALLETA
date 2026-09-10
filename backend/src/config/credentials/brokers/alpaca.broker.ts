/**
 * Alpaca Broker Configuration
 * Paper Trading — NOT LIVE
 */

import { BrokerCredential } from '../types';

export const AlpacaBroker: BrokerCredential = {
  id: 'alpaca',
  name: 'Alpaca Paper Trading',
  authType: 'static_key',
  scopes: ['orders', 'positions', 'market_data'],
  endpoints: {
    trading: 'https://paper-api.alpaca.markets',
    marketData: 'https://data.alpaca.markets',
  },
  requiredFields: ['ALPACA_API_KEY', 'ALPACA_SECRET_KEY'],
  optionalFields: [],
  isConfigured: false,
  error: undefined,
};
