import axios from 'axios';
import { MarketData, MarketContext } from '../types';

export class DataEngine {
  private alphaVantageKey: string;
  private finnhubKey: string;

  constructor(alphaVantageKey: string = '', finnhubKey: string = '') {
    this.alphaVantageKey = alphaVantageKey;
    this.finnhubKey = finnhubKey;
  }

  /**
   * Obtiene datos de mercado para un símbolo específico
   */
  async getMarketData(symbol: string): Promise<MarketData | null> {
    try {
      const marketData: MarketData = {
        symbol,
        price: 0,
        volume: 0,
        liquidity: 0,
        trend: 'desconocido',
        rsi: null,
        gex: null,
        premiumDiscount: 'desconocido',
        support: null,
        resistance: null,
        timestamp: new Date(),
      };

      // Intenta obtener datos de Alpha Vantage
      if (this.alphaVantageKey) {
        await this.fetchAlphaVantageData(symbol, marketData);
      }

      // Intenta obtener datos adicionales de Finnhub
      if (this.finnhubKey) {
        await this.fetchFinnhubData(symbol, marketData);
      }

      // Si no hay datos confiables, marca para revisión manual
      if (marketData.price === 0 || marketData.volume === 0) {
        console.log(`⚠️ Datos incompletos para ${symbol} - Se requerirá revisión manual`);
      }

      return marketData;
    } catch (error) {
      console.error(`❌ Error al obtener datos para ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Obtiene datos del contexto de mercado (SPY, QQQ, VIX)
   */
  async getMarketContext(): Promise<MarketContext | null> {
    try {
      const spy = await this.getMarketData('SPY');
      const qqq = await this.getMarketData('QQQ');
      const vix = await this.getMarketData('VIX');

      if (!spy || !qqq || !vix) {
        console.error('❌ No se pudo obtener contexto de mercado');
        return null;
      }

      return {
        spy,
        qqq,
        vix,
        marketIsOpen: this.isMarketOpen(),
        timeUntilClose: this.getTimeUntilClose(),
      };
    } catch (error) {
      console.error('❌ Error al obtener contexto de mercado:', error);
      return null;
    }
  }

  /**
   * Obtiene datos de Alpha Vantage
   */
  private async fetchAlphaVantageData(
    symbol: string,
    marketData: MarketData
  ): Promise<void> {
    try {
      const url = `https://www.alphavantage.co/query`;
      const params = {
        function: 'GLOBAL_QUOTE',
        symbol,
        apikey: this.alphaVantageKey,
      };

      const response = await axios.get(url, { params, timeout: 5000 });
      const quote = response.data['Global Quote'];

      if (quote && quote.price) {
        marketData.price = parseFloat(quote.price);
        marketData.volume = parseInt(quote.volume) || 0;
      }

      // Obtener RSI
      await this.fetchRSI(symbol, marketData);
      // Obtener tendencia
      await this.fetchTrend(symbol, marketData);
    } catch (error) {
      console.error(`⚠️ Error al obtener datos de Alpha Vantage para ${symbol}:`, error);
    }
  }

  /**
   * Obtiene RSI desde Alpha Vantage
   */
  private async fetchRSI(symbol: string, marketData: MarketData): Promise<void> {
    try {
      const url = `https://www.alphavantage.co/query`;
      const params = {
        function: 'RSI',
        symbol,
        interval: '1min',
        time_period: 14,
        apikey: this.alphaVantageKey,
      };

      const response = await axios.get(url, { params, timeout: 5000 });
      const data = response.data['Technical Analysis: RSI'];

      if (data) {
        const latestRSI = Object.values(data)[0] as any;
        marketData.rsi = parseFloat(latestRSI.RSI);
      }
    } catch (error) {
      console.error(`⚠️ Error al obtener RSI para ${symbol}`);
    }
  }

  /**
   * Determina la tendencia basada en SMA
   */
  private async fetchTrend(symbol: string, marketData: MarketData): Promise<void> {
    try {
      const url = `https://www.alphavantage.co/query`;
      const params = {
        function: 'SMA',
        symbol,
        interval: '1min',
        time_period: 20,
        apikey: this.alphaVantageKey,
      };

      const response = await axios.get(url, { params, timeout: 5000 });
      const data = response.data['Technical Analysis: SMA'];

      if (data && marketData.price) {
        const sma20 = parseFloat(Object.values(data)[0] as any);
        marketData.trend =
          marketData.price > sma20
            ? 'alcista'
            : marketData.price < sma20
              ? 'bajista'
              : 'lateral';
      }
    } catch (error) {
      console.error(`⚠️ Error al obtener tendencia para ${symbol}`);
    }
  }

  /**
   * Obtiene datos de Finnhub (información adicional)
   */
  private async fetchFinnhubData(symbol: string, marketData: MarketData): Promise<void> {
    try {
      const url = `https://finnhub.io/api/v1/quote`;
      const params = {
        symbol,
        token: this.finnhubKey,
      };

      const response = await axios.get(url, { params, timeout: 5000 });
      const data = response.data;

      if (data.c) marketData.price = data.c;
      if (data.v) marketData.volume = data.v;
    } catch (error) {
      console.error(`⚠️ Error al obtener datos de Finnhub para ${symbol}`);
    }
  }

  /**
   * Verifica si el mercado está abierto
   */
  private isMarketOpen(): boolean {
    const now = new Date();
    const day = now.getUTCDay();
    const hours = now.getUTCHours();
    const minutes = now.getUTCMinutes();

    // Mercado abierto: lunes a viernes, 9:30-16:00 ET (14:30-21:00 UTC)
    if (day === 0 || day === 6) return false;
    if (hours < 14) return false;
    if (hours > 21) return false;
    if (hours === 21 && minutes > 0) return false;

    return true;
  }

  /**
   * Calcula minutos hasta cierre de mercado
   */
  private getTimeUntilClose(): number | null {
    if (!this.isMarketOpen()) return null;

    const now = new Date();
    const close = new Date(now);
    close.setUTCHours(21, 0, 0, 0);

    const diffMs = close.getTime() - now.getTime();
    return Math.floor(diffMs / 60000);
  }

  /**
   * Calcula la liquidez (volumen promedio / spread aproximado)
   */
  calculateLiquidity(volume: number, spread: number = 0.01): number {
    return volume > 0 ? volume / Math.max(spread, 0.01) : 0;
  }

  /**
   * Determina zona Premium/Discount basada en RSI y precio relativo
   */
  determinePremiumDiscount(price: number, sma20: number, rsi: number | null): 'premium' | 'discount' | 'neutral' | 'desconocido' {
    if (rsi === null) return 'desconocido';

    if (price > sma20 && rsi > 60) return 'premium';
    if (price < sma20 && rsi < 40) return 'discount';
    return 'neutral';
  }
}
