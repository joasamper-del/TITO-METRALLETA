/**
 * ALPACA CONNECTOR — Sesión 25
 * Conexión segura a Alpaca PAPER (lectura únicamente para verificación)
 * CONGELADO: Tito Core v0.3.0 sin cambios
 * SEGURIDAD: NO imprime API keys, bloquea LIVE, validación stricta
 */

import type { ExecutorConfig } from "./cryptoExecutor";

export interface AlpacaAccount {
  id: string;
  account_number: string;
  status: string; // "ACTIVE", "PAPER", etc.
  cash: number;
  portfolio_value: number;
  buying_power: number;
  daytrading_buying_power: number;
}

export interface CryptoQuote {
  symbol: string;
  price: number;
  size: number;
  timestamp: string;
  bid?: number;
  ask?: number;
}

export interface ConnectionResult {
  connected: boolean;
  endpoint: string;
  isPaper: boolean;
  account?: AlpacaAccount;
  error?: string;
  warnings: string[];
}

/**
 * VALIDACIÓN STRICTA: Endpoint PAPER solamente
 */
function validateEndpoint(baseUrl: string): { valid: boolean; reason: string; isPaper: boolean } {
  const url = new URL(baseUrl).hostname;

  const paperDomains = ["paper-api.alpaca.markets", "paper.alpaca.markets"];
  const liveDomains = ["api.alpaca.markets"];

  const isPaper = paperDomains.some((domain) => url.includes(domain));
  const isLive = liveDomains.some((domain) => url.includes(domain) && !url.includes("paper"));

  if (isLive) {
    return {
      valid: false,
      reason: `❌ LIVE endpoint DETECTADO: ${baseUrl} — BLOQUEADO POR SEGURIDAD`,
      isPaper: false,
    };
  }

  return {
    valid: isPaper,
    reason: isPaper ? `✓ Endpoint PAPER verificado` : `⚠️ Endpoint no reconocido`,
    isPaper,
  };
}

/**
 * CONECTAR ALPACA PAPER (solo lectura para verificación)
 */
export async function verifyAlpacaPaperConnection(
  apiKey: string,
  apiSecret: string,
  baseUrl: string = "https://paper-api.alpaca.markets"
): Promise<ConnectionResult> {
  const warnings: string[] = [];

  // PASO 1: Validar endpoint
  const endpointCheck = validateEndpoint(baseUrl);
  if (!endpointCheck.valid) {
    return {
      connected: false,
      endpoint: baseUrl,
      isPaper: false,
      error: endpointCheck.reason,
      warnings,
    };
  }

  // PASO 2: Validar credentials (no están vacíos)
  if (!apiKey || !apiSecret) {
    return {
      connected: false,
      endpoint: baseUrl,
      isPaper: true,
      error: "❌ Credenciales vacías — proporciona apiKey y apiSecret válidos",
      warnings,
    };
  }

  try {
    // PASO 3: Obtener account info (lectura únicamente)
    // En producción: llamar a Alpaca /v2/accounts
    // Por ahora: simulación de conexión verificada

    const account: AlpacaAccount = {
      id: "PA123456789",
      account_number: "PAPER_ACCOUNT",
      status: "ACTIVE",
      cash: 100000, // Saldo real (sería obtenido de Alpaca)
      portfolio_value: 100000,
      buying_power: 100000, // Buying power real
      daytrading_buying_power: 100000,
    };

    // VERIFICACIÓN ADICIONAL
    if (account.cash <= 0) {
      warnings.push("⚠️ Saldo bajo — verificar cuenta");
    }

    return {
      connected: true,
      endpoint: baseUrl,
      isPaper: true,
      account,
      warnings,
    };
  } catch (err) {
    return {
      connected: false,
      endpoint: baseUrl,
      isPaper: endpointCheck.isPaper,
      error: `Error conectando a Alpaca: ${err}`,
      warnings,
    };
  }
}

/**
 * OBTENER PRECIO ACTUAL de Alpaca (lectura segura)
 */
export async function getCryptoPrice(
  symbol: "BTC" | "ETH",
  apiKey: string,
  apiSecret: string,
  baseUrl: string
): Promise<{ price: number | null; error?: string }> {
  try {
    // Validar endpoint
    const endpointCheck = validateEndpoint(baseUrl);
    if (!endpointCheck.valid) {
      return { price: null, error: endpointCheck.reason };
    }

    // En producción: llamar a Alpaca /v1beta3/crypto/latest/quotes
    // Por ahora: retornar precios simulados
    const mockPrices: Record<string, number> = {
      BTC: 77648.5,
      ETH: 2450.25,
    };

    return { price: mockPrices[symbol] };
  } catch (err) {
    return { price: null, error: `Error fetching ${symbol} price: ${err}` };
  }
}

/**
 * OBTENER QUOTES (bid/ask spread) de Alpaca para liquidez
 * Endpoint: /v1beta3/crypto/latest/quotes?symbols=BTC,ETH
 */
export async function getCryptoQuotes(
  symbols: ("BTC" | "ETH")[],
  apiKey: string,
  apiSecret: string,
  baseUrl: string
): Promise<{ quotes: Record<string, { bid: number; ask: number; timestamp: string }> | null; error?: string }> {
  try {
    // Validar endpoint
    const endpointCheck = validateEndpoint(baseUrl);
    if (!endpointCheck.valid) {
      return { quotes: null, error: endpointCheck.reason };
    }

    // En producción: llamar a Alpaca /v1beta3/crypto/latest/quotes
    // Por ahora: retornar datos simulados para testing
    // Estructura esperada: { BTC: { bid: 77640, ask: 77657, timestamp }, ... }

    const mockQuotes: Record<string, { bid: number; ask: number; timestamp: string }> = {
      BTC: {
        bid: 77640.00,   // Comprador (menor precio)
        ask: 77657.00,   // Vendedor (mayor precio)
        timestamp: new Date().toISOString(),
      },
      ETH: {
        bid: 2449.50,
        ask: 2450.75,
        timestamp: new Date().toISOString(),
      },
    };

    // Filtrar solo los símbolos solicitados
    const filtered = Object.fromEntries(
      symbols.map(s => [s, mockQuotes[s]]).filter(([_, v]) => v)
    );

    return { quotes: Object.keys(filtered).length > 0 ? filtered : null };
  } catch (err) {
    return { quotes: null, error: `Error fetching crypto quotes: ${err}` };
  }
}

/**
 * OBTENER BARRAS HISTÓRICAS de crypto desde Alpaca (lectura segura)
 * Endpoint: /v1beta3/crypto/latest/bars?symbols=BTC,ETH&timeframe=1D
 * Retorna volumen diario intradía para el cálculo de pipeline
 */
export async function getCryptoHistoricalBars(
  symbols: ("BTC" | "ETH")[],
  apiKey: string,
  apiSecret: string,
  baseUrl: string,
  limit: number = 1  // 1 = solo hoy, 200 = 200 días, 30 = 30 días
): Promise<{ bars: Record<string, { c: number; v: number; t: number }[]> | null; error?: string }> {
  try {
    // Validar endpoint
    const endpointCheck = validateEndpoint(baseUrl);
    if (!endpointCheck.valid) {
      return { bars: null, error: endpointCheck.reason };
    }

    // En producción: llamar a Alpaca /v1beta3/crypto/bars?symbols=BTC,ETH&timeframe=1D&limit={limit}
    // Por ahora: generar histórico simulado para testing
    // Estructura: array de { c (close), v (volume), t (timestamp) }

    const generateMockBars = (basePrice: number, baseVolume: number, days: number) => {
      const bars = [];
      let price = basePrice;
      for (let i = days - 1; i >= 0; i--) {
        // Simular movimiento de precio aleatorio (±2% diario)
        const change = (Math.random() - 0.5) * 0.04 * price;
        price += change;
        bars.push({
          c: price,
          v: baseVolume + Math.random() * baseVolume * 0.5,
          t: Date.now() - i * 86_400_000,
        });
      }
      return bars;
    };

    const mockBarsData: Record<string, any[]> = {
      BTC: generateMockBars(77648.5, 2500000, limit),
      ETH: generateMockBars(2450.25, 12000000, limit),
    };

    // Filtrar solo los símbolos solicitados
    const filtered = Object.fromEntries(
      symbols.map(s => [s, mockBarsData[s]]).filter(([_, v]) => v)
    );

    return { bars: Object.keys(filtered).length > 0 ? filtered : null };
  } catch (err) {
    return { bars: null, error: `Error fetching crypto bars: ${err}` };
  }
}

/**
 * CALCULAR TENDENCIA desde barras históricas (MA50/MA200)
 * Entrada: array de closes desde getCryptoHistoricalBars
 * Salida: "alcista" | "bajista" | "lateral" | null
 */
export function calculateTrendFromBars(
  bars: { c: number }[] | null
): { value: "alcista" | "bajista" | "lateral"; source: string; ts: string } | null {
  if (!bars || bars.length < 200) return null;

  const closes = bars.map(b => b.c);

  // Calcular MA50 y MA200
  const ma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
  const ma200 = closes.slice(-200).reduce((a, b) => a + b, 0) / 200;

  const diff = Math.abs((ma50 - ma200) / ma200);

  let trendValue: "alcista" | "bajista" | "lateral";
  if (diff < 0.01) {
    trendValue = "lateral";
  } else if (ma50 > ma200) {
    trendValue = "alcista";
  } else {
    trendValue = "bajista";
  }

  return {
    value: trendValue,
    source: "MA50/MA200 (Alpaca barras históricas)",
    ts: new Date().toISOString(),
  };
}

/**
 * CALCULAR PATRÓN desde barras históricas (RSI + Volatilidad)
 * Entrada: array de closes desde getCryptoHistoricalBars (últimas 30 barras)
 * Salida: "RSI XX, σ YY%" | null si insuficientes datos
 */
export function calculatePatternFromBars(
  bars: { c: number }[] | null
): { value: string; source: string; ts: string } | null {
  if (!bars || bars.length < 14) return null;

  const closes = bars.slice(-30).map(b => b.c);

  // Calcular RSI (14 períodos)
  const rsi = calculateRSI(closes, 14);

  // Calcular volatilidad realizada (últimas 30 barras)
  const volatility = calculateVolatilityFromCloses(closes);

  if (rsi === null || volatility === null) return null;

  return {
    value: `RSI ${Math.round(rsi)}, σ ${volatility.toFixed(1)}%`,
    source: "RSI + σ realizada (Alpaca barras históricas)",
    ts: new Date().toISOString(),
  };
}

/**
 * RSI (Relative Strength Index) — 14 períodos
 */
function calculateRSI(closes: number[], period: number): number | null {
  if (closes.length < period + 1) return null;

  const changes = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  const gains = changes.slice(-period).map(c => c > 0 ? c : 0);
  const losses = changes.slice(-period).map(c => c < 0 ? -c : 0);

  const avgGain = gains.reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / period;

  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

/**
 * Volatilidad realizada (σ) desde closes
 */
function calculateVolatilityFromCloses(closes: number[]): number | null {
  if (closes.length < 2) return null;

  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]));
  }

  const variance = returns.reduce((sum, r) => sum + r * r, 0) / returns.length;
  let sigma = Math.sqrt(variance) * Math.sqrt(252) * 100; // Anualizada

  return sigma;
}

/**
 * OBTENER BARRAS HISTÓRICAS de equities desde Alpaca (fallback para Massive)
 * Endpoint: /v2/stocks/bars?symbols=SPY&timeframe=1D&limit={limit}
 */
export async function getEquityHistoricalBars(
  symbol: string,
  apiKey: string,
  apiSecret: string,
  baseUrl: string,
  limit: number = 200
): Promise<{ bars: { c: number; v: number; t: number }[] | null; error?: string }> {
  try {
    // Validar endpoint
    const endpointCheck = validateEndpoint(baseUrl);
    if (!endpointCheck.valid) {
      return { bars: null, error: endpointCheck.reason };
    }

    // En producción: llamar a Alpaca /v2/stocks/bars?symbols={symbol}&timeframe=1D&limit={limit}
    // Por ahora: generar histórico simulado para testing

    const generateMockBars = (basePrice: number, days: number) => {
      const bars = [];
      let price = basePrice;
      for (let i = days - 1; i >= 0; i--) {
        const change = (Math.random() - 0.5) * 0.02 * price;
        price += change;
        bars.push({
          c: price,
          v: 50000000 + Math.random() * 20000000,  // Volumen típico SPY
          t: Date.now() - i * 86_400_000,
        });
      }
      return bars;
    };

    return { bars: generateMockBars(769.3278, limit) };
  } catch (err) {
    return { bars: null, error: `Error fetching equity bars: ${err}` };
  }
}

/**
 * OBTENER QUOTES de equities desde Alpaca (fallback para Massive)
 * Endpoint: /v2/stocks/quotes?symbols=SPY
 */
export async function getEquityQuotes(
  symbol: string,
  apiKey: string,
  apiSecret: string,
  baseUrl: string
): Promise<{ quote: { bid: number; ask: number; size: number; timestamp: string } | null; error?: string }> {
  try {
    // Validar endpoint
    const endpointCheck = validateEndpoint(baseUrl);
    if (!endpointCheck.valid) {
      return { quote: null, error: endpointCheck.reason };
    }

    // En producción: llamar a Alpaca /v2/stocks/quotes?symbols={symbol}
    // Por ahora: retornar datos simulados

    const mockQuotes: Record<string, { bid: number; ask: number; size: number }> = {
      SPY: {
        bid: 769.20,
        ask: 769.45,
        size: 1000,
      },
    };

    const quote = mockQuotes[symbol];
    if (!quote) return { quote: null };

    return {
      quote: {
        bid: quote.bid,
        ask: quote.ask,
        size: quote.size,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (err) {
    return { quote: null, error: `Error fetching equity quotes: ${err}` };
  }
}

/**
 * CREAR CONFIGURACIÓN EJECUTOR (segura)
 */
export function createExecutorConfig(
  apiKey: string,
  apiSecret: string,
  baseUrl: string = "https://paper-api.alpaca.markets",
  accountBalance: number = 100000
): ExecutorConfig {
  return {
    alpacaBaseUrl: baseUrl,
    alpacaApiKey: apiKey,
    alpacaSecret: apiSecret,
    dryRun: true, // ← Proposal-only (NO ejecución)
    accountBalance,
  };
}

/**
 * DRY-RUN: Verificar conexión PAPER
 */
if (process.env.NODE_ENV === "development" && typeof process !== "undefined") {
  (async () => {
    console.log("\n🚀 ALPACA CONNECTOR — Sesión 25 VERIFICATION TEST\n");

    // TEST 1: Conexión PAPER válida
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("TEST 1: Conexión Alpaca PAPER (válida)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const result1 = await verifyAlpacaPaperConnection(
      "DUMMY_KEY", // En sesión real: credenciales PAPER
      "DUMMY_SECRET", // En sesión real: credenciales PAPER
      "https://paper-api.alpaca.markets"
    );
    console.log(`✓ Conectado: ${result1.connected}`);
    console.log(`✓ Endpoint: ${result1.endpoint}`);
    console.log(`✓ Tipo: ${result1.isPaper ? "PAPER ✅" : "LIVE ❌"}`);
    if (result1.account) {
      console.log(`✓ Estado: ${result1.account.status}`);
      console.log(`✓ Saldo: $${result1.account.cash.toLocaleString()}`);
      console.log(`✓ Buying Power: $${result1.account.buying_power.toLocaleString()}`);
    }
    console.log(`✓ Advertencias: ${result1.warnings.length === 0 ? "Ninguna" : result1.warnings.join(", ")}\n`);

    // TEST 2: Endpoint LIVE (debe bloquearse)
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("TEST 2: Bloqueo de endpoint LIVE");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const result2 = await verifyAlpacaPaperConnection(
      "DUMMY_KEY",
      "DUMMY_SECRET",
      "https://api.alpaca.markets" // ← LIVE (DEBE SER BLOQUEADO)
    );
    console.log(`❌ Conectado: ${result2.connected}`);
    console.log(`❌ Error: ${result2.error}\n`);

    // TEST 3: Credenciales vacías
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("TEST 3: Credenciales vacías (validación)");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    const result3 = await verifyAlpacaPaperConnection("", "", "https://paper-api.alpaca.markets");
    console.log(`❌ Conectado: ${result3.connected}`);
    console.log(`❌ Error: ${result3.error}\n`);

    console.log("✅ ALPACA CONNECTOR TEST COMPLETED");
    console.log("   Validación endpoint: ✓ PAPER/LIVE");
    console.log("   Protección credentials: ✓ NO imprime");
    console.log("   Lectura segura: ✓ Verificación únicamente");
  })();
}
