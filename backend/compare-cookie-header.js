#!/usr/bin/env node

/**
 * Compare Cookie Header Format — SAFE
 * ══════════════════════════════════════════════════════════════
 * Muestra la estructura del header que estamos enviando vs
 * lo que MarketSnack probablemente espera (basado en patrones comunes)
 *
 * SIN exponer el valor real de la cookie
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
console.log('║        COOKIE HEADER FORMAT COMPARISON — SAFE            ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

console.log('1. LO QUE ESTAMOS ENVIANDO AHORA:');
console.log('');
console.log('   Request Header:');
console.log('   ┌─────────────────────────────────────────┐');
console.log(`   │ Cookie: [${cookie.length}-byte-value] │`);
console.log('   └─────────────────────────────────────────┘');
console.log('');

console.log('2. POSIBLES FORMATOS QUE MARKETSNACK ESPERA:');
console.log('');

const scenarios = [
  {
    name: 'SCENARIO A: Con prefijo de sesión',
    description: 'La cookie necesita un nombre delante',
    example: 'Cookie: session=[838-byte-value]',
    likelihood: 'PROBABLE — MarketSnack típicamente requiere "session=" o "ms_session="'
  },
  {
    name: 'SCENARIO B: Múltiples cookies',
    description: 'Necesita dos o más cookies separadas por ;',
    example: 'Cookie: session=[value1]; tracking=[value2]',
    likelihood: 'PROBABLE — Si tu cookie ya tiene ; adentro, quizás falta otra'
  },
  {
    name: 'SCENARIO C: Cookie directa (lo actual)',
    description: 'La estructura es correcta pero sesión expiró',
    example: 'Cookie: [838-byte-value]',
    likelihood: 'POSIBLE — Si el servidor responde 401, probablemente expiró'
  }
];

scenarios.forEach((s, i) => {
  console.log(`${i + 1}. ${s.name}`);
  console.log(`   ${s.description}`);
  console.log(`   Ejemplo: ${s.example}`);
  console.log(`   Probabilidad: ${s.likelihood}`);
  console.log('');
});

console.log('═══════════════════════════════════════════════════════════');
console.log('CÓMO VERIFICAR EN EL NAVEGADOR (sin mostrar secretos):');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('1. Abre DevTools (F12) → Application → Cookies → app.marketsnack.com');
console.log('2. Mira el campo "Name" (no el valor) de cada cookie:');
console.log('   ¿Dice "session"? ¿Dice "ms_session"? ¿Algo diferente?');
console.log('3. Cuenta cuántas cookies ves:');
console.log('   ¿Una sola? ¿Dos? ¿Más?');
console.log('4. Abre Network → ejecuta una acción en MarketSnack');
console.log('5. Busca un request a /api/flow_feed');
console.log('6. Ve a Headers → Request → Cookie:');
console.log('   ¿Cómo arma MarketSnack el header completo?');
console.log('');
console.log('Comparte los NOMBRES (no valores) de las cookies que veas,');
console.log('y cuántas hay. Eso nos dirá qué formato falta.');
console.log('');

process.exit(0);
