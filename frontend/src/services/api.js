import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const client = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const api = {
  health: async () => {
    const response = await client.get('/health');
    return response.data;
  },

  analyze: async (data) => {
    const response = await client.post('/api/analyze', {
      symbol: data.symbol,
      strategy: data.strategy,
      plan: {
        entry: parseFloat(data.entry),
        target: parseFloat(data.target),
        stop: parseFloat(data.stop),
        notes: data.notes || '',
      },
    });
    return response.data;
  },

  stats: async () => {
    const response = await client.get('/api/stats');
    return response.data;
  },

  rules: async () => {
    const response = await client.get('/api/rules');
    return response.data;
  },
};

export default api;
