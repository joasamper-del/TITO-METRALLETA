#!/usr/bin/env npx ts-node
"use strict";
/**
 * S60 OBSERVATION ENGINE - 24 HOUR CONTINUOUS MONITORING
 *
 * CRITICAL: This script MUST run persistently for 24 hours
 * Check at end of file for deployment options
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
class ObservationEngine {
    constructor() {
        this.observations = [];
        this.cycleCount = 0;
        this.startTime = new Date();
        this.logsDir = path.join(__dirname, '../audit/s60-observations');
    }
    async start() {
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║   S60: OBSERVATION ENGINE — 24H MONITORING INICIADO        ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');
        // Create logs directory
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }
        // Verify connectivity once
        console.log('📡 Verificando conectividad inicial...');
        const connected = await this.verifyConnection();
        if (!connected) {
            console.log('❌ FALLO: No puede conectar a Alpaca Paper');
            process.exit(1);
        }
        console.log(`✅ Conectado. Iniciando observación cíclica...`);
        console.log(`📁 Logs guardándose en: ${this.logsDir}`);
        console.log(`⏱️  Intervalo: cada 10 minutos`);
        console.log(`📊 Duración esperada: 24 horas (144 ciclos)\n`);
        // Save start marker
        this.saveStatus('STARTED', this.startTime);
        // Run observation loop
        await this.observationLoop();
    }
    async verifyConnection() {
        try {
            const response = await client.get('/v2/account');
            return response.status === 200;
        }
        catch (error) {
            return false;
        }
    }
    async observationLoop() {
        // Run first observation immediately
        await this.collectObservation();
        // Then run every 10 minutes
        const intervalId = setInterval(async () => {
            await this.collectObservation();
        }, 10 * 60 * 1000); // 10 minutes
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            console.log('\n\n📊 Deteniendo observación...');
            clearInterval(intervalId);
            this.saveStatus('STOPPED', new Date());
            this.generateReport();
            process.exit(0);
        });
        console.log('✅ Loop iniciado. El observador continuará ejecutándose...');
        console.log('⚠️  IMPORTANTE: Este proceso DEBE permanecer activo 24 horas');
        console.log('   Mantenga la sesión/terminal abierta, o use opciones de persistencia\n');
    }
    async collectObservation() {
        this.cycleCount++;
        const now = new Date();
        const observations = [];
        try {
            // Get positions
            const positions = await client.get('/v2/positions');
            // Observe ETH (tiene posición abierta)
            const ethPos = positions.data.find((p) => p.symbol === 'ETHUSD');
            if (ethPos) {
                const ethObs = {
                    cycleNumber: this.cycleCount,
                    timestamp: now.toISOString(),
                    unixTime: now.getTime(),
                    symbol: 'ETHUSD',
                    currentPrice: parseFloat(ethPos.current_price || 0),
                    priceSource: 'alpaca-positions',
                    priceFreshness: 'REAL',
                    entryPrice: parseFloat(ethPos.avg_entry_price || 0),
                    quantity: parseFloat(ethPos.qty || 0),
                    pnl: parseFloat(ethPos.unrealized_gain || 0),
                    pnlPercent: parseFloat(ethPos.unrealized_gain_pct || 0) * 100,
                    volume: 'MISSING',
                    trend: 'MISSING',
                    rsi: 'MISSING',
                    atr: 'MISSING',
                    proposedSignal: ethPos.unrealized_gain_pct > 0.015 ? 'HOLD' : 'WAIT',
                    reason: `Price: $${parseFloat(ethPos.current_price || 0).toFixed(2)} | Entry: $${parseFloat(ethPos.avg_entry_price || 0).toFixed(2)} | P&L: ${(parseFloat(ethPos.unrealized_gain_pct || 0) * 100).toFixed(2)}%`,
                };
                observations.push(ethObs);
            }
            // Try to observe BTC (sin posición)
            const btcPos = positions.data.find((p) => p.symbol === 'BTCUSD');
            if (!btcPos) {
                const btcObs = {
                    cycleNumber: this.cycleCount,
                    timestamp: now.toISOString(),
                    unixTime: now.getTime(),
                    symbol: 'BTCUSD',
                    currentPrice: 0,
                    priceSource: 'missing',
                    priceFreshness: 'UNKNOWN',
                    volume: 'MISSING',
                    trend: 'MISSING',
                    rsi: 'MISSING',
                    atr: 'MISSING',
                    proposedSignal: 'UNKNOWN',
                    reason: 'Sin posición abierta ni datos de precio en Alpaca API pública',
                };
                observations.push(btcObs);
            }
            // Store observations
            this.observations.push(...observations);
            // Save cycle to file
            const cycleFile = path.join(this.logsDir, `cycle-${String(this.cycleCount).padStart(3, '0')}.json`);
            fs.writeFileSync(cycleFile, JSON.stringify({
                cycle: this.cycleCount,
                timestamp: now.toISOString(),
                observations,
            }, null, 2));
            // Display progress
            this.displayProgress(observations);
        }
        catch (error) {
            console.log(`❌ Ciclo ${this.cycleCount}: Error - ${error.message}`);
        }
    }
    displayProgress(observations) {
        const elapsed = Math.floor((new Date().getTime() - this.startTime.getTime()) / 1000 / 60);
        const progress = Math.min(100, Math.round((this.cycleCount / 144) * 100));
        console.log(`\n[${new Date().toLocaleTimeString('es-ES')}] Ciclo ${this.cycleCount}/144 (${elapsed} min, ${progress}%)`);
        for (const obs of observations) {
            if (obs.symbol === 'ETHUSD' && obs.priceSource === 'alpaca-positions') {
                console.log(`  💰 ETH: $${obs.currentPrice.toFixed(2)} | Entry: $${obs.entryPrice?.toFixed(2)} | P&L: ${obs.pnlPercent?.toFixed(2)}%`);
            }
            else if (obs.symbol === 'BTCUSD') {
                console.log(`  ❌ BTC: NO HAY DATOS`);
            }
        }
    }
    saveStatus(status, time) {
        const statusFile = path.join(this.logsDir, 'status.json');
        const data = fs.existsSync(statusFile) ? JSON.parse(fs.readFileSync(statusFile, 'utf-8')) : {};
        data[status] = time.toISOString();
        fs.writeFileSync(statusFile, JSON.stringify(data, null, 2));
    }
    generateReport() {
        const endTime = new Date();
        const elapsedHours = (endTime.getTime() - this.startTime.getTime()) / 1000 / 60 / 60;
        const report = {
            title: 'S60 Observation Report',
            startTime: this.startTime.toISOString(),
            endTime: endTime.toISOString(),
            elapsedHours: elapsedHours.toFixed(2),
            cyclesCompleted: this.cycleCount,
            expectedCycles: 144,
            completeness: `${Math.round((this.cycleCount / 144) * 100)}%`,
            observations: this.observations,
            summary: {
                ethObservations: this.observations.filter(o => o.symbol === 'ETHUSD' && o.priceSource === 'alpaca-positions').length,
                btcMissing: this.observations.filter(o => o.symbol === 'BTCUSD' && o.priceSource === 'missing').length,
                indicators: {
                    price: 'REAL (Alpaca positions)',
                    volume: 'MISSING',
                    trend: 'MISSING',
                    rsi: 'MISSING',
                    atr: 'MISSING',
                },
            },
            notes: [
                'Observación completada exitosamente',
                'ETH: datos reales de Alpaca',
                'BTC: sin datos (no hay posición abierta ni API pública)',
                'Indicadores técnicos: FALTA integración TVContext',
                'Próximo paso: implementar integración de datos técnicos',
            ],
        };
        const reportPath = path.join(this.logsDir, 'report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        console.log(`\n✅ Reporte guardado en: ${reportPath}`);
    }
}
// Start engine
const engine = new ObservationEngine();
engine.start().catch(err => {
    console.error('❌ Error fatal:', err.message);
    process.exit(1);
});
/*
╔════════════════════════════════════════════════════════════╗
║  OPCIONES DE PERSISTENCIA (para mantener 24h activo)       ║
╚════════════════════════════════════════════════════════════╝

OPCIÓN 1: NestJS App (RECOMENDADO)
────────────────────────────────────
Crear servicio en NestJS que ejecute observación como background task:

  // src/modules/s60/s60-observation.service.ts
  @Injectable()
  export class S60ObservationService implements OnModuleInit {
    onModuleInit() {
      this.startObservation24h(); // Inicia cuando app arranca
    }
  }

Ventaja: Corre mientras app está activa (ideal para servidor)
Desventaja: Se detiene si app reinicia


OPCIÓN 2: PM2 (Process Manager)
────────────────────────────────
  npm install -g pm2
  pm2 start audit-crypto-24h.ts --name "s60-observer"
  pm2 save
  pm2 startup

Ventaja: Auto-restart si falla
Desventaja: Requiere servidor/máquina siempre encendida


OPCIÓN 3: Docker Container
───────────────────────────
Crear Dockerfile que ejecute observador en background

Ventaja: Portable, reproducible
Desventaja: Requiere Docker


OPCIÓN 4: Cron Job (Linux/Mac)
──────────────────────────────
  0 0 * * * npx ts-node /path/to/s60-observer-24h.ts

Ventaja: Simple
Desventaja: Solo ejecuta 1x por día, no 24h continuo


OPCIÓN 5: Esta sesión (CORTA)
──────────────────────────────
Mantener terminal abierta durante 24h
- Funciona solo mientras sesión está abierta
- Mejor para prueba corta (1-2 horas)

RECOMENDACIÓN PARA HOY:
═════════════════════════
- Ejecutar prueba corta (1 ciclo = 10 min) AHORA
- Demostrar que funciona
- Luego: integrar en NestJS o PM2 para 24h genuinas
*/
