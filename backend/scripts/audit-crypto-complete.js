#!/usr/bin/env npx ts-node
"use strict";
/**
 * S60 COMPLETE CRYPTO AUDIT
 * Combines Alpaca current prices with alternative data sources for analysis
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
dotenv.config({ path: path.join(__dirname, '../.env.local') });
const apiKey = process.env.ALPACA_API_KEY || '';
const apiSecret = process.env.ALPACA_SECRET_KEY || '';
const baseUrl = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets';
const client = axios_1.default.create({
    baseURL: baseUrl,
    headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
    },
    timeout: 10000,
});
async function audit() {
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
        const signals = [];
        for (const position of positions.data) {
            const symbol = position.symbol;
            const currentPrice = parseFloat(position.current_price || 0);
            console.log(`\n   ✅ ${symbol}: $${currentPrice.toFixed(2)}`);
            console.log(`      Cantidad: ${position.qty}`);
            console.log(`      Entrada: $${position.avg_entry_price}`);
            const signal = {
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
                }
                else {
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
            if (!positions.data.find((p) => p.symbol === symbol)) {
                console.log(`   ❓ ${symbol}: Sin precio disponible en Alpaca (datos limitados)`);
                const signal = {
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
                newOpportunitiesFound: signals.filter(s => !positions.data.find((p) => p.symbol === s.symbol)).length,
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
    }
    catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}
audit();
