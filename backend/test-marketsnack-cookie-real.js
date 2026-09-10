#!/usr/bin/env node

/**
 * MarketSnack Cookie Real Test
 * ══════════════════════════════════════════════════════════════
 * Prueba REAL de la cookie existente en web/.env.local
 * contra el endpoint que Tito usa: /api/flow_feed
 *
 * PATRÓN:
 * 1. Carga cookie desde web/.env.local (sin exponerla)
 * 2. Hace request read-only a /api/flow_feed?limit=1
 * 3. Clasifica respuesta: GREEN/YELLOW/RED/GRAY
 * 4. NO modifica ni migra nada
 */

const fs = require('fs');
const path = require('path');

// ═══ PASO 1: CARGAR COOKIE DESDE web/.env.local ═══
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   MARKETSNACK COOKIE REAL TEST — LECTURA DESDE web/.env   ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

const webEnvPath = path.join(__dirname, '..', 'web', '.env.local');
if (!fs.existsSync(webEnvPath)) {
  console.error('❌ web/.env.local no encontrado en:', webEnvPath);
  process.exit(1);
}

let webEnv = '';
try {
  webEnv = fs.readFileSync(webEnvPath, 'utf8');
} catch (err) {
  console.error('❌ Error leyendo web/.env.local:', err.message);
  process.exit(1);
}

// Parse MARKETSNACK_COOKIE
const cookieMatch = webEnv.match(/^MARKETSNACK_COOKIE=(.+)$/m);
if (!cookieMatch || !cookieMatch[1]) {
  console.error('❌ MARKETSNACK_COOKIE no encontrada en web/.env.local');
  process.exit(1);
}

const cookie = cookieMatch[1].trim();
console.log('✅ Cookie cargada desde: web/.env.local');
console.log(`   Longitud: ${cookie.length} bytes`);
console.log(`   Formato: sesión + atributos`);
console.log('');

// ═══ PASO 2: HACER REQUEST READ-ONLY ═══
console.log('Ejecutando request read-only...');
console.log('ENDPOINT: https://app.marketsnack.com/api/flow_feed');
console.log('PARAMS: filter[scope]=all&period=1d&limit=1');
console.log('');

const BASE_URL = 'https://app.marketsnack.com';
const url = `${BASE_URL}/api/flow_feed?filter[scope]=all&period=1d&limit=1`;

(async () => {
  let response;
  let statusCode = 0;
  let responseBody = '';

  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cookie': cookie,
        'User-Agent': 'Bibliotecario-v1/HealthCheck'
      },
      redirect: 'manual',
      timeout: 15000
    });

    statusCode = response.status;
    responseBody = await response.text();

  } catch (err) {
    console.error('❌ Network error:', err.message);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('⚪ GRAY — No se pudo establecer conexión');
    console.log('   • Error de red / timeout / DNS');
    console.log('   • Posible: MarketSnack no disponible ahora');
    console.log('');
    console.log('ACCIÓN: Reintentar más tarde o verificar conectividad');
    process.exit(3);
  }

  console.log(`HTTP Status: ${statusCode}`);
  console.log('Response preview (first 300 chars):');
  console.log(responseBody.substring(0, 300));
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('CLASIFICACIÓN POR EVIDENCIA');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // ═══ PASO 3: CLASIFICAR RESPUESTA ═══
  let classification = 'UNKNOWN';
  let exitCode = 4;

  if (statusCode === 200) {
    // Verifica si hay datos reales
    let hasData = false;
    try {
      const json = JSON.parse(responseBody);
      hasData = Array.isArray(json.list) && json.list.length > 0;
    } catch {
      // JSON inválido pero 200 = YELLOW
      hasData = false;
    }

    if (hasData) {
      classification = 'GREEN';
      console.log('🟢 GREEN — Sesión activa + datos recibidos correctamente');
      console.log('   • Código HTTP 200 ✓');
      console.log('   • Respuesta contiene trades reales ✓');
      console.log('   • Autenticación: VÁLIDA');
      console.log('   • Estado: CONECTADO Y FUNCIONANDO HOY');
      console.log('');
      console.log('   SIGUIENTE: Migración segura a backend (patrón Massive)');
      exitCode = 0;
    } else {
      classification = 'YELLOW';
      console.log('🟡 YELLOW — Autenticación válida pero sin datos');
      console.log('   • Código HTTP 200 ✓');
      console.log('   • Estructura JSON válida pero lista vacía');
      console.log('   • Autenticación: VÁLIDA');
      console.log('   • Posible: sesión válida, periood no tiene trades');
      console.log('');
      console.log('   SIGUIENTE: Reintentar con period "5d" o "1m"');
      exitCode = 1;
    }
  } else if (statusCode === 401) {
    classification = 'RED';
    console.log('🔴 RED — Unauthorized');
    console.log('   • Código HTTP 401');
    console.log('   • Cookie rechazada o expirada');
    console.log('   • Autenticación: INVÁLIDA');
    console.log('');
    console.log('   SIGUIENTE: Obtener nueva cookie en app.marketsnack.com');
    exitCode = 2;
  } else if (statusCode === 403) {
    classification = 'RED';
    console.log('🔴 RED — Forbidden');
    console.log('   • Código HTTP 403');
    console.log('   • Cookie válida pero acceso prohibido');
    console.log('   • Posible: sesión perdió permisos');
    console.log('');
    console.log('   SIGUIENTE: Re-autenticar en app.marketsnack.com');
    exitCode = 2;
  } else if (statusCode >= 300 && statusCode < 400) {
    classification = 'RED';
    console.log('🔴 RED — Redirect');
    console.log(`   • Código HTTP ${statusCode}`);
    console.log('   • MarketSnack redirige a /login');
    console.log('   • Sesión inválida o expirada');
    console.log('');
    console.log('   SIGUIENTE: Obtener nueva cookie');
    exitCode = 2;
  } else if (statusCode === 0) {
    classification = 'GRAY';
    console.log('⚪ GRAY — No se pudo conectar');
    console.log('   • Servidor no respondió');
    console.log('   • Posible: DNS / firewall / servidor caído');
    console.log('');
    console.log('   SIGUIENTE: Verificar conectividad de red');
    exitCode = 3;
  } else {
    console.log(`❓ DESCONOCIDO — HTTP ${statusCode}`);
    console.log('   • Estado no clasificable');
    console.log('   • Revisar respuesta manualmente');
    exitCode = 4;
  }

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('REPORTE FINAL');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log(`ESTADO: ${classification}`);
  console.log(`COOKIE: Detectada en web/.env.local (${cookie.length} bytes)`);
  console.log(`CONEXIÓN: ${statusCode === 200 ? 'Establecida' : 'Rechazada/Error'}`);
  console.log(`AUDITORÍA: ${statusCode === 200 ? '✅ LISTA para migración segura' : '❌ NO migrar — estado incorrecto'}`);
  console.log('');
  console.log('NO SE MIGRA NI SE MODIFICA NADA HOY.');
  console.log('Se espera decisión del usuario con evidencia.');
  console.log('');

  process.exit(exitCode);
})();
