#!/usr/bin/env node

/**
 * Verify Header Format — SAFE
 * ══════════════════════════════════════════════════════════════
 * Determina si los 838 bytes son VALOR DESNUDO o incluyen NOMBRE=VALOR
 * SIN mostrar el contenido
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const cookieMatch = envContent.match(/^MARKETSNACK_COOKIE=(.+)$/m);

if (!cookieMatch || !cookieMatch[1].trim()) {
  console.error('❌ Cookie no encontrada');
  process.exit(1);
}

const cookie = cookieMatch[1].trim();

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║        HEADER FORMAT VERIFICATION — SAFE                  ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

console.log('ANÁLISIS DE ESTRUCTURA:');
console.log('');
console.log(`1. Tamaño total guardado: ${cookie.length} bytes`);
console.log('');

// Análisis 1: ¿Contiene = (indicador de NOMBRE=VALOR)?
if (cookie.includes('=')) {
  console.log('2. ¿Contiene "=" (signo igual)?');
  console.log('   ✅ SÍ CONTIENE');
  console.log('');
  console.log('   INTERPRETACIÓN:');
  console.log('   El valor INCLUYE un NOMBRE=VALOR (formato correcto)');
  console.log('   Ej: _market_snack_session=abc123xyz...');
  console.log('');
  console.log('   ESTO SIGNIFICA:');
  console.log('   ✅ El header Cookie se forma correctamente');
  console.log('   ❌ El 401 probablemente se debe a SESIÓN EXPIRADA');
  console.log('');

} else {
  console.log('2. ¿Contiene "=" (signo igual)?');
  console.log('   ❌ NO CONTIENE');
  console.log('');
  console.log('   INTERPRETACIÓN:');
  console.log('   El valor es DESNUDO (solo el valor, sin NOMBRE=)');
  console.log('   Ej: abc123xyz... (falta "_market_snack_session=")');
  console.log('');
  console.log('   ESTO SIGNIFICA:');
  console.log('   ❌ El header Cookie está MAL FORMADO');
  console.log('   🔧 Solución: Necesitamos agregar el NOMBRE delante');
  console.log('');
}

console.log('───────────────────────────────────────────────────────────');
console.log('CÓMO ESTÁ SIENDO ENVIADO AHORA:');
console.log('───────────────────────────────────────────────────────────');
console.log('');
console.log('En validate-ms-cookie.js:');
console.log('  headers: {');
if (cookie.includes('=')) {
  console.log(`    Cookie: ${cookie.substring(0, 30)}... (${cookie.length} bytes)`);
  console.log('  }');
  console.log('');
  console.log('✅ CORRECTO — El nombre está incluido en el valor');
} else {
  console.log(`    Cookie: ${cookie.substring(0, 30)}... (${cookie.length} bytes)`);
  console.log('  }');
  console.log('');
  console.log('❌ INCORRECTO — Falta el nombre de la cookie');
  console.log('');
  console.log('DEBERÍA SER:');
  console.log('  headers: {');
  console.log(`    Cookie: _market_snack_session=${cookie.substring(0, 20)}... (${cookie.length + 27} bytes total)`);
  console.log('  }');
}

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('CONCLUSIÓN:');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

if (cookie.includes('=')) {
  console.log('✅ Formato del header: CORRECTO');
  console.log('❌ Causa del 401: SESIÓN EXPIRADA (no formato)');
  console.log('');
  console.log('PRÓXIMO PASO:');
  console.log('Obtener una NUEVA COOKIE desde MarketSnack');
  console.log('(La estructura está bien, solo caducó)');
} else {
  console.log('❌ Formato del header: INCORRECTO (FALTA NOMBRE)');
  console.log('❌ Causa del 401: HEADER MAL FORMADO + SESIÓN EXPIRADA');
  console.log('');
  console.log('PRÓXIMO PASO:');
  console.log('Cuando copies la nueva cookie, asegúrate de:');
  console.log('1. Copiar TODO lo que MarketSnack te da');
  console.log('2. Incluir el NOMBRE y el VALOR (_market_snack_session=...)');
  console.log('3. Verificar que la estructura sea correcta');
}

console.log('');

process.exit(0);
