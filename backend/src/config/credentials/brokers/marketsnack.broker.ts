/**
 * MarketSnack Broker Configuration
 * Internal product for options flow data
 */

import { BrokerCredential } from '../types';

export const MarketSnackBroker: BrokerCredential = {
  id: 'marketsnack',
  name: 'MarketSnack',
  authType: 'cookie',
  scopes: ['flow'],
  endpoints: {
    flow: 'https://app.marketsnack.com/api/flow_feed',
  },
  requiredFields: ['MARKETSNACK_COOKIE'],
  optionalFields: [],
  isConfigured: false,
  error: undefined,
};
