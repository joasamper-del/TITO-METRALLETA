/**
 * VIX Index Provider (FRED - Federal Reserve Economic Data)
 *
 * Fetches real VIX data from FRED VIXCLS series
 * Updates: Daily at 4:30 PM ET
 * Source: St. Louis Federal Reserve (federalreserve.org)
 *
 * S62: LIVE integration ready
 */

import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface VIXData {
  value: number;
  date: Date;
  source: 'FRED-VIXCLS';
  lastUpdate: Date;
  regime: 'low-volatility' | 'medium-volatility' | 'high-volatility' | 'extreme-volatility';
}

@Injectable()
export class VIXProvider {
  readonly name = 'VIX (FRED)';
  readonly priority = 100; // Highest priority for regime detection
  private readonly logger = new Logger(VIXProvider.name);
  private readonly FRED_API_KEY = process.env.FRED_API_KEY;
  private readonly FRED_BASE_URL = 'https://api.stlouisfed.org/fred';
  private vixCache: VIXData | null = null;
  private cacheExpiry: Date = new Date();

  constructor() {}

  isAvailable(): boolean {
    return !!this.FRED_API_KEY;
  }

  /**
   * Get current VIX value from FRED API
   * Real data with live timestamp
   */
  async getVIX(): Promise<VIXData | null> {
    try {
      // Check cache (valid for 5 minutes)
      if (this.vixCache && new Date() < this.cacheExpiry) {
        return this.vixCache;
      }

      if (!this.FRED_API_KEY) {
        this.logger.warn('FRED_API_KEY not configured');
        return null;
      }

      // Fetch latest VIX from FRED
      const url = `${this.FRED_BASE_URL}/series/data`;
      const response = await axios.get(url, {
        params: {
          series_id: 'VIXCLS',
          api_key: this.FRED_API_KEY,
          file_type: 'json',
          limit: 1, // Only latest
          sort_order: 'desc',
        },
        timeout: 5000,
      });

      const observations = response.data?.observations || [];
      if (observations.length === 0) {
        this.logger.warn('No VIX data returned from FRED');
        return null;
      }

      const latest = observations[0];
      const vixValue = parseFloat(latest.value);

      if (isNaN(vixValue)) {
        this.logger.warn('Invalid VIX value from FRED:', latest.value);
        return null;
      }

      // Determine regime
      let regime: VIXData['regime'] = 'medium-volatility';
      if (vixValue < 12) regime = 'low-volatility';
      else if (vixValue > 30) regime = 'high-volatility';
      else if (vixValue > 40) regime = 'extreme-volatility';

      const vixData: VIXData = {
        value: vixValue,
        date: new Date(latest.date),
        source: 'FRED-VIXCLS',
        lastUpdate: new Date(),
        regime,
      };

      // Cache for 5 minutes
      this.vixCache = vixData;
      this.cacheExpiry = new Date(Date.now() + 5 * 60 * 1000);

      this.logger.log(`✅ VIX=${vixValue} (${regime}) from FRED at ${vixData.date.toISOString()}`);

      return vixData;
    } catch (error: any) {
      this.logger.error('Failed to fetch VIX:', error.message);
      return null;
    }
  }

  /**
   * Determine if market regime is favorable for options trading
   */
  async isOptionsEnvironment(): Promise<boolean> {
    const vix = await this.getVIX();
    if (!vix) return false;

    // Options trading is easier when VIX is moderate (12-30)
    // Avoid extremes (too calm or too chaotic)
    return vix.value >= 12 && vix.value <= 30;
  }

  /**
   * Get regime description for UI display
   */
  async getRegimeDescription(): Promise<string> {
    const vix = await this.getVIX();
    if (!vix) return 'UNKNOWN';

    const descriptions: Record<VIXData['regime'], string> = {
      'low-volatility': '🟢 Calm market - Low IV, hard to profit from options',
      'medium-volatility': '🟡 Normal market - Optimal for options strategies',
      'high-volatility': '🔴 Stressed market - High premiums, elevated risk',
      'extreme-volatility': '⚠️  Crisis market - Extreme swings, avoid risky strategies',
    };

    return `VIX=${vix.value.toFixed(2)} ${descriptions[vix.regime]}`;
  }

  /**
   * Clear cache (for testing or manual refresh)
   */
  clearCache(): void {
    this.vixCache = null;
    this.cacheExpiry = new Date();
  }
}
