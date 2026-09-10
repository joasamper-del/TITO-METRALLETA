#!/usr/bin/env node

/**
 * Diagnose Alpaca Configuration - SAFE (never shows credentials)
 *
 * Verifica qué variables están cargadas en .env.local sin exponerlas.
 */

import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

console.log('🔍 ALPACA CONFIGURATION DIAGNOSTIC\n');

// Variables esperadas
const expectedVars = [
  'ALPACA_API_KEY',
  'ALPACA_SECRET_KEY',
  'ALPACA_BASE_URL',
  'ALPACA_ENABLED',
];

console.log('Expected variables:');
expectedVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const length = value ? ` (${value.length} chars)` : '';

  console.log(`  ${status} ${varName}${length}`);
});

console.log('\nDiagnosis:');

const apiKey = process.env.ALPACA_API_KEY;
const secretKey = process.env.ALPACA_SECRET_KEY;
const baseUrl = process.env.ALPACA_BASE_URL;
const enabled = process.env.ALPACA_ENABLED;

let issues = [];

if (!apiKey) {
  issues.push('❌ ALPACA_API_KEY: Missing or empty');
} else if (apiKey.length < 20) {
  issues.push(`❌ ALPACA_API_KEY: Too short (${apiKey.length} chars, expected 40+)`);
}

if (!secretKey) {
  issues.push('❌ ALPACA_SECRET_KEY: Missing or empty');
} else if (secretKey.length < 40) {
  issues.push(`❌ ALPACA_SECRET_KEY: Too short (${secretKey.length} chars, expected 64+)`);
}

if (!baseUrl) {
  issues.push('❌ ALPACA_BASE_URL: Missing');
} else if (baseUrl !== 'https://paper-api.alpaca.markets') {
  issues.push(`❌ ALPACA_BASE_URL: Expected "https://paper-api.alpaca.markets", got "${baseUrl}"`);
}

if (enabled !== 'true' && enabled !== undefined) {
  issues.push(`⚠️  ALPACA_ENABLED: Expected "true", got "${enabled}"`);
}

if (issues.length === 0) {
  console.log('✅ All required variables present and valid format');
  console.log('\n🟢 Ready to run: npm run stress-test:paper');
} else {
  console.log('Issues found:');
  issues.forEach(issue => console.log(`  ${issue}`));
  console.log('\n❌ Fix .env.local before running stress test');
  process.exit(1);
}
