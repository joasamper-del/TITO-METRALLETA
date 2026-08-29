/**
 * DEBUG: Investigar formatos de símbolo crypto en Alpaca Paper Trading
 * Prueba múltiples formatos para encontrar cuál funciona
 */

import * as fs from "fs";
import * as path from "path";

// Cargar credenciales
const envFilePath = path.join(__dirname, ".env.local");
const envContent = fs.readFileSync(envFilePath, "utf8");
const envLines = envContent.split("\n");
const envVars: Record<string, string> = {};

envLines.forEach((line) => {
  if (line && !line.startsWith("#")) {
    const [key, ...valueParts] = line.split("=");
    envVars[key.trim()] = valueParts.join("=").trim();
  }
});

const API_KEY = envVars.ALPACA_API_KEY;
const SECRET_KEY = envVars.ALPACA_SECRET_KEY;

function getAuthHeader(): string {
  const credentials = `${API_KEY}:${SECRET_KEY}`;
  return "Basic " + Buffer.from(credentials).toString("base64");
}

async function testFormat(endpoint: string, symbols: string[]): Promise<void> {
  console.log(`\n📡 Probando endpoint: ${endpoint}`);
  console.log("───────────────────────────────────────");

  for (const symbol of symbols) {
    const url = `https://paper-api.alpaca.markets${endpoint}?symbols=${symbol}`;
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: getAuthHeader(),
          "Content-Type": "application/json",
        },
      });

      const status = response.status;
      const statusText = response.statusText;
      const body = await response.text();

      if (response.ok) {
        console.log(`✅ ${symbol}: 200 OK`);
        console.log(`   Respuesta: ${body.substring(0, 100)}...`);
      } else {
        console.log(`❌ ${symbol}: ${status} ${statusText}`);
      }
    } catch (error: any) {
      console.log(`💥 ${symbol}: Error - ${error.message}`);
    }
  }
}

(async () => {
  console.log("🔍 INVESTIGACIÓN: FORMATOS DE SÍMBOLO CRYPTO EN ALPACA");
  console.log("════════════════════════════════════════════════════\n");

  // Formatos de símbolo a probar
  const symbolFormats = [
    "BTC/USD",      // Actual (BTC/USD)
    "BTCUSD",       // Sin slash
    "BTC",          // Solo símbolo
    "bitcoin",      // Nombre completo
    "CRYPTO:BTC",   // Con prefijo
    "BTC-USD",      // Guion en lugar de slash
  ];

  // Endpoints a probar
  const endpoints = [
    "/v1/crypto/latest/quotes",  // Actual
    "/v1/crypto/latest/bars",
    "/v1/crypto/latest/snapshots",
    "/v1/crypto/bars",
    "/v2/crypto/latest/quotes",
  ];

  // Probar cada endpoint
  for (const endpoint of endpoints) {
    await testFormat(endpoint, symbolFormats);
  }

  console.log("\n════════════════════════════════════════════════════");
  console.log("✅ INVESTIGACIÓN COMPLETADA");
  console.log("\nResultado: Ver arriba cuál funcionó (200 OK)");
  console.log("Si ninguno funciona: Crypto podría no estar soportado en Paper Trading API");
})();
