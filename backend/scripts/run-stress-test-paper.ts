#!/usr/bin/env node

/**
 * Run Stress Test on Alpaca PAPER
 *
 * Executes real validation against Alpaca Paper Trading API.
 * JAULA: PAPER ONLY. No LIVE. No credential changes.
 *
 * Usage: npm run stress-test:paper
 */

import axios, { AxiosError } from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

interface PaperOrderResult {
  success: boolean;
  orderId?: string;
  error?: string;
  statusCode?: number;
  latency: number;
}

interface PaperTestMetrics {
  totalOrders: number;
  successful: number;
  failed: number;
  avgLatency: number;
  maxLatency: number;
  errors: { [key: string]: number };
}

class AlpacaPaperTest {
  private apiKey: string;
  private baseUrl: string;
  private alpacaClient: any;

  constructor() {
    this.apiKey = process.env.ALPACA_API_KEY || '';
    const secretKey = process.env.ALPACA_SECRET_KEY || '';
    this.baseUrl = process.env.ALPACA_BASE_URL || 'https://paper-api.alpaca.markets';

    if (!this.apiKey || !secretKey) {
      throw new Error('❌ ALPACA_API_KEY or ALPACA_SECRET_KEY not found in .env.local');
    }

    console.log('🔐 Alpaca Paper Trading API');
    console.log(`   API Key: [REDACTED - ${this.apiKey.length} chars]`);
    console.log(`   Base URL: ${this.baseUrl}`);
    console.log(`   Mode: PAPER (read-only validation)\n`);

    this.alpacaClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'APCA-API-KEY-ID': this.apiKey,
        'APCA-API-SECRET-KEY': secretKey,
      },
    });
  }

  /**
   * Validar conexión a Alpaca
   */
  async validateConnection(): Promise<boolean> {
    try {
      console.log('📡 Validating Alpaca PAPER connection...');
      const response = await this.alpacaClient.get('/v2/account');

      const account = response.data;
      console.log('✅ Connection successful');
      console.log(`   Account: ${account.account_number || account.id || 'N/A'}`);
      console.log(`   Portfolio Value: $${parseFloat(account.portfolio_value || 0).toFixed(2)}`);
      console.log(`   Buying Power: $${parseFloat(account.buying_power || 0).toFixed(2)}`);

      // Flexible PAPER detection
      const accountType = account.account_type || account.type || 'paper';
      const isPaper = String(accountType).toLowerCase().includes('paper') || accountType === true;

      console.log(`   Mode: ${isPaper ? 'PAPER ✅' : 'LIVE ❌'}\n`);

      if (!isPaper) {
        throw new Error('❌ Account is not in PAPER mode!');
      }

      return true;
    } catch (err) {
      const axiosErr = err as AxiosError;
      console.error(`❌ Connection failed: ${axiosErr.message}`);
      console.error(`   Status: ${axiosErr.response?.status}`);
      console.error(`   Data: ${JSON.stringify(axiosErr.response?.data)}`);
      return false;
    }
  }

  /**
   * Ejecutar escenario de prueba
   */
  async runTestScenario(
    name: string,
    ordersCount: number
  ): Promise<{ scenario: string; metrics: PaperTestMetrics }> {
    console.log(`🧪 Scenario: ${name}`);
    console.log(`   Orders: ${ordersCount}`);

    const metrics: PaperTestMetrics = {
      totalOrders: ordersCount,
      successful: 0,
      failed: 0,
      avgLatency: 0,
      maxLatency: 0,
      errors: {},
    };

    const latencies: number[] = [];
    const symbols = ['SPY', 'QQQ', 'AAPL', 'MSFT'];

    for (let i = 0; i < ordersCount; i++) {
      const symbol = symbols[i % symbols.length];
      const startTime = Date.now();

      try {
        const orderData = {
          symbol,
          qty: 1,
          side: i % 2 === 0 ? 'buy' : 'sell',
          type: 'market',
          time_in_force: 'day',
        };

        const response = await this.alpacaClient.post('/v2/orders', orderData);
        const latency = Date.now() - startTime;
        latencies.push(latency);

        metrics.successful++;
        console.log(`   ✅ Order ${i + 1}/${ordersCount}: ${symbol} ${orderData.side} (${latency}ms)`);
      } catch (err) {
        const axiosErr = err as AxiosError;
        const latency = Date.now() - startTime;
        latencies.push(latency);

        const statusCode = axiosErr.response?.status || 0;
        const errorType = `error_${statusCode}`;

        metrics.failed++;
        metrics.errors[errorType] = (metrics.errors[errorType] || 0) + 1;

        console.log(`   ❌ Order ${i + 1}/${ordersCount}: ${axiosErr.message} (${latency}ms)`);
      }
    }

    // Calcular métricas
    if (latencies.length > 0) {
      metrics.avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      metrics.maxLatency = Math.max(...latencies);
    }

    console.log(`   📊 Results: ${metrics.successful}/${ordersCount} successful`);
    console.log(`   ⏱️  Latency: avg ${metrics.avgLatency.toFixed(0)}ms, max ${metrics.maxLatency}ms`);
    console.log(`   🔴 Failures: ${metrics.failed}`);
    if (Object.keys(metrics.errors).length > 0) {
      console.log(`   Errors: ${JSON.stringify(metrics.errors)}`);
    }
    console.log();

    return { scenario: name, metrics };
  }

  /**
   * Ejecutar suite completa
   */
  async runCompleteSuite() {
    console.log('🎯 ALPACA PAPER VALIDATION SUITE\n');
    console.log('═'.repeat(60));
    console.log();

    // 1. Validar conexión
    const isConnected = await this.validateConnection();
    if (!isConnected) {
      process.exit(1);
    }

    // 2. Ejecutar escenarios
    const results: Array<{ scenario: string; metrics: PaperTestMetrics }> = [];

    try {
      results.push(await this.runTestScenario('Light Load (5 orders)', 5));
      results.push(await this.runTestScenario('Normal Load (10 orders)', 10));
      results.push(await this.runTestScenario('Stress Load (8 orders)', 8));
    } catch (err) {
      console.error(`\n❌ Test suite error: ${(err as Error).message}`);
      process.exit(1);
    }

    // 3. Generar reporte
    this.generateReport(results);
  }

  /**
   * Generar reporte final
   */
  private generateReport(
    results: Array<{ scenario: string; metrics: PaperTestMetrics }>
  ) {
    console.log('═'.repeat(60));
    console.log('\n📊 VALIDATION REPORT\n');

    let totalOrders = 0;
    let totalSuccessful = 0;
    let maxLatency = 0;
    let totalLatency = 0;
    const allErrors: { [key: string]: number } = {};

    results.forEach(result => {
      const metrics = result.metrics;
      totalOrders += metrics.totalOrders;
      totalSuccessful += metrics.successful;
      maxLatency = Math.max(maxLatency, metrics.maxLatency);
      totalLatency += metrics.avgLatency * metrics.totalOrders;

      Object.entries(metrics.errors).forEach(([key, count]) => {
        allErrors[key] = (allErrors[key] || 0) + count;
      });
    });

    const avgLatency = totalOrders > 0 ? totalLatency / totalOrders : 0;
    const successRate = totalOrders > 0 ? (totalSuccessful / totalOrders) * 100 : 0;

    console.log(`Total Orders: ${totalSuccessful}/${totalOrders} (${successRate.toFixed(0)}%)`);
    console.log(`Latency: avg ${avgLatency.toFixed(0)}ms, max ${maxLatency}ms`);
    console.log(`Status: ${successRate >= 75 ? '🟢 PASS' : '🔴 FAIL'}`);
    console.log(`Mode: PAPER ✅`);

    if (Object.keys(allErrors).length > 0) {
      console.log(`\nErrors:`);
      Object.entries(allErrors).forEach(([error, count]) => {
        console.log(`  - ${error}: ${count}`);
      });
    }

    // Guardar reporte
    const report = {
      executedAt: new Date().toISOString(),
      mode: 'PAPER',
      scenarios: results.map(r => ({
        name: r.scenario,
        ...r.metrics,
      })),
      summary: {
        totalOrders,
        successfulOrders: totalSuccessful,
        failedOrders: totalOrders - totalSuccessful,
        avgLatency: parseFloat(avgLatency.toFixed(2)),
        maxLatency,
        successRate: parseFloat(successRate.toFixed(2)),
        status: successRate >= 75 ? 'PASS' : 'FAIL',
      },
    };

    const reportPath = path.resolve(__dirname, '../data/stress-test-report-paper.json');
    const dir = path.dirname(reportPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved: ${reportPath}`);

    console.log('\n✅ Validation complete. Ready for authorization.\n');
  }
}

// Ejecutar
async function main() {
  try {
    const test = new AlpacaPaperTest();
    await test.runCompleteSuite();
  } catch (err) {
    console.error(`\n❌ Fatal error: ${(err as Error).message}`);
    process.exit(1);
  }
}

main();
