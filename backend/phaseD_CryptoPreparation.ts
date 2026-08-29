/**
 * FASE D — CRYPTO PREPARATION (No execution today)
 *
 * Objetivo: Preparar prueba controlada de crypto en Alpaca Paper Trading
 * Para ejecutar: Este fin de semana (cuando usuario autorice)
 * Seguridad: PAPER ONLY, pequeño tamaño, registro completo, pausa obligatoria
 *
 * Verificar:
 * - Qué pares crypto admite Paper Trading
 * - Qué pares tienen datos disponibles
 * - Liquidez y spreads
 * - Integración con Tito Core (sin cambios)
 */

import * as fs from "fs";
import * as path from "path";

// Cargar variables del .env.local
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

const ALPACA_PAPER_BASE = "https://paper-api.alpaca.markets";
const API_KEY = envVars.ALPACA_API_KEY;
const SECRET_KEY = envVars.ALPACA_SECRET_KEY;

// Validar PAPER
if (!ALPACA_PAPER_BASE.includes("paper-api")) {
  throw new Error("🚨 CRITICAL: Must be PAPER API!");
}

function getAuthHeader(): string {
  const credentials = `${API_KEY}:${SECRET_KEY}`;
  return "Basic " + Buffer.from(credentials).toString("base64");
}

async function fetch_alpaca(endpoint: string, method = "GET", body?: any) {
  const url = `${ALPACA_PAPER_BASE}${endpoint}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: getAuthHeader(),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errText = await response.text();
    console.warn(`   ⚠️  API ${response.status}: ${errText.substring(0, 100)}`);
    return null;
  }

  return response.json();
}

async function prepareCryptoTest() {
  console.log("\n🟡 FASE D — CRYPTO PREPARATION (Sin ejecutar)");
  console.log("================================================\n");

  try {
    // 1. VERIFICACIÓN DE SEGURIDAD
    console.log("1️⃣ SEGURIDAD: Verificando endpoint PAPER...");
    if (!ALPACA_PAPER_BASE.includes("paper-api")) {
      throw new Error("❌ CRITICAL: Not PAPER endpoint!");
    }
    console.log("   ✅ Endpoint: PAPER (https://paper-api.alpaca.markets)");

    // 2. Verificar conexión y estado de cuenta
    console.log("\n2️⃣ CONEXIÓN: Verificando cuenta...");
    const account = (await fetch_alpaca("/v2/account")) as any;
    if (!account) throw new Error("Cannot connect to Alpaca");

    if (account.status !== "ACTIVE") {
      throw new Error(`Account status: ${account.status} (need ACTIVE)`);
    }

    console.log(`   ✅ Cuenta: ${account.account_number}`);
    console.log(`   ✅ Status: ${account.status}`);
    console.log(`   ✅ Equity: $${parseFloat(account.equity).toFixed(2)}`);
    console.log(`   ✅ Buying Power: $${parseFloat(account.buying_power).toFixed(2)}`);

    // 3. Intentar obtener datos de crypto
    console.log("\n3️⃣ CRYPTO ASSETS: Verificando disponibilidad...");

    // Alpaca Paper soporta crypto via CryptoUSD pairs
    const cryptoSymbols = [
      "BTC/USD", // Bitcoin
      "ETH/USD", // Ethereum
      "XRP/USD", // Ripple
      "LTC/USD", // Litecoin
      "SOL/USD", // Solana
      "ADA/USD", // Cardano
    ];

    console.log(`\n   Intentando acceder a ${cryptoSymbols.length} pares crypto...`);

    const cryptoData: Record<string, any> = {};

    for (const symbol of cryptoSymbols) {
      const data = (await fetch_alpaca(`/v1/crypto/latest/quotes?symbols=${symbol}`)) as any;
      if (data?.quotes?.[symbol]) {
        const quote = data.quotes[symbol] as any;
        cryptoData[symbol] = {
          lastPrice: quote.LastPrice,
          bid: quote.BidPrice,
          ask: quote.AskPrice,
          spread: ((quote.AskPrice - quote.BidPrice) / quote.LastPrice * 100).toFixed(4) + "%",
          size: quote.LastSize,
          available: true,
        };
        console.log(`   ✅ ${symbol}: $${quote.LastPrice.toFixed(2)} (spread: ${cryptoData[symbol].spread})`);
      } else {
        console.log(`   ⚠️  ${symbol}: Sin datos (papel no soporta o sin liquidez)`);
      }
    }

    // 4. Mostrar lo que está disponible
    console.log("\n4️⃣ RESUMEN: Pares crypto disponibles en Paper Trading");
    const available = Object.entries(cryptoData)
      .filter(([_, data]) => data.available)
      .map(([symbol, data]) => ({
        symbol,
        price: data.lastPrice,
        spread: data.spread,
      }));

    if (available.length === 0) {
      console.log(`   ⚠️  IMPORTANTE: Paper Trading podría no soportar crypto`);
      console.log(`   💡 Alternativa: Mantener SPY/QQQ como activos principales`);
    } else {
      console.log(`   ✅ ${available.length} pares disponibles:`);
      available.forEach((a) => {
        console.log(`      - ${a.symbol}: $${a.price.toFixed(2)} (spread: ${a.spread})`);
      });
    }

    // 5. Plan de prueba de crypto
    console.log("\n5️⃣ PLAN DE PRUEBA (Este fin de semana):");
    if (available.length > 0) {
      const testPair = available[0].symbol;
      console.log(`   📅 Cuando usuario autorice:`);
      console.log(`   - Pares a probar: ${available.map((a) => a.symbol).join(", ")}`);
      console.log(`   - Tamaño: PEQUEÑO (ej: 0.01 BTC, 0.1 ETH)`);
      console.log(`   - Registro: Entrada, fill, slippage, salida, P&L`);
      console.log(`   - Pausa: Obligatoria después de cada operación`);
      console.log(`   - Lógica: Tito Core v0.3.0 (sin cambios)`);
      console.log(`   - Duración: Este fin de semana`);
    } else {
      console.log(`   ℹ️  Crypto no está disponible en Paper Trading`);
      console.log(`   ✅ Alternativa: Mantener focus en SPY/QQQ stocks`);
      console.log(`   ℹ️  Alpaca Paper podría no tener micro-trading en crypto`);
    }

    // 6. Seguridad de la prueba
    console.log("\n6️⃣ SEGURIDAD DE LA PRUEBA:");
    console.log(`   ✅ Endpoint PAPER: https://paper-api.alpaca.markets`);
    console.log(`   ✅ Cuenta: ${account.account_number} (PAPER)`);
    console.log(`   ✅ Tamaño: Pequeño (miniFraccional)`);
    console.log(`   ✅ Lógica: Congelada (Tito Core v0.3.0)`);
    console.log(`   ✅ Registro: Completo (logs)`);
    console.log(`   ✅ Pausa: Obligatoria entre órdenes`);
    console.log(`   ✅ Usuario: Control total (paso a paso)`);

    // 7. Status
    console.log("\n7️⃣ STATUS:");
    console.log(`   🟡 PREPARACIÓN: COMPLETADA (sin ejecutar)`);
    console.log(`   ⏸️  PRÓXIMO PASO: Esperar autorización de usuario`);
    console.log(`   📅 EJECUCIÓN: Este fin de semana (si crypto disponible)`);

    console.log("\n================================================");
    console.log("✅ PREPARACIÓN LISTA — Aguardando autorización usuario\n");

    return {
      success: true,
      status: "PREPARATION_COMPLETE_AWAITING_AUTHORIZATION",
      account: account.account_number,
      endpoint: ALPACA_PAPER_BASE,
      cryptoAvailable: available.length > 0,
      availablePairs: available.map((a) => a.symbol),
      nextAction:
        available.length > 0
          ? "Execute small crypto order when user authorizes (weekend)"
          : "Maintain focus on SPY/QQQ (crypto not available in Paper)",
    };
  } catch (error: any) {
    console.error("\n❌ ERROR:");
    console.error(error.message);
    console.log("\n⚠️  Verificar que:");
    console.log("   - .env.local tiene ALPACA_API_KEY y ALPACA_SECRET_KEY");
    console.log("   - Credenciales son para PAPER account (no real)");
    console.log("   - Endpoint es https://paper-api.alpaca.markets");
    process.exit(1);
  }
}

// Ejecutar preparación
prepareCryptoTest()
  .then((result) => {
    console.log("📋 RESULTADO DE PREPARACIÓN:");
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
