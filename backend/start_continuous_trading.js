/**
 * Agente Continuo de Paper Trading para Tito Metralleta
 * Simula operaciones periódicas de trading paper
 * Ejecutar: node start_continuous_trading.js
 */

const http = require('http');
const readline = require('readline');

const API_URL = 'http://localhost:3001/api/api/analyze';
const INTERVAL_MS = 60000; // 1 minuto entre análisis

const symbols = ['SPY', 'QQQ', 'IWM']; // Índices de seguimiento
const strategies = [
  { name: 'Momentum', entry: 485, target: 495, stop: 475 },
  { name: 'Support/Resistance', entry: 480, target: 500, stop: 470 },
  { name: 'Volatility Play', entry: 490, target: 510, stop: 480 },
  { name: 'Trending', entry: 475, target: 505, stop: 465 },
  { name: 'Gap Fill', entry: 488, target: 502, stop: 478 },
  { name: '0DTE', entry: 482, target: 492, stop: 472 },
];

let operationCount = 0;
let isRunning = false;

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getStrategy() {
  return getRandomItem(strategies);
}

function getSymbol() {
  return getRandomItem(symbols);
}

function sendAnalysis(symbol, strategy) {
  const data = JSON.stringify({
    symbol,
    strategy: strategy.name,
    plan: {
      entry: strategy.entry,
      target: strategy.target,
      stop: strategy.stop,
      notes: `Paper trading - ${new Date().toLocaleTimeString('es-ES')}`
    }
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/api/analyze',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(responseData);
          const timestamp = new Date().toLocaleTimeString('es-ES');
          const decisionEmoji = json.decision === 'operar' ? '✅' : json.decision === 'esperar' ? '⏳' : '❌';
          console.log(`[${timestamp}] ${decisionEmoji} ${symbol}/${strategy.name} → ${json.decision.toUpperCase()}`);
          operationCount++;
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runContinuousTrade() {
  console.log('\n🤖 TITO METRALLETA - AGENTE DE PAPER TRADING');
  console.log('='.repeat(60));
  console.log(`📊 Iniciando análisis continuo (cada ${INTERVAL_MS / 1000}s)`);
  console.log(`🎯 Símbolos: ${symbols.join(', ')}`);
  console.log(`📈 Estrategias: ${strategies.map(s => s.name).join(', ')}`);
  console.log('='.repeat(60));
  console.log('\nPresiona CTRL+C para detener\n');

  isRunning = true;
  let cycleCount = 0;

  while (isRunning) {
    try {
      cycleCount++;
      const symbol = getSymbol();
      const strategy = getStrategy();

      await sendAnalysis(symbol, strategy);

      // Esperar antes del siguiente análisis
      await new Promise(resolve => setTimeout(resolve, INTERVAL_MS));

    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Reintentar en 5s
    }
  }
}

// Manejar Ctrl+C gracefully
process.on('SIGINT', () => {
  isRunning = false;
  console.log(`\n\n✅ DETENIDO`);
  console.log(`📊 Total de análisis enviados: ${operationCount}`);
  console.log(`⏱️ Revisa los resultados en PostgreSQL\n`);
  process.exit(0);
});

// Iniciar el agente
runContinuousTrade().catch(console.error);
