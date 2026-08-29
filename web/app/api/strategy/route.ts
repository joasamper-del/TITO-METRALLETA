/**
 * STRATEGY OPERATIVE DATA — Sesión 27
 * Proporciona datos reales del pipeline para modo Operativo de /strategy
 * Conecta múltiples fuentes: Massive, MarketSnack, Schwab
 * Fail-safe: si un dato falta, deja null (NO fallback hardcoded)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getCryptoPrice,
  getCryptoHistoricalBars,
  getCryptoQuotes,
  getEquityHistoricalBars,
  getEquityQuotes,
  calculateTrendFromBars,
  calculatePatternFromBars,
} from "@/lib/alpacaConnector";
import { evaluateBlockingEvents } from "@/lib/blockingEvents";
import { earningsForTicker } from "@/lib/earnings";
import { buildNewsReport } from "@/lib/news";

// Helper: Obtiene barras diarias históricas desde Massive
async function getMassiveBars(ticker: string, days: number = 200): Promise<number[]> {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days + 30)); // Buffer para weekends

  const url = `https://api.massive.com/v2/aggs/ticker/${ticker}/range/1/day/${startDate
    .toISOString()
    .split("T")[0]}/${endDate.toISOString().split("T")[0]}`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.MASSIVE_API_KEY || ""}`,
      },
    });

    if (!response.ok) return [];

    const data: any = await response.json();
    // Requerimiento flexible basado en días solicitados (con buffer pequeño para weekends)
    const minBars = Math.max(2, days - 10);
    if (!data.results || data.results.length < minBars) return [];

    return data.results.map((bar: any) => bar.c); // closes
  } catch (err) {
    return [];
  }
}

// Helper: Calcula media móvil
function calculateMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;
  const sum = closes.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

// Helper: Calcula volatilidad realizada (σ) desde closes
function calculateVolatility(closes: number[], annualize: boolean = true): number | null {
  if (closes.length < 2) return null;

  const returns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const ret = Math.log(closes[i] / closes[i - 1]);
    returns.push(ret);
  }

  if (returns.length === 0) return null;

  const sumSquaredReturns = returns.reduce((sum, ret) => sum + ret * ret, 0);
  const variance = sumSquaredReturns / returns.length;
  let sigma = Math.sqrt(variance);

  if (annualize) {
    sigma = sigma * Math.sqrt(252); // Trading days per year
  }

  return sigma * 100; // Retornar como porcentaje
}

// Helper: Obtiene VIX real desde FRED (serie VIXCLS)
async function getVIXFromFRED(): Promise<{ value: number | null; date: string | null; ts: string }> {
  const now = new Date().toISOString();
  try {
    const fredApiKey = process.env.FRED_API_KEY;
    if (!fredApiKey) {
      return { value: null, date: null, ts: now };
    }

    // FRED VIXCLS — última observación disponible
    // Endpoint: /fred/series/observations con series_id=VIXCLS
    // Solicitar JSON (file_type=json), ordenar por fecha descendente, obtener últimas 1
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=VIXCLS&api_key=${fredApiKey}&file_type=json&limit=1&sort_order=desc`;
    const response = await fetch(url);

    if (!response.ok) {
      return { value: null, date: null, ts: now };
    }

    const data: any = await response.json();
    if (data.observations && data.observations.length > 0) {
      const obs = data.observations[0];
      const vixValue = obs.value ? parseFloat(obs.value) : null;

      if (typeof vixValue === "number" && vixValue > 0 && vixValue < 200) {
        return {
          value: vixValue,
          date: obs.date, // YYYY-MM-DD
          ts: now,
        };
      }
    }
  } catch (err) {
    // No fallback: null si FRED falla
  }

  return { value: null, date: null, ts: now };
}

export interface StrategyOperativeData {
  symbol: string;
  timestamp: string;
  direction: "LONG" | "SHORT" | null;
  price: { value: number | null; source: string; ts: string } | null;
  trend: { value: "alcista" | "bajista" | "lateral" | null; source: string; ts: string } | null;
  volatility: { value: number | null; source: string; ts: string } | null;
  volume: { value: number | null; source: string; ts: string } | null;
  liquidity: { value: string | null; source: string; ts: string } | null;
  pattern: { value: string | null; source: string; ts: string } | null;
  blockingEvent: { value: boolean; source: string; ts: string } | null;
  regime: { value: string | null; source: string; ts: string } | null;
  dataQuality: "alta" | "media" | "baja";
  failSafeReason?: string;
}

/**
 * GET /api/strategy?ticker=SPY&direction=LONG
 * Devuelve datos operativos reales del ticker indicado
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker")?.toUpperCase();
  const direction = searchParams.get("direction") as "LONG" | "SHORT" | null;

  if (!ticker) {
    return NextResponse.json({ error: "ticker parameter required" }, { status: 400 });
  }

  const now = new Date().toISOString();
  let dataQuality: "alta" | "media" | "baja" = "media";
  let failSafeReason: string | undefined;
  const missingData: string[] = [];

  // FUENTE 1: Precio actual (Massive o Alpaca)
  let price: StrategyOperativeData["price"] = null;
  try {
    // Crypto: Usar alpacaConnector.getCryptoPrice
    if (["BTC", "ETH"].includes(ticker)) {
      try {
        const cryptoResult = await getCryptoPrice(
          ticker as "BTC" | "ETH",
          process.env.ALPACA_PAPER_KEY || "",
          process.env.ALPACA_PAPER_SECRET || "",
          "https://paper-api.alpaca.markets"
        );
        if (cryptoResult.price) {
          price = {
            value: cryptoResult.price,
            source: "Alpaca /crypto/latest/quotes",
            ts: now,
          };
        }
      } catch (cryptoErr) {
        // No fallback: null si Alpaca falla
      }
    } else {
      // Equities: Massive /v2/snapshot (precio más reciente: último minuto o cierre)
      try {
        const url = `https://api.massive.com/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`;
        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${process.env.MASSIVE_API_KEY || ""}`,
          },
        });

        if (response.ok) {
          const data: any = await response.json();
          // Estructura real de Massive: { ticker: { min: { c, t }, day: { c } } }
          // SOLO precio intradía fresco (ticker.min.c), NO fallback a ticker.day.c
          if (data.ticker?.min?.c && typeof data.ticker.min.c === "number" && data.ticker.min.c > 0) {
            price = {
              value: data.ticker.min.c,
              source: "Massive /v2/snapshot",
              ts: now,
            };
          }
        }
      } catch (err) {
        // No fallback: null si Massive falla o no devuelve precio
      }
    }

    if (!price) {
      missingData.push("price");
    }
  } catch (err) {
    missingData.push("price");
  }

  // FUENTE 2: Tendencia (MA50/MA200 calculada)
  let trend: StrategyOperativeData["trend"] = null;
  try {
    if (["BTC", "ETH"].includes(ticker)) {
      // Crypto: Obtener 200 barras históricas de Alpaca y calcular tendencia
      const barsResult = await getCryptoHistoricalBars(
        [ticker as "BTC" | "ETH"],
        process.env.ALPACA_PAPER_KEY || "",
        process.env.ALPACA_PAPER_SECRET || "",
        "https://paper-api.alpaca.markets",
        200  // Solicitar 200 barras para MA50/MA200
      );

      if (barsResult.bars && barsResult.bars[ticker]) {
        const trendResult = calculateTrendFromBars(barsResult.bars[ticker]);
        if (trendResult) {
          trend = {
            value: trendResult.value,
            source: trendResult.source,
            ts: now,
          };
        }
      }
    } else {
      // Equities: Massive /v2/aggs (con fallback a Alpaca)
      const closes = await getMassiveBars(ticker, 200);

      if (closes.length >= 200) {
        const ma50 = calculateMA(closes, 50);
        const ma200 = calculateMA(closes, 200);

        if (ma50 !== null && ma200 !== null) {
          const diff = Math.abs((ma50 - ma200) / ma200);

          let trendValue: "alcista" | "bajista" | "lateral";
          if (diff < 0.01) {
            trendValue = "lateral";
          } else if (ma50 > ma200) {
            trendValue = "alcista";
          } else {
            trendValue = "bajista";
          }

          trend = {
            value: trendValue,
            source: "MA50/MA200 (Massive)",
            ts: now,
          };
        }
      }

      // Fallback: Si Massive falla, usar Alpaca /v2/stocks/bars
      if (!trend) {
        const alpacaBarsResult = await getEquityHistoricalBars(
          ticker,
          process.env.ALPACA_PAPER_KEY || "",
          process.env.ALPACA_PAPER_SECRET || "",
          "https://paper-api.alpaca.markets",
          200
        );

        if (alpacaBarsResult.bars && alpacaBarsResult.bars.length >= 200) {
          const closes_alpaca = alpacaBarsResult.bars.map(b => b.c);
          const ma50 = calculateMA(closes_alpaca, 50);
          const ma200 = calculateMA(closes_alpaca, 200);

          if (ma50 !== null && ma200 !== null) {
            const diff = Math.abs((ma50 - ma200) / ma200);

            let trendValue: "alcista" | "bajista" | "lateral";
            if (diff < 0.01) {
              trendValue = "lateral";
            } else if (ma50 > ma200) {
              trendValue = "alcista";
            } else {
              trendValue = "bajista";
            }

            trend = {
              value: trendValue,
              source: "MA50/MA200 (Alpaca fallback)",
              ts: now,
            };
          }
        }
      }
    }
  } catch (err) {
    // No fallback: null si datos insuficientes
  }
  if (!trend) {
    missingData.push("trend");
  }

  // FUENTE 3: Volatilidad (σ realizada desde 30 barras)
  let volatility: StrategyOperativeData["volatility"] = null;
  try {
    const closes = await getMassiveBars(ticker, 30);

    // Especificación estricta: >= 30 barras para σ realizada
    // Si < 30 barras: null (no fallback)
    if (closes.length >= 30) {
      const recentCloses = closes.slice(-30);
      const sigma = calculateVolatility(recentCloses, true);

      if (sigma !== null && !isNaN(sigma)) {
        volatility = {
          value: sigma,
          source: "σ realizada (30 barras)",
          ts: now,
        };
      }
    }
  } catch (err) {
    // No fallback: null si Massive falla o barras insuficientes
  }
  if (!volatility) {
    missingData.push("volatility");
  }

  // FUENTE 4: Volumen (24h intradía)
  let volume: StrategyOperativeData["volume"] = null;
  try {
    if (["BTC", "ETH"].includes(ticker)) {
      // Crypto: Alpaca /v1beta3/crypto/latest/bars (volumen intradía)
      const barsResult = await getCryptoHistoricalBars(
        [ticker as "BTC" | "ETH"],
        process.env.ALPACA_PAPER_KEY || "",
        process.env.ALPACA_PAPER_SECRET || "",
        "https://paper-api.alpaca.markets",
        1  // Solo la barra de hoy para volumen
      );

      if (barsResult.bars && barsResult.bars[ticker] && Array.isArray(barsResult.bars[ticker])) {
        const todayBar = barsResult.bars[ticker][barsResult.bars[ticker].length - 1];
        if (todayBar && typeof todayBar.v === "number" && todayBar.v > 0) {
          volume = {
            value: todayBar.v,
            source: `Alpaca /v1beta3/crypto/latest/bars (volumen)`,
            ts: now,
          };
        }
      }
    } else {
      // Equities: Massive /v2/aggs (con fallback a Alpaca)
      const today = new Date().toISOString().split("T")[0];
      const url = `https://api.massive.com/v2/aggs/ticker/${ticker}/range/1/day/${today}/${today}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${process.env.MASSIVE_API_KEY || ""}`,
        },
      });

      if (response.ok) {
        const data: any = await response.json();
        if (data.results && data.results.length > 0) {
          const dailyVolume = data.results[0].v;
          if (typeof dailyVolume === "number" && dailyVolume > 0) {
            volume = {
              value: dailyVolume,
              source: `Massive /v2/aggs (volumen diario)`,
              ts: now,
            };
          }
        }
      }

      // Fallback: Si Massive falla, usar Alpaca /v2/stocks/bars
      if (!volume) {
        const alpacaBarsResult = await getEquityHistoricalBars(
          ticker,
          process.env.ALPACA_PAPER_KEY || "",
          process.env.ALPACA_PAPER_SECRET || "",
          "https://paper-api.alpaca.markets",
          1  // Solo hoy
        );

        if (alpacaBarsResult.bars && alpacaBarsResult.bars.length > 0) {
          const dailyVolume = alpacaBarsResult.bars[0].v;
          if (typeof dailyVolume === "number" && dailyVolume > 0) {
            volume = {
              value: dailyVolume,
              source: `Alpaca /v2/stocks/bars (fallback)`,
              ts: now,
            };
          }
        }
      }
    }
  } catch (err) {
    // No fallback: null si Massive falla o no devuelve volumen
  }
  if (!volume) {
    missingData.push("volume");
  }

  // FUENTE 5: Liquidez (bid/ask spread real)
  let liquidity: StrategyOperativeData["liquidity"] = null;
  try {
    if (["BTC", "ETH"].includes(ticker)) {
      // Crypto: Alpaca /v1beta3/crypto/latest/quotes (bid/ask spread)
      const quotesResult = await getCryptoQuotes(
        [ticker as "BTC" | "ETH"],
        process.env.ALPACA_PAPER_KEY || "",
        process.env.ALPACA_PAPER_SECRET || "",
        "https://paper-api.alpaca.markets"
      );

      if (quotesResult.quotes && quotesResult.quotes[ticker]) {
        const { bid, ask } = quotesResult.quotes[ticker];
        if (typeof bid === "number" && typeof ask === "number" && bid > 0 && ask > bid) {
          const mid = (bid + ask) / 2;
          const spreadPct = ((ask - bid) / mid) * 100;
          liquidity = {
            value: spreadPct.toFixed(3) + "%",
            source: "Alpaca /v1beta3/crypto/latest/quotes (spread)",
            ts: now,
          };
        }
      }
    } else {
      // Equities: Massive /v2/snapshot (con fallback a Alpaca)
      const url = `https://api.massive.com/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${process.env.MASSIVE_API_KEY || ""}`,
        },
      });

      if (response.ok) {
        const data: any = await response.json();
        if (data.ticker?.lastQuote) {
          const { bid, ask } = data.ticker.lastQuote;
          if (typeof bid === "number" && typeof ask === "number" && bid > 0 && ask > bid) {
            const mid = (bid + ask) / 2;
            const spreadPct = ((ask - bid) / mid) * 100;
            liquidity = {
              value: spreadPct.toFixed(3) + "%",
              source: "Massive /v2/snapshot (spread)",
              ts: now,
            };
          }
        }
      }

      // Fallback: Si Massive falla, usar Alpaca /v2/stocks/quotes
      if (!liquidity) {
        const alpacaQuoteResult = await getEquityQuotes(
          ticker,
          process.env.ALPACA_PAPER_KEY || "",
          process.env.ALPACA_PAPER_SECRET || "",
          "https://paper-api.alpaca.markets"
        );

        if (alpacaQuoteResult.quote) {
          const { bid, ask, size } = alpacaQuoteResult.quote;
          if (typeof bid === "number" && typeof ask === "number" && bid > 0 && ask > bid) {
            const mid = (bid + ask) / 2;
            const spreadPct = ((ask - bid) / mid) * 100;
            liquidity = {
              value: `${spreadPct.toFixed(3)}% (size: ${size})`,
              source: "Alpaca /v2/stocks/quotes (fallback)",
              ts: now,
            };
          }
        }
      }
    }
  } catch (err) {
    // No fallback: null si Massive falla o no devuelve bid/ask
  }
  if (!liquidity) {
    missingData.push("liquidity");
  }

  // FUENTE 6: Patrón (TVContext alerts o análisis técnico de barras)
  let pattern: StrategyOperativeData["pattern"] = null;
  try {
    if (["BTC", "ETH"].includes(ticker)) {
      // Crypto: Obtener 30 barras y calcular patrón (RSI + σ realizada)
      const patternBarsResult = await getCryptoHistoricalBars(
        [ticker as "BTC" | "ETH"],
        process.env.ALPACA_PAPER_KEY || "",
        process.env.ALPACA_PAPER_SECRET || "",
        "https://paper-api.alpaca.markets",
        30  // Solicitar 30 barras para RSI + σ
      );

      if (patternBarsResult.bars && patternBarsResult.bars[ticker]) {
        const patternResult = calculatePatternFromBars(patternBarsResult.bars[ticker]);
        if (patternResult) {
          pattern = {
            value: patternResult.value,
            source: patternResult.source,
            ts: now,
          };
        }
      }
    } else {
      // Equities: TVContext alerts desde webhook
      const fs = await import("fs").catch(() => null);
      if (fs) {
        try {
        const alertPath = "data/alerts.json";
        const alertsContent = fs.readFileSync(alertPath, "utf-8");
        const alertsData: any = JSON.parse(alertsContent);

        // Estructura: { updatedAt, items: [...] }
        const allAlerts = alertsData.items || [];

        // Filtrar por ticker y últimas 24h
        const oneDay = 24 * 60 * 60 * 1000;
        const now_ms = Date.now();

        const recentAlerts = allAlerts.filter((a: any) => {
          const alertTime = new Date(a.receivedAt).getTime();
          return a.ticker === ticker && now_ms - alertTime < oneDay;
        });

        // Extraer indicadores técnicos desde raw.source + raw.value
        const indicatorMap: { [key: string]: any } = {};
        recentAlerts.forEach((a: any) => {
          const source = a.raw?.source;
          const value = a.raw?.value;

          // Solo procesar si raw.source y raw.value existen
          if (source && typeof value === "number") {
            // Tomar la alerta más reciente por indicador
            if (!indicatorMap[source]) {
              indicatorMap[source] = { value, receivedAt: a.receivedAt };
            }
          }
        });

        // Especificación estricta: >= 2 indicadores
        const indicators = Object.entries(indicatorMap).slice(0, 5); // Top 5 máximo
        if (indicators.length >= 2) {
          const summary = indicators
            .map(([source, data]: [string, any]) => `${source} ${data.value}`)
            .join(", ");

          pattern = {
            value: summary,
            source: "TVContext alerts (últimas 24h)",
            ts: now,
          };
        }
        // Si < 2 indicadores: pattern sigue null (fail-safe)
        } catch (fsErr) {
          // No fallback: null si lectura falla
        }
      }
    }
  } catch (err) {
    // No fallback: null si TVContext no disponible
  }
  if (!pattern) {
    missingData.push("pattern");
  }

  // FUENTE 7: Evento bloqueante (earnings, news) — Sesión 35
  let blockingEvent: StrategyOperativeData["blockingEvent"] = null;
  try {
    let earningsData: { flag: any; daysUntilEarnings: number | null } | null = null;
    let newsData: { hasCriticalNews: boolean; criticalReasons: string[] } | null = null;

    // Obtener datos de earnings
    try {
      const earnings = await earningsForTicker({
        ticker,
        expiration: new Date().toISOString().split("T")[0], // Hoy
        frontSkew: null, // No disponible en este contexto
        now: new Date(),
      });

      if (earnings && earnings !== "no_aplica") {
        // Calcular días aproximados hasta earnings (solo si "dentro" o "dentro_confirmado")
        let daysUntilEarnings: number | null = null;
        if (earnings === "dentro" || earnings === "dentro_confirmado") {
          // Estimación: si dentro, asumir ~10 días (promedio hasta próximo earnings)
          daysUntilEarnings = 10; // Proxy conservador
        }

        earningsData = {
          flag: earnings,
          daysUntilEarnings,
        };
      }
    } catch (earningsErr) {
      // No fallback: null si earnings falla
    }

    // Obtener datos de noticias
    try {
      const newsReport = await buildNewsReport(ticker, null, new Date());
      if (newsReport) {
        // Clasificar noticias como críticas si contienen palabras clave
        const criticalKeywords = ["bankruptcy", "sec", "fraud", "delisting", "resign"];
        const allNews = [...(newsReport.macroNews || []), ...(newsReport.companyNews || [])];
        const criticalMatches = allNews
          .filter((n: any) =>
            criticalKeywords.some((kw) =>
              (n.title || "").toLowerCase().includes(kw) ||
              (n.description || "").toLowerCase().includes(kw)
            )
          )
          .map((n: any) => n.title || "critical_news");

        if (criticalMatches.length > 0) {
          newsData = {
            hasCriticalNews: true,
            criticalReasons: criticalMatches.slice(0, 3), // Top 3
          };
        } else {
          newsData = {
            hasCriticalNews: false,
            criticalReasons: [],
          };
        }
      }
    } catch (newsErr) {
      // No fallback: null si news falla
    }

    // Evaluar bloqueos
    const evaluation = evaluateBlockingEvents(earningsData, newsData);

    blockingEvent = {
      value: evaluation.value,
      source: evaluation.source,
      ts: now,
    };

    // Nota: si value es null, marcar como REVISAR MANUALMENTE en missingData
    if (evaluation.value === null) {
      blockingEvent = {
        ...blockingEvent,
        value: null,
        source: `${evaluation.source} — REVISAR MANUALMENTE`,
      };
    }
  } catch (err) {
    // No fallback: null si evaluación completa falla
  }
  if (!blockingEvent) {
    missingData.push("blockingEvent");
  }

  // FUENTE 8: Régimen (VIX para SPY/QQQ, Fear & Greed para BTC/ETH) — Sesión 35
  let regime: StrategyOperativeData["regime"] = null;
  try {
    const isCrypto = ["BTC", "ETH"].includes(ticker);
    console.log(`[REGIME-S35] Ticker: ${ticker}, isCrypto: ${isCrypto}`);

    if (isCrypto) {
      // Crypto: Fear & Greed Index desde CoinGecko (pública, sin auth)
      try {
        const response = await fetch("https://api.alternative.me/fng/?limit=1");
        if (response.ok) {
          const data: any = await response.json();
          if (data.data && data.data.length > 0) {
            const fearValue = parseInt(data.data[0].value);
            const fearStatus = data.data[0].value_classification;

            if (typeof fearValue === "number" && fearValue >= 0 && fearValue <= 100) {
              regime = {
                value: `${fearStatus} (${fearValue} Fear Index)`,
                source: "CoinGecko Fear & Greed Index",
                ts: now,
              };
            }
          }
        }
      } catch (cryptoErr) {
        // No fallback: null si CoinGecko falla
      }
    } else {
      // Equities (SPY, QQQ): VIX real desde FRED (serie VIXCLS)
      // Especificación estricta: obtener VIX real de datos frescos
      try {
        const vixData = await getVIXFromFRED();

        if (vixData.value !== null && typeof vixData.value === "number") {
          let vixRegime = "Normal";
          // Clasificación de régimen según VIX real (estándar CBOE)
          if (vixData.value < 12) {
            vixRegime = "Dormida";
          } else if (vixData.value < 20) {
            vixRegime = "Compresión";
          } else if (vixData.value < 35) {
            vixRegime = "Normal";
          } else if (vixData.value < 50) {
            vixRegime = "Expansión";
          } else {
            vixRegime = "Pánico";
          }

          regime = {
            value: `${vixRegime} (VIX ${vixData.value.toFixed(2)})`,
            source: `FRED VIXCLS — ${vixData.date || "último disponible"}`,
            ts: now,
          };
        }
      } catch (equityErr) {
        // No fallback: null si FRED falla o VIX no disponible
      }
    }
  } catch (err) {
    missingData.push("regime");
  }

  // Determinar calidad de datos y fail-safe
  if (missingData.length > 3) {
    dataQuality = "baja";
    failSafeReason = `Datos insuficientes del pipeline: falta ${missingData.join(", ")}. NO OPERAR.`;
  } else if (missingData.length > 0) {
    dataQuality = "media";
  } else {
    dataQuality = "alta";
  }

  const response: StrategyOperativeData = {
    symbol: ticker,
    timestamp: now,
    direction: direction || null,
    price,
    trend,
    volatility,
    volume,
    liquidity,
    pattern,
    blockingEvent,
    regime,
    dataQuality,
    failSafeReason,
  };

  return NextResponse.json(response);
}
