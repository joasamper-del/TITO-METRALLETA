#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║       MARKETSNACK VALIDATION — DIAGNÓSTICO                ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

// Verificar configuración
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const cookieMatch = envContent.match(/^MARKETSNACK_COOKIE=(.+)$/m);

if (!cookieMatch) {
  console.error('❌ MARKETSNACK_COOKIE no encontrada');
  process.exit(1);
}

const cookie = cookieMatch[1].trim();

console.log('✅ CONFIGURACIÓN:');
console.log('   Archivo: backend/.env.local');
console.log('   Variable: MARKETSNACK_COOKIE');
console.log(`   Longitud: ${cookie.length} caracteres`);
console.log(`   Formato: ${cookie.substring(0, 20)}...`);
console.log('');

console.log('━'.repeat(60));
console.log('VERIFICACIÓN DE CONECTIVIDAD');
console.log('━'.repeat(60));

// Test 1: DNS resolution
const dns = require('dns').promises;
dns.resolve4('app.marketsnack.com')
  .then(addresses => {
    console.log('✅ DNS: app.marketsnack.com resuelve correctamente');
    console.log(`   IP: ${addresses[0]}`);
    console.log('');
    
    // Si DNS funciona, probamos con timeout más largo (30s)
    console.log('🔄 Intentando conexión HTTPS con timeout extendido (30s)...\n');
    
    const options = {
      hostname: 'app.marketsnack.com',
      port: 443,
      path: '/api/flow_feed?filter[scope]=all&period=1d&limit=1',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cookie': cookie,
      },
      timeout: 30000 // 30 segundos
    };
    
    const https = require('https');
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        console.log(`✅ RESPUESTA HTTP: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          console.log('✅ SESIÓN ACEPTADA (200 OK)');
          try {
            const json = JSON.parse(data);
            console.log('✅ DATOS VÁLIDOS (JSON parseable)');
            console.log(`   Campos: ${Object.keys(json).join(', ')}`);
            console.log('\n🟢 MARKETSNACKS: OPERATIVO Y FUNCIONAL\n');
          } catch (e) {
            console.log('⚠️  Respuesta 200 pero no JSON');
          }
        } else if (res.statusCode === 401 || res.statusCode === 403) {
          console.log('❌ SESIÓN RECHAZADA (autenticación fallida)');
          console.log('   → Cookie puede estar expirada');
        } else {
          console.log(`⚠️  HTTP ${res.statusCode}`);
        }
      });
    });
    
    req.on('error', (e) => {
      console.log(`❌ ERROR DE CONEXIÓN: ${e.message}`);
    });
    
    req.on('timeout', () => {
      console.log('⚠️  TIMEOUT después de 30s');
      console.log('   → MarketSnacks no responde o está muy lento');
      console.log('   → Network access may be limited in this environment');
    });
    
  })
  .catch(err => {
    console.log('❌ DNS: No se pudo resolver app.marketsnack.com');
    console.log(`   Error: ${err.message}`);
    console.log('   → Network access may be limited in this environment');
  });

