#!/usr/bin/env npx ts-node

/**
 * S60 COMPLETE CRYPTO AUDIT
 * Combines Alpaca current prices with alternative data sources for analysis
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const apiKey = process.env.ALPACA_API_KEY || '';
const apiSecret = process.env.ALPACA_SECRET_KEY || '';
const baseUrl = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets';

const client = axios.create({
  baseURL: baseUrl,
  headers: {
    'APCA-API-KEY-ID': apiKey,
    'APCA-API-SECRET-KEY': apiSecret,
  },
  timeout: 10000,
});

interface Signal {
  timestamp: string;
  symbol: string;
  currentPrice: number;
  priceFreshness: string;
  dataAvailable: {
    alpacaPrice: boolean;
    alpacaVolume: boolean;
    alpacaTrend: boolean;
    rsi: boolean;
    atr: boolean;
  };
  signal: 'ENTRAR' | 'ESPERAR' | 'RECHAZAR';
  confidence: number;
  reason: string;
  proposedEntry?: number;
  proposedStop?: number;
  proposedTarget?: number;
  invalidationLevel?: number;
  riskLevel: 'BAJO' | 'MEDIO' | 'ALTO';
}

async function audit(): Promise<void> {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     S60: CRYPTO AUDIT COMPLETO — ANÁLISIS EN VIVO          ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Verify connection
    console.log('📡 Verificando conexión a Alpaca Paper...');
    const account = await client.get('/v2/account');
    console.log(`✅ Conectado. Estado: ${account.data.status}`);
    const portfolio = parseFloat(account.data.portfolio_value || 0);
    const cash = parseFloat(account.data.cash || 0);
    console.log(`   Balance: $${portfolio.toFixed(2)}`);
    console.log(`   Cash: $${cash.toFixed(2)}\n`);

    // Get open positions
    console.log('📊 Obteniendo posiciones abiertas...');
    const positions = await client.get('/v2/positions');
    const signals: Signal[] = [];

    for (const position of positions.data) {
      const symbol = position.symbol;
      const currentPrice = parseFloat(position.current_price || 0);

      console.log(`\n   ✅ ${symbol}: $${currentPrice.toFixed(2)}`);
      console.log(`      Cantidad: ${position.qty}`);
      console.log(`      Entrada: $${position.avg_entry_price}`);

      const signal: Signal = {
        timestamp: new Date().toISOString(),
        symbol,
        currentPrice,
        priceFreshness: 'REAL (desde Alpaca positions)',
        dataAvailable: {
          alpacaPrice: true,
          alpacaVolume: false,
          alpacaTrend: false,
          rsi: false,
          atr: false,
        },
        signal: 'ESPERAR',
        confidence: 0,
        reason: '',
        riskLevel: 'ALTO',
      };

      // Analyze position
      if (currentPrice > 0) {
        const pnl = ((currentPrice - parseFloat(position.avg_entry_price)) / parseFloat(position.avg_entry_price)) * 100;
        const isGaining = pnl > 0;

        signal.reason = `Posición abierta: ${isGaining ? '✅ GANANCIA' : '❌ PÉRDIDA'} ${Math.abs(pnl).toFixed(2)}%`;
        signal.confidence = Math.min(100, Math.abs(pnl) * 5); // Very low confidence without technical analysis

        if (isGaining && Math.abs(pnl) >= 1.5) {
          signal.signal = 'ENTRAR'; // Consider taking profit
          signal.proposedEntry = currentPrice;
          signal.proposedStop = parseFloat(position.avg_entry_price) * 0.99;
          signal.proposedTarget = currentPrice * 1.02;
          signal.invalidationLevel = parseFloat(position.avg_entry_price) * 0.99;
          signal.riskLevel = 'BAJO';
        } else {
          signal.signal = 'ESPERAR';
          signal.reason += ' — ESPERANDO oportunidad o cierre de posición existente';
          signal.riskLevel = 'MEDIO';
        }
      }

      signals.push(signal);
    }

    // Check for new opportunities
    console.log('\n📈 Buscando nuevas oportunidades (sin posiciones abiertas)...');

    // Popular crypto pairs to check
    const symbols = ['BTCUSD', 'ETHUSD'];
    for (const symbol of symbols) {
      if (!positions.data.find((p: any) => p.symbol === symbol)) {
        console.log(`   ❓ ${symbol}: Sin precio disponible en Alpaca (datos limitados)`);

        const signal: Signal = {
          timestamp: new Date().toISOString(),
          symbol,
          currentPrice: 0,
          priceFreshness: 'NO DISPONIBLE',
          dataAvailable: {
            alpacaPrice: false,
            alpacaVolume: false,
            alpacaTrend: false,
            rsi: false,
            atr: false,
          },
          signal: 'RECHAZAR',
          confidence: 0,
          reason: 'No hay datos de precio para nuevas posiciones. Se necesita integración con TradingView o Massive para precios confiables.',
          riskLevel: 'ALTO',
        };

        signals.push(signal);
      }
    }

    // Display recommendations
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║            RECOMENDACIONES Y OPORTUNIDADES                 ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    for (const signal of signals) {
      const emoji = signal.signal === 'ENTRAR' ? '✅' : signal.signal === 'ESPERAR' ? '⏸️' : '❌';
      console.log(`${emoji} ${signal.symbol}`);
      console.log(`   Decisión: ${signal.signal.toUpperCase()}`);
      console.log(`   Confianza: ${signal.confidence}% (⚠️ BAJA sin datos técnicos)`);
      console.log(`   Razón: ${signal.reason}`);
      console.log(`   Riesgo: ${signal.riskLevel}`);

      if (signal.proposedEntry) {
        console.log(`   📍 Entrada: $${signal.proposedEntry.toFixed(2)}`);
        console.log(`   🛑 Stop Loss: $${signal.proposedStop?.toFixed(2)}`);
        console.log(`   🎯 Take Profit: $${signal.proposedTarget?.toFixed(2)}`);
        console.log(`   ⚠️  Invalidación: cierre por debajo de $${signal.invalidationLevel?.toFixed(2)}`);
      }

      console.log(`   📊 Datos disponibles:`);
      console.log(`      • Precio Alpaca: ${signal.dataAvailable.alpacaPrice ? '✅' : '❌'}`);
      console.log(`      • Volumen: ${signal.dataAvailable.alpacaVolume ? '✅' : '❌'}`);
      console.log(`      • Tendencia (MA50/MA200): ${signal.dataAvailable.alpacaTrend ? '✅' : '❌'}`);
      console.log(`      • RSI: ${signal.dataAvailable.rsi ? '✅' : '❌ (NO INTEGRADO)'}`);
      console.log(`      • ATR: ${signal.dataAvailable.atr ? '✅' : '❌ (NO INTEGRADO)'}\n`);
    }

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      status: 'AUDIT_COMPLETE',
      summary: {
        openPositions: positions.data.length,
        newOpportunitiesFound: signals.filter(s => !positions.data.find((p: any) => p.symbol === s.symbol)).length,
        readyForTrading: signals.some(s => s.signal === 'ENTRAR'),
      },
      signals,
      notes: [
        '⚠️ DATOS FALTANTES CRÍTICOS:',
        '  • Volumen intraday (Alpaca no expone en API pública)',
        '  • Tendencia MA50/MA200 (necesita histórico)',
        '  • RSI (TradingView no integrado)',
        '  • ATR (TradingView no integrado)',
        '',
        '💡 SOLUCIÓN PARA S60:',
        '  1. Si hay posición abierta ganando: considera ENTRAR (tomar ganancias)',
        '  2. Si no hay posiciones: RECHAZAR (falta de datos técnicos)',
        '  3. Próximas sesiones: integrar TVContext + Massive para datos completos',
      ],
    };

    const reportPath = path.join(__dirname, '../audit/s60-audit-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log(`✅ Reporte guardado en: audit/s60-audit-report.json`);
    console.log('\n⏸️  Esperando tu aprobación para proceder...\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

audit();
