#!/usr/bin/env node

/**
 * MarketSnack Real Validation
 * Tests actual connection with MARKETSNACK_COOKIE from backend/.env.local
 * Displays: HTTP status, endpoint tested, session acceptance, data validity
 * Never displays the cookie itself
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║       MARKETSNACK VALIDATION — REAL CONNECTION TEST       ║');
console.log('║       (No secrets displayed, only results)                ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Step 1: Load cookie from backend/.env.local
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('❌ FALLO: backend/.env.local no encontrado');
  process.exit(1);
}

let envContent = fs.readFileSync(envPath, 'utf8');
const cookieMatch = envContent.match(/^MARKETSNACK_COOKIE=(.+)$/m);

if (!cookieMatch || !cookieMatch[1]) {
  console.error('❌ FALLO: MARKETSNACK_COOKIE no definida en backend/.env.local');
  process.exit(1);
}

const cookie = cookieMatch[1].trim();
console.log('✅ Cookie cargada desde: backend/.env.local');
console.log('   (valor no mostrado por seguridad)\n');

// Step 2: Test actual connection
console.log('━'.repeat(60));
console.log('TEST 1: Conexión a /api/flow_feed (limit=1)');
console.log('━'.repeat(60));

const options = {
  hostname: 'app.marketsnack.com',
  port: 443,
  path: '/api/flow_feed?filter[scope]=all&period=1d&limit=1',
  method: 'GET',
  headers: {
    'Accept': 'application/json',
    'Cookie': cookie,
    'User-Agent': 'Tito-Metralleta/1.0 (Validation)'
  },
  timeout: 10000
};

https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`HTTP Status: ${res.statusCode}\n`);

    if (res.statusCode === 200) {
      console.log('✅ SESIÓN ACEPTADA (200 OK)');
      
      // Verificar si hay datos válidos
      try {
        const parsed = JSON.parse(data);
        const hasData = parsed.data || parsed.trades || parsed.flows || parsed.result;
        
        if (hasData) {
          console.log('✅ DATOS VÁLIDOS RECIBIDOS');
          console.log(`   (respuesta JSON con ${Object.keys(parsed).length} campos)\n`);
          
          // Mostrar estructura sin datos sensibles
          const keys = Object.keys(parsed);
          console.log('📊 Estructura de respuesta:');
          keys.forEach(key => {
            const val = parsed[key];
            if (Array.isArray(val)) {
              console.log(`   - ${key}: Array (${val.length} items)`);
            } else if (typeof val === 'object') {
              console.log(`   - ${key}: Object (${Object.keys(val).length} fields)`);
            } else {
              console.log(`   - ${key}: ${typeof val}`);
            }
          });
          
          console.log('\n🟢 MARKETSNACKS: OPERATIVO ✅');
          console.log('   ✓ Sesión válida');
          console.log('   ✓ Endpoint accesible');
          console.log('   ✓ Datos válidos retornados');
          process.exit(0);
        } else {
          console.log('⚠️  200 OK pero sin datos esperados en respuesta');
          console.log(`   Campos recibidos: ${JSON.stringify(keys)}`);
          process.exit(1);
        }
      } catch (e) {
        console.log('⚠️  200 OK pero respuesta no es JSON válido');
        console.log(`   Primeros 200 caracteres: ${data.substring(0, 200)}`);
        process.exit(1);
      }
    } else if (res.statusCode === 401 || res.statusCode === 403) {
      console.log('❌ AUTENTICACIÓN FALLIDA');
      console.log(`   HTTP ${res.statusCode}: Sesión rechazada`);
      console.log('   → Cookie puede estar expirada o inválida');
      process.exit(1);
    } else if (res.statusCode === 404) {
      console.log('❌ ENDPOINT NO ENCONTRADO (404)');
      console.log('   → MarketSnacks endpoint cambió o no existe');
      process.exit(1);
    } else if (res.statusCode >= 500) {
      console.log(`❌ ERROR EN SERVIDOR (${res.statusCode})`);
      process.exit(1);
    } else {
      console.log(`❌ ERROR DESCONOCIDO (HTTP ${res.statusCode})`);
      console.log(`   Respuesta: ${data.substring(0, 200)}`);
      process.exit(1);
    }
  });
}).on('error', (e) => {
  console.log(`❌ ERROR DE CONEXIÓN: ${e.message}`);
  if (e.message.includes('ENOTFOUND')) {
    console.log('   → Sin conexión de red o MarketSnacks no accesible');
  }
  process.exit(1);
}).on('timeout', () => {
  console.log('❌ TIMEOUT: MarketSnacks tardó más de 10 segundos en responder');
  process.exit(1);
});

