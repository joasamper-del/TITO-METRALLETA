/**
 * NewsAPI Broker Configuration
 * Macroeconomic & company news headlines
 */

import { BrokerCredential } from '../types';

export const NewsAPIBroker: BrokerCredential = {
  id: 'newsapi',
  name: 'NewsAPI',
  authType: 'static_key',
  scopes: ['news'],
  endpoints: {
    news: 'https://newsapi.org/v2',
  },
  requiredFields: ['NEWS_API_KEY'],
  optionalFields: [],
  isConfigured: false,
  error: undefined,
};
