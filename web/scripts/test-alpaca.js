#!/usr/bin/env node

/**
 * Script temporal de prueba segura - Alpaca Paper Trading
 * Solo lectura: verifica URL, estado de cuenta y poder adquisitivo
 * NO envía órdenes, NO muestra credenciales
 */

const fs = require('fs');
const path = require('path');

// 1. Cargar variables desde .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local no encontrado');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};

envContent.split('\n').forEach(line => {
  if (!line || line.startsWith('#')) return;
  const eqIndex = line.indexOf('=');
  if (eqIndex > 0) {
    const key = line.substring(0, eqIndex).trim();
    const value = line.substring(eqIndex + 1).trim();
    if (key && value) {
      env[key] = value;
    }
  }
});

// 2. Verificar variables requeridas
const required = ['ALPACA_API_KEY', 'ALPACA_SECRET_KEY', 'ALPACA_BASE_URL'];
const missing = required.filter(k => !env[k]);

if (missing.length > 0) {
  console.error(`❌ Variables faltantes: ${missing.join(', ')}`);
  process.exit(1);
}

// 3. Validar seguridad: URL debe ser paper trading
const baseUrl = env.ALPACA_BASE_URL;
if (!baseUrl.includes('paper-api.alpaca.markets')) {
  console.error(`❌ ALERTA DE SEGURIDAD: URL no es paper trading`);
  console.error(`   URL encontrada: ${baseUrl}`);
  console.error(`   URL esperada: https://paper-api.alpaca.markets`);
  process.exit(1);
}

console.log('✅ Verificaciones de seguridad pasadas');
console.log(`✅ URL correcta: ${baseUrl}`);

// 4. Hacer GET request a /v2/account (solo lectura)
const https = require('https');

const url = new URL('/v2/account', baseUrl);
const options = {
  method: 'GET',
  headers: {
    'APCA-API-KEY-ID': env.ALPACA_API_KEY,
    'APCA-API-SECRET-KEY': env.ALPACA_SECRET_KEY
  }
};

console.log('\n📡 Consultando estado de cuenta Paper Trading...\n');

https.request(url, options, (res) => {
  let data = '';

  res.on('data', chunk => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error(`❌ Error HTTP ${res.statusCode}`);
      try {
        const error = JSON.parse(data);
        console.error(`   ${error.message || error}`);
      } catch (e) {
        console.error(`   ${data}`);
      }
      process.exit(1);
    }

    try {
      const account = JSON.parse(data);

      // 5. Reportar solo información no sensible
      console.log('✅ Conexión exitosa a Alpaca Paper Trading\n');
      console.log('📊 ESTADO DE CUENTA (lectura segura):');
      console.log(`   Estado: ${account.account_status || 'N/A'}`);
      console.log(`   Poder Adquisitivo: $${(account.buying_power || 0).toFixed(2)}`);
      console.log(`   Efectivo: $${(account.cash || 0).toFixed(2)}`);
      console.log(`   Portfolio Value: $${(account.portfolio_value || 0).toFixed(2)}`);

      console.log('\n✅ Prueba completada exitosamente');
      console.log('✅ Las credenciales son válidas para Paper Trading');
      console.log('✅ NO se enviaron órdenes');
      console.log('✅ ALPACA_ENABLED debe permanecer en false\n');

      process.exit(0);
    } catch (err) {
      console.error('❌ Error al parsear respuesta:', err.message);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('❌ Error de conexión:', err.message);
  process.exit(1);
});
