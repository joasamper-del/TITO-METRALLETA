import axios, { AxiosInstance } from 'axios';
import { AlpacaQuote, AlpacaBar } from './alpaca.types';

/**
 * Cliente HTTP para Alpaca Paper Trading
 * Solo lectura de datos (quotes, histórico, posiciones)
 * NO ejecuta órdenes
 */
export class AlpacaClient {
  private client: AxiosInstance;
  private dataClient: AxiosInstance;
  private baseUrl: string;
  private dataUrl: string;
  private apiKey: string;
  private apiSecret: string;

  constructor(apiKey: string, apiSecret: string, baseUrl: string = 'https://paper-api.alpaca.markets') {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = baseUrl;
    this.dataUrl = 'https://data.alpaca.markets';

    // Cliente para Trading API (account, posiciones, etc.)
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
      },
      timeout: 10000,
    });

    // Cliente para Market Data API (quotes, bars, etc.)
    this.dataClient = axios.create({
      baseURL: this.dataUrl,
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
      },
      timeout: 10000,
    });
  }

  /**
   * Obtiene cotización actual (bid/ask) de un símbolo
   * Usa Market Data API con datos IEX
   */
  async getLatestQuote(symbol: string): Promise<AlpacaQuote | null> {
    try {
      const response = await this.dataClient.get(`/v2/stocks/${symbol}/quotes/latest`, {
        params: { feed: 'iex' },
      });
      if (response.data && response.data.quote) {
        return response.data.quote;
      }
      return null;
    } catch (error) {
      console.error(`⚠️ Error obteniendo quote para ${symbol} de Market Data API:`, error);
      return null;
    }
  }

  /**
   * Obtiene barra histórica (OHLCV)
   * Usa Market Data API con datos IEX
   */
  async getHistoricalBars(
    symbol: string,
    timeframe: string = '1day',
    limit: number = 100
  ): Promise<AlpacaBar[] | null> {
    try {
      const response = await this.dataClient.get(`/v2/stocks/${symbol}/bars`, {
        params: {
          timeframe,
          limit,
          adjustment: 'all',
          feed: 'iex',
        },
      });
      if (response.data && response.data.bars) {
        return response.data.bars;
      }
      return null;
    } catch (error) {
      console.error(`⚠️ Error obteniendo histórico para ${symbol} de Market Data API:`, error);
      return null;
    }
  }

  /**
   * Verifica conectividad y valida credenciales
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/v2/account');
      return response.status === 200;
    } catch (error) {
      console.error('⚠️ Error en health check de Alpaca:', error);
      return false;
    }
  }
}
