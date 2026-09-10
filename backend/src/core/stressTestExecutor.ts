/**
 * Stress Test Executor - Validación Real en Alpaca PAPER
 *
 * Ejecuta escenarios contra Alpaca PAPER, capturando métricas reales.
 * JAULA: PAPER ONLY. Sin LIVE. Sin credenciales modificadas.
 * Reporta: latencia, órdenes, errores, heartbeat, kill switch.
 */

import { Logger } from '@nestjs/common';
import * as fs from 'fs';
import { StressTestService, StressTestScenario, StressTestResult } from './stressTestService';
import { ExecutionEngine } from './executionEngine';
import { HeartbeatService } from './heartbeatService';

export interface TestExecutionReport {
  executedAt: string;
  scenarios: TestScenarioReport[];
  summary: {
    totalScenarios: number;
    passedScenarios: number;
    failedScenarios: number;
    totalOrders: number;
    successfulOrders: number;
    failedOrders: number;
    avgLatency: number;
    maxLatency: number;
    errorTypes: { [key: string]: number };
    killSwitchActivations: number;
    heartbeatLosses: number;
    mode: 'PAPER';
    status: 'READY_FOR_OPERATION' | 'NEEDS_INVESTIGATION';
  };
}

export interface TestScenarioReport {
  name: string;
  description: string;
  result: StressTestResult;
  verdict: 'PASS' | 'FAIL';
  notes: string;
}

export class StressTestExecutor {
  private readonly logger = new Logger(StressTestExecutor.name);
  private stressTestService: StressTestService;
  private reportFile = 'data/stress-test-report.json';

  constructor(
    executionEngine: ExecutionEngine,
    heartbeat: HeartbeatService
  ) {
    this.stressTestService = new StressTestService(executionEngine, heartbeat);
  }

  /**
   * Ejecutar suite de validación pre-operación
   */
  async executeValidationSuite(): Promise<TestExecutionReport> {
    this.logger.log('🧪 Starting Pre-Operation Validation Suite (PAPER MODE)');
    this.logger.log('⚙️  All tests run against Alpaca PAPER. Kill switch ready.');

    const report: TestExecutionReport = {
      executedAt: new Date().toISOString(),
      scenarios: [],
      summary: {
        totalScenarios: 0,
        passedScenarios: 0,
        failedScenarios: 0,
        totalOrders: 0,
        successfulOrders: 0,
        failedOrders: 0,
        avgLatency: 0,
        maxLatency: 0,
        errorTypes: {},
        killSwitchActivations: 0,
        heartbeatLosses: 0,
        mode: 'PAPER',
        status: 'NEEDS_INVESTIGATION',
      },
    };

    // Escenarios de validación
    const scenarios: Array<{ scenario: StressTestScenario; expectedVerdic: string }> = [
      {
        scenario: {
          name: 'light_load_paper',
          description: 'Light load: 5 consecutive orders in PAPER',
          ordersCount: 5,
          consecutiveOrders: true,
        },
        expectedVerdic: 'PASS - Baseline execution',
      },
      {
        scenario: {
          name: 'normal_load_paper',
          description: 'Normal load: 10 orders with potential failures',
          ordersCount: 10,
        },
        expectedVerdic: 'PASS if ≥80% success rate',
      },
      {
        scenario: {
          name: 'error_handling_paper',
          description: 'Error resilience: mixed success/failure scenarios',
          ordersCount: 8,
        },
        expectedVerdic: 'PASS - Error handling validated',
      },
    ];

    // Ejecutar cada escenario
    for (const { scenario, expectedVerdic } of scenarios) {
      try {
        this.logger.log(`\n🎯 Scenario: ${scenario.name}`);
        this.logger.log(`   ${scenario.description}`);
        this.logger.log(`   Expected: ${expectedVerdic}`);

        const result = await this.stressTestService.run(scenario);

        const scenarioReport: TestScenarioReport = {
          name: scenario.name,
          description: scenario.description,
          result,
          verdict: result.status,
          notes: this.generateScenarioNotes(result),
        };

        report.scenarios.push(scenarioReport);

        this.logger.log(
          `✅ Scenario ${result.status}: ${result.successful}/${result.totalOrders} orders`
        );
        this.logger.log(`   Latency avg: ${result.avgLatency.toFixed(0)}ms, max: ${result.maxLatency}ms`);
        this.logger.log(`   Errors: ${JSON.stringify(result.errors)}`);
      } catch (err) {
        this.logger.error(`❌ Scenario failed with exception: ${(err as Error).message}`);

        const scenarioReport: TestScenarioReport = {
          name: scenario.name,
          description: scenario.description,
          result: {
            scenario: scenario.name,
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            totalOrders: 0,
            successful: 0,
            failed: 0,
            duplicateDetected: 0,
            avgLatency: 0,
            maxLatency: 0,
            errors: { exception: 1 },
            heartbeatLosses: 0,
            mode: 'PAPER',
            status: 'FAIL',
          },
          verdict: 'FAIL',
          notes: `Exception: ${(err as Error).message}`,
        };

        report.scenarios.push(scenarioReport);
      }
    }

    // Calcular resumen
    report.summary.totalScenarios = report.scenarios.length;
    report.summary.passedScenarios = report.scenarios.filter(s => s.verdict === 'PASS').length;
    report.summary.failedScenarios = report.scenarios.filter(s => s.verdict === 'FAIL').length;

    report.scenarios.forEach(scenario => {
      const result = scenario.result;
      report.summary.totalOrders += result.totalOrders;
      report.summary.successfulOrders += result.successful;
      report.summary.failedOrders += result.failed;
      report.summary.maxLatency = Math.max(report.summary.maxLatency, result.maxLatency);
      report.summary.heartbeatLosses += result.heartbeatLosses;

      // Agregar errores
      Object.entries(result.errors).forEach(([key, count]) => {
        report.summary.errorTypes[key] = (report.summary.errorTypes[key] || 0) + count;
      });
    });

    // Calcular latencia promedio global
    if (report.summary.totalOrders > 0) {
      const latencies = report.scenarios.map(s => s.result.avgLatency * s.result.totalOrders);
      report.summary.avgLatency = latencies.reduce((a, b) => a + b, 0) / report.summary.totalOrders;
    }

    // Determinar estado final
    const successRate = report.summary.totalOrders > 0
      ? report.summary.successfulOrders / report.summary.totalOrders
      : 0;

    report.summary.status =
      report.summary.passedScenarios === report.summary.totalScenarios &&
      successRate >= 0.75
        ? 'READY_FOR_OPERATION'
        : 'NEEDS_INVESTIGATION';

    // Persistir reporte
    this.saveReport(report);

    // Resumen final
    this.logger.log('\n📊 VALIDATION SUITE SUMMARY');
    this.logger.log(`   Status: ${report.summary.status}`);
    this.logger.log(`   Scenarios: ${report.summary.passedScenarios}/${report.summary.totalScenarios} PASS`);
    this.logger.log(`   Orders: ${report.summary.successfulOrders}/${report.summary.totalOrders} successful`);
    this.logger.log(`   Latency: avg ${report.summary.avgLatency.toFixed(0)}ms, max ${report.summary.maxLatency}ms`);
    this.logger.log(`   Mode: ${report.summary.mode}`);

    if (report.summary.status === 'READY_FOR_OPERATION') {
      this.logger.log('🟢 Pre-operation validation PASSED. Awaiting authorization for Etapa 6.');
    } else {
      this.logger.error('🔴 Pre-operation validation FAILED. Investigation required.');
    }

    return report;
  }

  /**
   * Generar notas de escenario
   */
  private generateScenarioNotes(result: StressTestResult): string {
    const successRate = result.totalOrders > 0
      ? ((result.successful / result.totalOrders) * 100).toFixed(0)
      : '0';

    return `Success rate: ${successRate}%. Latency: ${result.avgLatency.toFixed(0)}ms avg, ${result.maxLatency}ms max. Duplicates: ${result.duplicateDetected}. Errors: ${Object.values(result.errors).reduce((a, b) => a + b, 0)}`;
  }

  /**
   * Guardar reporte a JSON
   */
  private saveReport(report: TestExecutionReport) {
    try {
      const dir = 'data';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        this.reportFile,
        JSON.stringify(report, null, 2)
      );

      this.logger.log(`📄 Report saved to ${this.reportFile}`);
    } catch (err) {
      this.logger.error(`Could not save report: ${(err as Error).message}`);
    }
  }

  /**
   * Obtener reporte guardado
   */
  getReport(): TestExecutionReport | null {
    try {
      if (!fs.existsSync(this.reportFile)) {
        return null;
      }

      const content = fs.readFileSync(this.reportFile, 'utf8');
      return JSON.parse(content);
    } catch (err) {
      this.logger.error(`Could not read report: ${(err as Error).message}`);
      return null;
    }
  }
}
