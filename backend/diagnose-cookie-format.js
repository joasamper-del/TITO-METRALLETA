#!/usr/bin/env node

/**
 * Diagnose Cookie Format — SAFE
 * ══════════════════════════════════════════════════════════════
 * Analiza la estructura de la cookie SIN mostrar el contenido
 * Solo metadatos: formato, prefijo, estructura
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const cookieMatch = envContent.match(/^MARKETSNACK_COOKIE=(.+)$/m);

if (!cookieMatch || !cookieMatch[1].trim()) {
  console.error('❌ Cookie no encontrada o vacía');
  process.exit(1);
}

const cookie = cookieMatch[1].trim();

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║        MARKETSNACK COOKIE — DIAGNÓSTICO DE FORMATO        ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

console.log('ANÁLISIS ESTRUCTURAL (sin exponer contenido):');
console.log('');

// Análisis 1: Longitud
console.log(`1. LONGITUD TOTAL: ${cookie.length} bytes`);
if (cookie.length < 20) {
  console.log('   ⚠️  ALERTA: Cookie muy corta (probablemente incompleta)');
} else if (cookie.length > 5000) {
  console.log('   ⚠️  ALERTA: Cookie muy larga (probablemente con exceso)');
} else {
  console.log('   ✅ Longitud razonable');
}
console.log('');

// Análisis 2: Prefijos comunes
console.log('2. PREFIJO DE SESIÓN:');
if (cookie.startsWith('session=')) {
  console.log('   ✅ Tiene prefijo "session="');
} else if (cookie.startsWith('ms_session=')) {
  console.log('   ✅ Tiene prefijo "ms_session="');
} else if (cookie.startsWith('_')) {
  console.log('   ⚠️  Empieza con _ (posible ID anónimo, NO prefijo de sesión)');
} else if (/^[a-f0-9]{20,}$/.test(cookie)) {
  console.log('   ⚠️  Parece ser hexadecimal puro (SIN prefijo)');
  console.log('      → MarketSnack PROBABLEMENTE espera "session=" delante');
} else {
  console.log('   ❓ Formato desconocido');
}
console.log('');

// Análisis 3: Estructura de múltiples cookies
console.log('3. ESTRUCTURA DE MÚLTIPLES COOKIES:');
const hasSemicolon = cookie.includes(';');
if (hasSemicolon) {
  const parts = cookie.split(';').length;
  console.log(`   ✅ Contiene múltiples cookies (${parts} partes)`);
  console.log('      → Esto es correcto (header "Cookie:" acepta varias separadas por ;)');
} else {
  console.log('   ℹ️  Una sola cookie (sin separadores ;)');
  console.log('      → Si MarketSnack requiere 2+ cookies, esta es incompleta');
}
console.log('');

// Análisis 4: Caracteres permitidos
console.log('4. CARACTERES VÁLIDOS:');
const validChars = /^[a-zA-Z0-9\-_.~:/?#\[\]@!$&'()*+,;=%]*$/.test(cookie);
if (validChars) {
  console.log('   ✅ Contiene solo caracteres válidos en cookies');
} else {
  console.log('   ⚠️  Contiene caracteres inválidos (problema de pegado)');
}
console.log('');

// Análisis 5: Recomendación
console.log('═══════════════════════════════════════════════════════════');
console.log('DIAGNÓSTICO Y RECOMENDACIÓN:');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

let recommendation = [];

if (cookie.length < 20) {
  recommendation.push('❌ Cookie INCOMPLETA — Vuelve a MarketSnack y cópiala completa');
} else if (/^[a-f0-9]{20,}$/.test(cookie) && !cookie.includes('=')) {
  recommendation.push('⚠️  Cookie parece ser SOLO EL VALOR (sin prefijo)');
  recommendation.push('   → MarketSnack probablemente necesita: session=<valor>');
  recommendation.push('   → O pregunta: ¿cuál es el NOMBRE de la cookie en DevTools?');
} else if (!hasSemicolon && cookie.length < 100) {
  recommendation.push('⚠️  Una sola cookie muy corta');
  recommendation.push('   → MarketSnack típicamente requiere 2+ cookies');
} else if (hasSemicolon) {
  recommendation.push('✅ Estructura parece completa (múltiples cookies)');
  recommendation.push('   → El 401 puede ser por: sesión expirada o cookie rechazada');
} else {
  recommendation.push('ℹ️  Estructura desconocida');
  recommendation.push('   → Verifica en DevTools que copiaste TODO el header "Cookie:"');
}

recommendation.forEach(line => console.log(line));
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('');
console.log('PRÓXIMO PASO:');
console.log('Basado en el diagnóstico arriba, reporta a Claude cuál es');
console.log('la causa más probable y cómo proceder.');
console.log('');

process.exit(0);
