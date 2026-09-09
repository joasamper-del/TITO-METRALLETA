#!/usr/bin/env npx ts-node

/**
 * S60 LIVE CRYPTO AUDIT
 * Verificar: conexión, precios, volumen, tendencia
 * Proponer: ENTRAR / ESPERAR / RECHAZAR
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

interface CryptoAudit {
  timestamp: Date;
  symbol: string;
  price: number;
  priceTime: string;
  priceFreshness: 'FRESH' | 'STALE' | 'ERROR';
  dayVolume: number;
  volumeFreshness: 'FRESH' | 'STALE' | 'ERROR';
  ma50: number | null;
  ma200: number | null;
  trend: 'UPTREND' | 'DOWNTREND' | 'NEUTRAL';
  trendStrength: number; // 0-100
  rsi: string; // "MISSING" or value
  atr: string; // "MISSING" or value
  proposedSignal: 'ENTRAR' | 'ESPERAR' | 'RECHAZAR';
  proposedReason: string;
  proposedEntry: number | null;
  proposedStop: number | null;
  proposedTarget: number | null;
}

class CryptoAuditEngine {
  private apiKey = process.env.ALPACA_API_KEY || '';
  private apiSecret = process.env.ALPACA_SECRET_KEY || '';
  private baseUrl = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets';
  private dataUrl = 'https://data.alpaca.markets';

  private client = axios.create({
    baseURL: this.baseUrl,
    headers: {
      'APCA-API-KEY-ID': this.apiKey,
      'APCA-API-SECRET-KEY': this.apiSecret,
    },
    timeout: 10000,
  });

  private dataClient = axios.create({
    baseURL: this.dataUrl,
    headers: {
      'APCA-API-KEY-ID': this.apiKey,
      'APCA-API-SECRET-KEY': this.apiSecret,
    },
    timeout: 10000,
  });

  async audit(): Promise<void> {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║        S60: LIVE CRYPTO AUDIT — VALIDACIÓN EN VIVO          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Test 1: Connectivity
    console.log('📡 PASO 1: Verificando conexión a Alpaca Paper...\n');
    const connected = await this.testConnectivity();
    if (!connected) {
      console.log('❌ FALLO: No hay conexión a Alpaca Paper');
      return;
    }

    // Test 2: Get current data
    console.log('\n📊 PASO 2: Obteniendo datos en vivo (BTC/USD + ETH/USD)...\n');
    const btcAudit = await this.auditSymbol('BTCUSD');
    const ethAudit = await this.auditSymbol('ETHUSD');

    if (!btcAudit || !ethAudit) {
      console.log('❌ FALLO: No se pudieron obtener datos de crypto');
      return;
    }

    // Test 3: Display results
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                     RESULTADOS AUDITORÍA                   ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    this.displayAudit(btcAudit);
    this.displayAudit(ethAudit);

    // Test 4: Propose signals
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║               PROPUESTA DE OPORTUNIDADES                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    this.proposeSignal(btcAudit);
    this.proposeSignal(ethAudit);

    // Save audit
    const auditData = {
      timestamp: new Date().toISOString(),
      btc: btcAudit,
      eth: ethAudit,
      generatedAt: new Date().toISOString(),
    };

    console.log('\n✅ Auditoría completada. Esperando autorización para continuar...\n');
  }

  private async testConnectivity(): Promise<boolean> {
    try {
      const response = await this.client.get('/v2/account');
      if (response.status === 200) {
        console.log('✅ Conexión a Alpaca Paper: OK');
        console.log(`   Endpoint: ${this.baseUrl}`);
        console.log(`   Account Status: ${response.data.status}`);
        return true;
      }
    } catch (error: any) {
      console.log(`❌ Error de conexión: ${error.message}`);
    }
    return false;
  }

  private async auditSymbol(symbol: string): Promise<CryptoAudit | null> {
    try {
      const now = new Date();
      const audit: CryptoAudit = {
        timestamp: now,
        symbol,
        price: 0,
        priceTime: '',
        priceFreshness: 'ERROR',
        dayVolume: 0,
        volumeFreshness: 'ERROR',
        ma50: null,
        ma200: null,
        trend: 'NEUTRAL',
        trendStrength: 0,
        rsi: 'MISSING',
        atr: 'MISSING',
        proposedSignal: 'ESPERAR',
        proposedReason: '',
        proposedEntry: null,
        proposedStop: null,
        proposedTarget: null,
      };

      // Get current price from positions (most reliable for Paper Trading)
      try {
        const positions = await this.client.get('/v2/positions');
        const position = positions.data.find((p: any) =>
          p.symbol === symbol || p.symbol === symbol.replace('USD', '/USD')
        );

        if (position) {
          audit.price = parseFloat(position.current_price || 0);
          audit.priceTime = now.toISOString();
          audit.priceFreshness = 'FRESH';
        }
      } catch (e) {
        // Continue without position data
      }

      // Try to get historical bars (crypto endpoint)
      let barsResponse: any = null;
      try {
        barsResponse = await this.dataClient.get(
          `/v2/crypto/${symbol}/bars`,
          { params: { timeframe: '1day', limit: 200 } }
        );
      } catch (e) {
        // Fallback: try without prefix or different format
        try {
          const cleanSymbol = symbol.replace('USD', '').replace('/USD', '');
          barsResponse = await this.dataClient.get(
            `/v2/stocks/${cleanSymbol}USD/bars`,
            { params: { timeframe: '1day', limit: 200, adjustment: 'all' } }
          );
        } catch (e2) {
          // Continue without bars data
        }
      }

      if (barsResponse.data?.bars && barsResponse.data.bars.length > 0) {
        const bars = barsResponse.data.bars;

        // Latest volume
        const latestBar = bars[bars.length - 1];
        audit.dayVolume = latestBar.v || 0;
        audit.volumeFreshness = 'FRESH';

        // Calculate MA50 and MA200
        if (bars.length >= 50) {
          audit.ma50 = this.calculateMA(bars, 50);
        }
        if (bars.length >= 200) {
          audit.ma200 = this.calculateMA(bars, 200);
        }

        // Determine trend
        if (audit.ma50 && audit.ma200) {
          if (audit.price > audit.ma50 && audit.ma50 > audit.ma200) {
            audit.trend = 'UPTREND';
            audit.trendStrength = Math.min(100, (audit.price - audit.ma200) / audit.ma200 * 100);
          } else if (audit.price < audit.ma50 && audit.ma50 < audit.ma200) {
            audit.trend = 'DOWNTREND';
            audit.trendStrength = Math.min(100, (audit.ma200 - audit.price) / audit.ma200 * 100);
          } else {
            audit.trend = 'NEUTRAL';
            audit.trendStrength = 50;
          }
        }
      }

      // RSI and ATR are NOT available in Alpaca crypto data
      audit.rsi = 'MISSING (TradingView no integrado)';
      audit.atr = 'MISSING (TradingView no integrado)';

      // Propose signal
      audit.proposedReason = this.analyzeSignal(audit);
      if (audit.trend === 'UPTREND' && audit.trendStrength > 70 && audit.dayVolume > 1000000) {
        audit.proposedSignal = 'ENTRAR';
        audit.proposedEntry = audit.price;
        audit.proposedStop = audit.price * 0.99; // 1% stop
        audit.proposedTarget = audit.price * 1.02; // 2% target
      } else if (audit.trend === 'DOWNTREND' || audit.dayVolume < 1000000) {
        audit.proposedSignal = 'RECHAZAR';
      } else {
        audit.proposedSignal = 'ESPERAR';
      }

      return audit;
    } catch (error: any) {
      console.log(`❌ Error auditando ${symbol}: ${error.message}`);
      return null;
    }
  }

  private calculateMA(bars: any[], period: number): number {
    const slice = bars.slice(-period);
    const sum = slice.reduce((acc, bar) => acc + (bar.c || 0), 0);
    return sum / period;
  }

  private checkFreshness(timestamp: string): boolean {
    const priceTime = new Date(timestamp).getTime();
    const now = Date.now();
    const ageSec = (now - priceTime) / 1000;
    return ageSec < 60; // Fresh if < 1 minute old
  }

  private analyzeSignal(audit: CryptoAudit): string {
    const parts: string[] = [];

    if (audit.price === 0) {
      return '❌ No hay precio disponible';
    }

    parts.push(`📈 Trend: ${audit.trend} (fuerza: ${audit.trendStrength.toFixed(1)}%)`);

    if (audit.ma50) {
      const ma50Diff = ((audit.price - audit.ma50) / audit.ma50 * 100).toFixed(2);
      parts.push(`📊 Precio vs MA50: ${ma50Diff}%`);
    }

    if (audit.ma200) {
      const ma200Diff = ((audit.price - audit.ma200) / audit.ma200 * 100).toFixed(2);
      parts.push(`📊 Precio vs MA200: ${ma200Diff}%`);
    }

    parts.push(
      `💧 Volumen: ${(audit.dayVolume / 1000000).toFixed(2)}M USD`
    );

    if (audit.dayVolume < 1000000) {
      parts.push('⚠️ Volumen bajo (< 1M) — RIESGO de illiquidez');
    }

    parts.push('🔴 RSI: FALTA (TVContext no integrado)');
    parts.push('🔴 ATR: FALTA (TVContext no integrado)');
    parts.push('💡 Señal basada solo en: Precio + Tendencia + Volumen');

    return parts.join(' | ');
  }

  private displayAudit(audit: CryptoAudit): void {
    console.log(`╔═══════════════════════════════════════════════════════════╗`);
    console.log(`║  ${audit.symbol.padEnd(57)} ║`);
    console.log(`╠═══════════════════════════════════════════════════════════╣`);
    console.log(`║ Hora: ${new Date(audit.timestamp).toLocaleTimeString('es-ES')}`);
    console.log(`║ Precio: $${audit.price.toFixed(2).padEnd(50)} ║`);
    console.log(`║ Frescura: ${audit.priceFreshness.padEnd(51)} ║`);
    console.log(`║ Volumen 24h: ${(audit.dayVolume / 1000000).toFixed(2)}M USD`.padEnd(59) + '║');
    console.log(`║ Tendencia: ${audit.trend} (${audit.trendStrength.toFixed(1)}%)`.padEnd(59) + '║');
    if (audit.ma50) console.log(`║ MA50: $${audit.ma50.toFixed(2)}`.padEnd(59) + '║');
    if (audit.ma200) console.log(`║ MA200: $${audit.ma200.toFixed(2)}`.padEnd(59) + '║');
    console.log(`╠═══════════════════════════════════════════════════════════╣`);
    console.log(`║ RSI: ${audit.rsi.padEnd(53)} ║`);
    console.log(`║ ATR: ${audit.atr.padEnd(53)} ║`);
    console.log(`╚═══════════════════════════════════════════════════════════╝\n`);
  }

  private proposeSignal(audit: CryptoAudit): void {
    const signalEmoji =
      audit.proposedSignal === 'ENTRAR' ? '✅' :
      audit.proposedSignal === 'ESPERAR' ? '⏸️' :
      '❌';

    console.log(`${signalEmoji} ${audit.symbol}: ${audit.proposedSignal}`);
    console.log(`   Razón: ${audit.proposedReason}`);

    if (audit.proposedEntry) {
      console.log(`   📍 Entrada: $${audit.proposedEntry.toFixed(2)}`);
      console.log(`   🛑 Stop Loss: $${audit.proposedStop?.toFixed(2)}`);
      console.log(`   🎯 Take Profit: $${audit.proposedTarget?.toFixed(2)}`);
      console.log(`   ⚠️ NIVEL DE INVALIDACIÓN: Cierre por debajo de $${audit.proposedStop?.toFixed(2)}`);
    }
    console.log('');
  }
}

// Run audit
const engine = new CryptoAuditEngine();
engine.audit().catch(err => {
  console.error('❌ Error fatal:', err.message);
  process.exit(1);
});
