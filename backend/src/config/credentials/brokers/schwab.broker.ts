/**
 * Charles Schwab Broker Configuration
 * 0DTE module — OAuth2 client_credentials
 */

import { BrokerCredential } from '../types';

export const SchwabBroker: BrokerCredential = {
  id: 'schwab',
  name: 'Charles Schwab',
  authType: 'client_credentials',
  scopes: ['market_data'],
  endpoints: {
    marketData: 'https://api.schwab.com',
    oauth: 'https://oauth.schwab.com/oauth/token',
  },
  requiredFields: ['SCHWAB_CLIENT_ID', 'SCHWAB_CLIENT_SECRET'],
  optionalFields: [],
  isConfigured: false,
  error: undefined,
};
