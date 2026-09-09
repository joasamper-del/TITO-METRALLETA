import { MarketData, MarketContext } from '../types';
export declare class DataEngine {
    private alphaVantageKey;
    private finnhubKey;
    constructor(alphaVantageKey?: string, finnhubKey?: string);
    /**
     * Obtiene datos de mercado para un símbolo específico
     */
    getMarketData(symbol: string): Promise<MarketData | null>;
    /**
     * Obtiene datos del contexto de mercado (SPY, QQQ, VIX)
     */
    getMarketContext(): Promise<MarketContext | null>;
    /**
     * Obtiene datos de Alpha Vantage
     */
    private fetchAlphaVantageData;
    /**
     * Obtiene RSI desde Alpha Vantage
     */
    private fetchRSI;
    /**
     * Determina la tendencia basada en SMA
     */
    private fetchTrend;
    /**
     * Obtiene datos de Finnhub (información adicional)
     */
    private fetchFinnhubData;
    /**
     * Verifica si el mercado está abierto
     */
    private isMarketOpen;
    /**
     * Calcula minutos hasta cierre de mercado
     */
    private getTimeUntilClose;
    /**
     * Calcula la liquidez (volumen promedio / spread aproximado)
     */
    calculateLiquidity(volume: number, spread?: number): number;
    /**
     * Determina zona Premium/Discount basada en RSI y precio relativo
     */
    determinePremiumDiscount(price: number, sma20: number, rsi: number | null): 'premium' | 'discount' | 'neutral' | 'desconocido';
}
