/**
 * Paper Trading Agent - Simula operaciones automáticas de Tito Metralleta
 * Envía análisis de SPY al backend cada 5 minutos
 */

const http = require('http');

const API_URL = 'http://localhost:3001/api/api/analyze';

// Estrategias y planes de trading
const strategies = [
  { name: 'Momentum', entry: 485, target: 495, stop: 475 },
  { name: 'Support/Resistance', entry: 480, target: 500, stop: 470 },
  { name: 'Volatility Play', entry: 490, target: 510, stop: 480 },
  { name: 'Trending', entry: 475, target: 505, stop: 465 },
  { name: 'Gap Fill', entry: 488, target: 502, stop: 478 },
];

function getRandomStrategy() {
  return strategies[Math.floor(Math.random() * strategies.length)];
}

function analyzeSpySignal() {
  const strategy = getRandomStrategy();

  const data = JSON.stringify({
    symbol: 'SPY',
    strategy: strategy.name,
    plan: {
      entry: strategy.entry,
      target: strategy.target,
      stop: strategy.stop,
      notes: `Paper trading signal - ${new Date().toLocaleTimeString('es-ES')}`
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
          console.log(`[${timestamp}] ✅ SPY/${strategy.name} → ${json.decision.toUpperCase()} (ID: ${json.id.slice(0, 8)}...)`);
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

// Main loop
async function start() {
  console.log('\n🤖 AGENTE DE PAPER TRADING - INICIADO\n');
  console.log('📊 Enviando señales de SPY al backend...\n');

  let count = 0;

  // Enviar 5 análisis iniciales
  for (let i = 0; i < 5; i++) {
    try {
      await analyzeSpySignal();
      count++;
      await new Promise(resolve => setTimeout(resolve, 500)); // Esperar 500ms entre análisis
    } catch (err) {
      console.error(`❌ Error: ${err.message}`);
    }
  }

  console.log(`\n✅ ${count} análisis de SPY enviados exitosamente`);
  console.log('📍 Revisa las operaciones en PostgreSQL');
  console.log('\nPara enviar más análisis, ejecuta nuevamente: node paper_trading_agent.js\n');
}

start().catch(console.error);
