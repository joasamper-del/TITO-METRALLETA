/**
 * Real Data Fetcher
 * Loads real 2024 market data with retry logic and fallback
 */

import { LiveDataService } from "../data/LiveDataService";
import { HistoricalDataLoader, MarketDataSet } from "../data/historicalDataLoader";
import { HistoricalBar } from "../data/types";

export interface DataFetchResult {
  success: boolean;
  dataSet?: MarketDataSet;
  validation?: {
    spy: { valid: boolean; bars: number; issues: string[] };
    qqq: { valid: boolean; bars: number; issues: string[] };
    btc: { valid: boolean; bars: number; issues: string[] };
    vix: { valid: boolean; bars: number; issues: string[] };
  };
  sourcesUsed: {
    spy: string;
    qqq: string;
    btc: string;
    vix: string;
  };
  fetchedAt: Date;
  error?: string;
}

export class RealDataFetcher {
  private retryAttempts = 3;
  private retryDelay = 1000; // ms

  constructor(private dataService: LiveDataService, private dataLoader: HistoricalDataLoader) {}

  async fetchRealData(year: number = 2024): Promise<DataFetchResult> {
    const startTime = Date.now();

    try {
      console.log(`[S48] Starting real data fetch for ${year}...`);

      const dataSet = await this.fetchWithRetry(year);

      if (!dataSet) {
        return {
          success: false,
          fetchedAt: new Date(),
          sourcesUsed: {
            spy: "FAILED",
            qqq: "FAILED",
            btc: "FAILED",
            vix: "FAILED",
          },
          error: "Failed to fetch data from all sources",
        };
      }

      console.log(`[S48] Data fetched successfully. Validating...`);

      const validation = this.dataLoader.validateDataSet(dataSet);

      const result: DataFetchResult = {
        success: validation.allValid,
        dataSet,
        validation: {
          spy: {
            valid: validation.spy.isValid,
            bars: dataSet.spy.length,
            issues: validation.spy.issues,
          },
          qqq: {
            valid: validation.qqq.isValid,
            bars: dataSet.qqq.length,
            issues: validation.qqq.issues,
          },
          btc: {
            valid: validation.btc.isValid,
            bars: dataSet.btc.length,
            issues: validation.btc.issues,
          },
          vix: {
            valid: validation.vix.isValid,
            bars: dataSet.vix.length,
            issues: validation.vix.issues,
          },
        },
        sourcesUsed: {
          spy: "polygon",
          qqq: "polygon",
          btc: "alpaca",
          vix: "massive",
        },
        fetchedAt: new Date(),
      };

      const fetchTime = Date.now() - startTime;
      console.log(`[S48] Data fetch complete (${fetchTime}ms). Validation: ${validation.allValid ? "✅ PASS" : "❌ FAIL"}`);

      return result;
    } catch (error: any) {
      const fetchTime = Date.now() - startTime;
      console.error(`[S48] Real data fetch failed (${fetchTime}ms): ${error.message}`);

      return {
        success: false,
        fetchedAt: new Date(),
        sourcesUsed: {
          spy: "FAILED",
          qqq: "FAILED",
          btc: "FAILED",
          vix: "FAILED",
        },
        error: error.message || "Unknown error during data fetch",
      };
    }
  }

  private async fetchWithRetry(year: number): Promise<MarketDataSet | null> {
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`[S48] Fetch attempt ${attempt}/${this.retryAttempts}...`);
        return await this.dataLoader.loadFullDataSet(year);
      } catch (error) {
        console.warn(`[S48] Attempt ${attempt} failed: ${(error as any).message}`);

        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.log(`[S48] Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    return null;
  }

  async getDataStatistics(dataSet: MarketDataSet): Promise<{
    spy: { dayCount: number; priceRange: { min: number; max: number }; volatility: number };
    qqq: { dayCount: number; priceRange: { min: number; max: number }; volatility: number };
    btc: { dayCount: number; priceRange: { min: number; max: number }; volatility: number };
    vix: { dayCount: number; priceRange: { min: number; max: number }; volatility: number };
  }> {
    return {
      spy: this.dataLoader.getStatistics(dataSet.spy),
      qqq: this.dataLoader.getStatistics(dataSet.qqq),
      btc: this.dataLoader.getStatistics(dataSet.btc),
      vix: this.dataLoader.getStatistics(dataSet.vix),
    };
  }

  async generateDataReport(result: DataFetchResult): Promise<string> {
    const report = `
╔════════════════════════════════════════════════════════════════════╗
║          SESSION 48 — REAL DATA FETCH REPORT                      ║
╚════════════════════════════════════════════════════════════════════╝

Fetch Status: ${result.success ? "✅ SUCCESS" : "❌ FAILED"}
Fetched At: ${result.fetchedAt.toISOString()}

${
  result.validation
    ? `
DATA VALIDATION:
─────────────────────────────────────────────────────────────────────
Symbol | Status | Bars | Issues
SPY    | ${result.validation.spy.valid ? "✅" : "❌"} | ${result.validation.spy.bars} | ${result.validation.spy.issues.join("; ") || "None"}
QQQ    | ${result.validation.qqq.valid ? "✅" : "❌"} | ${result.validation.qqq.bars} | ${result.validation.qqq.issues.join("; ") || "None"}
BTC    | ${result.validation.btc.valid ? "✅" : "❌"} | ${result.validation.btc.bars} | ${result.validation.btc.issues.join("; ") || "None"}
VIX    | ${result.validation.vix.valid ? "✅" : "❌"} | ${result.validation.vix.bars} | ${result.validation.vix.issues.join("; ") || "None (context)"}

DATA SOURCES USED:
─────────────────────────────────────────────────────────────────────
SPY: ${result.sourcesUsed.spy}
QQQ: ${result.sourcesUsed.qqq}
BTC: ${result.sourcesUsed.btc}
VIX: ${result.sourcesUsed.vix}
`
    : ""
}

${
  result.error
    ? `
ERROR:
─────────────────────────────────────────────────────────────────────
${result.error}
`
    : ""
}

═══════════════════════════════════════════════════════════════════════
`;

    return report;
  }
}
