#!/usr/bin/env node

/**
 * Paste MarketSnack Cookie — Interactive & Safe
 * ══════════════════════════════════════════════════════════════
 * Script que guía al usuario a pegar la cookie en backend/.env.local
 * de forma segura y verificada.
 *
 * PASOS:
 * 1. Lee el archivo actual
 * 2. Solicita que pegues la cookie (interactivo)
 * 3. Valida que se pegó
 * 4. Guarda el archivo
 * 5. Verifica que guardó
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = path.join(__dirname, '.env.local');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     PASTE MARKETSNACK COOKIE — SAFE INTERACTIVE MODE      ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');
console.log('INSTRUCCIONES:');
console.log('1. Copia tu cookie nueva desde MarketSnack al portapapeles');
console.log('2. Cuando se te pida, pega aquí (Ctrl+V / Cmd+V)');
console.log('3. El script validará, guardará y verificará');
console.log('');

// Leer archivo actual
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (err) {
  console.error('❌ No se puede leer backend/.env.local:', err.message);
  rl.close();
  process.exit(1);
}

// Verificar que la línea existe
if (!envContent.includes('MARKETSNACK_COOKIE=')) {
  console.error('❌ Línea MARKETSNACK_COOKIE= no encontrada en backend/.env.local');
  rl.close();
  process.exit(1);
}

console.log('Archivo backend/.env.local: ✅ Encontrado');
console.log('Línea MARKETSNACK_COOKIE=: ✅ Encontrada');
console.log('');

// Solicitar que pegue la cookie
rl.question('📋 Pega tu cookie aquí y presiona ENTER:\n> ', (userInput) => {
  const cookie = userInput.trim();

  if (!cookie || cookie.length === 0) {
    console.error('');
    console.error('❌ ERROR: No pegaste nada.');
    rl.close();
    process.exit(1);
  }

  console.log('');
  console.log('Validando entrada...');
  console.log(`   Valor recibido: ${cookie.length} bytes`);
  console.log('   Agregando prefijo automáticamente: _market_snack_session=');
  console.log('');

  // Agregar el prefijo automáticamente
  const fullCookie = `_market_snack_session=${cookie}`;

  // Reemplazar en el contenido con el prefijo incluido
  const updatedContent = envContent.replace(
    /^MARKETSNACK_COOKIE=.*$/m,
    `MARKETSNACK_COOKIE=${fullCookie}`
  );

  if (updatedContent === envContent) {
    console.error('❌ ERROR: No se pudo reemplazar la línea.');
    rl.close();
    process.exit(1);
  }

  // Guardar
  try {
    fs.writeFileSync(envPath, updatedContent, 'utf8');
    console.log('✅ Archivo guardado exitosamente');
  } catch (err) {
    console.error('❌ ERROR al guardar:', err.message);
    rl.close();
    process.exit(1);
  }

  // Verificar que guardó
  try {
    const verified = fs.readFileSync(envPath, 'utf8');
    const verifyMatch = verified.match(/^MARKETSNACK_COOKIE=(.+)$/m);

    if (!verifyMatch || !verifyMatch[1] || verifyMatch[1].trim().length === 0) {
      console.error('❌ ERROR: Cookie no se guardó correctamente.');
      rl.close();
      process.exit(1);
    }

    const savedCookie = verifyMatch[1].trim();
    if (savedCookie === fullCookie) {
      console.log('✅ Cookie guardada y verificada en backend/.env.local');
      console.log(`   Formato: _market_snack_session=<${cookie.length}-byte-value>`);
      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('LISTO PARA VALIDACIÓN');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('');
      console.log('Ejecuta ahora:');
      console.log('  node validate-ms-cookie.js');
      console.log('');
      rl.close();
      process.exit(0);
    } else {
      console.error('❌ ERROR: El contenido guardado no coincide.');
      rl.close();
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ ERROR al verificar:', err.message);
    rl.close();
    process.exit(1);
  }
});

rl.on('close', () => {
  // Asegurar que se cierre
});
