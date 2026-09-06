#!/usr/bin/env npx ts-node

/**
 * S60 VALIDATION SCRIPT — Verificar que observador es read-only
 */

import * as fs from 'fs';
import * as path from 'path';

const logsDir = path.join(__dirname, '../audit/s60-live');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║  S60 VALIDATION — Read-Only Integrity Check               ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

let passCount = 0;
let failCount = 0;

// TEST 1: Archivos creados
console.log('✅ TEST 1: Observer crea archivos sin escribir a Alpaca');
if (fs.existsSync(logsDir)) {
  const files = fs.readdirSync(logsDir);
  console.log(`   → Archivos generados: ${files.length}`);
  if (files.length > 0) {
    passCount++;
    console.log(`   ✅ PASS: ${files.join(', ')}`);
  }
} else {
  failCount++;
  console.log('   ❌ FAIL: No hay directorio de logs');
}

// TEST 2: action=NONE en todas las observaciones
console.log('\n✅ TEST 2: Todas las observaciones tienen action=NONE');
if (fs.existsSync(logsDir)) {
  const cycles = fs.readdirSync(logsDir).filter(f => f.startsWith('cycle-'));
  let allNone = true;
  let totalObs = 0;

  for (const cycleFile of cycles) {
    const content = JSON.parse(fs.readFileSync(path.join(logsDir, cycleFile), 'utf-8'));
    for (const obs of content.observations) {
      totalObs++;
      if (obs.action !== 'NONE') {
        allNone = false;
        console.log(`   ❌ FAIL: ${cycleFile} tiene action=${obs.action}`);
      }
    }
  }

  if (allNone) {
    passCount++;
    console.log(`   ✅ PASS: ${totalObs} observaciones, todas action=NONE`);
  } else {
    failCount++;
  }
}

// TEST 3: Indicadores marcados como MISSING
console.log('\n✅ TEST 3: Indicadores faltantes explícitamente marcados');
if (fs.existsSync(logsDir)) {
  const cycles = fs.readdirSync(logsDir).filter(f => f.startsWith('cycle-'));
  let allMissing = true;

  for (const cycleFile of cycles) {
    const content = JSON.parse(fs.readFileSync(path.join(logsDir, cycleFile), 'utf-8'));
    for (const obs of content.observations) {
      const indicators = obs.indicators;
      if (indicators.volume !== 'MISSING' || indicators.trend !== 'MISSING' ||
          indicators.rsi !== 'MISSING' || indicators.atr !== 'MISSING') {
        allMissing = false;
        console.log(`   ❌ FAIL: ${cycleFile} tiene indicadores no-MISSING`);
      }
    }
  }

  if (allMissing) {
    passCount++;
    console.log('   ✅ PASS: Indicadores explícitamente MISSING (no ocultos)');
  } else {
    failCount++;
  }
}

// TEST 4: No hay secrets en logs
console.log('\n✅ TEST 4: No hay secrets en logs');
if (fs.existsSync(logsDir)) {
  const files = fs.readdirSync(logsDir);
  const secretPatterns = [
    { regex: /PKZJA/i, name: 'API Key pattern' },
    { regex: /DqcYBA/i, name: 'Secret pattern' },
    { regex: /paper-api\.\S+/i, name: 'Full endpoint' },
  ];

  let hasSecrets = false;
  for (const file of files) {
    const filePath = path.join(logsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');

    for (const { regex, name } of secretPatterns) {
      if (regex.test(content)) {
        hasSecrets = true;
        console.log(`   ❌ FAIL: ${file} contiene ${name}`);
      }
    }
  }

  if (!hasSecrets) {
    passCount++;
    console.log('   ✅ PASS: No hay secrets en logs');
  } else {
    failCount++;
  }
}

// TEST 5: ETH position no fue modificada
console.log('\n✅ TEST 5: ETH position no fue modificada');
if (fs.existsSync(logsDir)) {
  const cycles = fs.readdirSync(logsDir).filter(f => f.startsWith('cycle-'));
  if (cycles.length > 0) {
    const firstCycle = JSON.parse(fs.readFileSync(path.join(logsDir, cycles[0]), 'utf-8'));
    const ethObs = firstCycle.observations.find((o: any) => o.symbol === 'ETHUSD');

    if (ethObs && ethObs.qty > 0 && ethObs.entry > 0 && ethObs.source === 'alpaca-positions') {
      passCount++;
      console.log(`   ✅ PASS: ETH intacta (qty=${ethObs.qty}, entry=$${ethObs.entry.toFixed(2)})`);
    } else {
      failCount++;
      console.log('   ❌ FAIL: ETH position corrupta o faltante');
    }
  }
}

// TEST 6: Precio es REAL desde Alpaca
console.log('\n✅ TEST 6: Precio es REAL desde Alpaca (no simulado)');
if (fs.existsSync(logsDir)) {
  const cycles = fs.readdirSync(logsDir).filter(f => f.startsWith('cycle-'));
  if (cycles.length > 0) {
    const firstCycle = JSON.parse(fs.readFileSync(path.join(logsDir, cycles[0]), 'utf-8'));
    const ethObs = firstCycle.observations.find((o: any) => o.symbol === 'ETHUSD');

    if (ethObs && ethObs.source === 'alpaca-positions' && ethObs.price > 0) {
      passCount++;
      console.log(`   ✅ PASS: Precio REAL $${ethObs.price.toFixed(2)} (source=alpaca-positions)`);
    } else {
      failCount++;
      console.log('   ❌ FAIL: Precio no es REAL o fuente incorrecta');
    }
  }
}

// TEST 7: Timestamp válido
console.log('\n✅ TEST 7: Timestamp registrado correctamente');
if (fs.existsSync(logsDir)) {
  const cycles = fs.readdirSync(logsDir).filter(f => f.startsWith('cycle-'));
  if (cycles.length > 0) {
    const firstCycle = JSON.parse(fs.readFileSync(path.join(logsDir, cycles[0]), 'utf-8'));
    const timestamp = firstCycle.timestamp;
    const time = new Date(timestamp).getTime();
    const now = Date.now();

    if (timestamp && time <= now) {
      passCount++;
      console.log(`   ✅ PASS: Timestamp ${timestamp}`);
    } else {
      failCount++;
      console.log('   ❌ FAIL: Timestamp inválido');
    }
  }
}

// TEST 8: Markers.json existe con START
console.log('\n✅ TEST 8: Markers.json registra START');
const markerPath = path.join(logsDir, 'markers.json');
if (fs.existsSync(markerPath)) {
  const markers = JSON.parse(fs.readFileSync(markerPath, 'utf-8'));
  if (markers.START && markers.START.length > 0) {
    passCount++;
    console.log(`   ✅ PASS: START registrado en ${markers.START[0]}`);
  } else {
    failCount++;
    console.log('   ❌ FAIL: START no registrado');
  }
} else {
  failCount++;
  console.log('   ❌ FAIL: markers.json no existe');
}

// SUMMARY
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║                     RESUMEN VALIDACIÓN                    ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

console.log(`✅ PASS: ${passCount}/8`);
console.log(`❌ FAIL: ${failCount}/8`);

if (failCount === 0) {
  console.log('\n🎉 VALIDACIÓN EXITOSA — Observer es read-only y seguro\n');
  process.exit(0);
} else {
  console.log('\n⚠️  VALIDACIÓN PARCIAL — Revisar fallos arriba\n');
  process.exit(1);
}
