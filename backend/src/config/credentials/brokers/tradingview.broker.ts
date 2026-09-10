/**
 * TradingView Broker Configuration
 * Webhook for indicator alerts
 */

import { BrokerCredential } from '../types';

export const TradingViewBroker: BrokerCredential = {
  id: 'tradingview',
  name: 'TradingView Webhooks',
  authType: 'bearer',
  scopes: ['alerts'],
  endpoints: {
    alerts: 'https://tito-trading.vercel.app/api/tradingview',
  },
  requiredFields: ['TRADINGVIEW_WEBHOOK_SECRET'],
  optionalFields: [],
  isConfigured: false,
  error: undefined,
};
