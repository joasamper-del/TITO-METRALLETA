#!/usr/bin/env node

/**
 * Cookie Purpose Analyzer — By Name Only
 * ══════════════════════════════════════════════════════════════
 * Categoriza cookies por nombre y función (AUTH vs ANALYTICS)
 * SIN ver valores, solo nombres
 */

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║    COOKIE ANALYSIS — AUTHENTICATE vs ANALYTICS (by name)  ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

console.log('BASE DE CONOCIMIENTO — Patrones comunes de nombres:');
console.log('');

const patterns = {
  'AUTHENTICATION': {
    keywords: ['session', 'auth', 'token', 'sid', '_key', 'id', 'jwt', 'access'],
    examples: ['market_snack_session', 'ms_session', 'auth_token', 'user_id'],
    description: 'Necesarias para API requests'
  },
  'ANALYTICS': {
    keywords: ['google', 'gtag', 'ga', '_ga', '_gat', 'utm', 'mixpanel', 'amplitude',
               'segment', 'heap', 'matomo', 'ajs', 'anonymous', 'tracking', 'intercom',
               'drift', 'hotjar', 'fullstory'],
    examples: ['_gid', '_ga_XXXXX', 'ajs_anonymous_id', 'amplitude', 'gclid'],
    description: 'Para rastrear usuario (no necesarias para API)'
  },
  'SECURITY': {
    keywords: ['csrf', 'xsrf', 'secure', 'httponly', 'samesite'],
    examples: ['_csrf', 'xsrf-token'],
    description: 'Protección contra ataques (marcan propiedades del cookie)'
  }
};

Object.entries(patterns).forEach(([category, info]) => {
  console.log(`📌 ${category}:`);
  console.log(`   Palabras clave: ${info.keywords.join(', ')}`);
  console.log(`   Ejemplos: ${info.examples.join(', ')}`);
  console.log(`   Función: ${info.description}`);
  console.log('');
});

console.log('═══════════════════════════════════════════════════════════');
console.log('ANÁLISIS DE TUS 21 COOKIES:');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('Basado en lo que viste en DevTools, categoriza cada cookie:');
console.log('');
console.log('Para cada nombre que veas, pregúntate:');
console.log('  ✅ ¿Contiene "session", "auth", "token", "id"?');
console.log('     → PROBABLEMENTE AUTENTICACIÓN');
console.log('  ❌ ¿Contiene "ga_", "gtag", "ajs_", "anonymous"?');
console.log('     → PROBABLEMENTE ANALÍTICA (no necesaria para API)');
console.log('  ❓ ¿No estoy seguro?');
console.log('     → Déjalo, probablemente sea de terceros o seguridad');
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('HIPÓTESIS:');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('Si `market_snack_session` es la ÚNICA de autenticación:');
console.log('  → Nuestra cookie DEBERÍA ser suficiente');
console.log('  → El 401 significa que esa sesión expiró');
console.log('  → Solución: Obtener una nueva cookie');
console.log('');
console.log('Si hay VARIAS de autenticación (ej: session + csrf):');
console.log('  → Nuestra cookie INCOMPLETA (falta CSRF)');
console.log('  → Solución: Copiar TODAS las de autenticación juntas');
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('Dile a Claude EXACTAMENTE qué cookies de autenticación');
console.log('(por nombre) viste, y cuáles parecen ser analítica.');
console.log('Eso determinará el siguiente paso.');
console.log('');

process.exit(0);
