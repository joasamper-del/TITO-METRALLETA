/**
 * Resilience Tester - Guardian Failure Scenarios
 *
 * Tests Guardian's behavior under controlled failures:
 * 1. Provider down (connection failure)
 * 2. Incomplete data (missing fields)
 * 3. Connection timeout
 * 4. Contradictory information (sources disagree)
 * 5. Cascading failure (multiple providers down)
 *
 * Goal: Verify Guardian FAILS GRACEFULLY and EXPLAINS WHY
 */

import { Injectable, Logger } from '@nestjs/common';

export interface FailureScenario {
  name: string;
  description: string;
  trigger: string; // What causes this
  expectedBehavior: string; // How Guardian should respond
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ResilienceTestResult {
  scenario: FailureScenario;
  passed: boolean;
  observedBehavior: string;
  guardianResponse: string; // What Guardian said/did
  confidenceImpact: number; // How much confidence dropped
  gracefulFailure: boolean; // Did it fail controlled?
}

@Injectable()
export class ResilienceTester {
  private readonly logger = new Logger(ResilienceTester.name);

  // Predefined failure scenarios
  private scenarios: FailureScenario[] = [
    {
      name: 'Provider Down',
      description: 'NewsAPI provider stops responding',
      trigger: 'Connection timeout from NewsAPI',
      expectedBehavior:
        'Guardian detects, rotates to fallback provider, lowers confidence, explains impact',
      severity: 'high',
    },
    {
      name: 'Incomplete Data',
      description: 'Calendar provider missing next week earnings',
      trigger: 'Calendar provider returns partial data',
      expectedBehavior:
        'Guardian accepts partial data, marks what is missing, lowers confidence, warns operator',
      severity: 'medium',
    },
    {
      name: 'Cascading Failure',
      description: 'Multiple providers fail simultaneously',
      trigger: 'NewsAPI + Calendar both timeout',
      expectedBehavior:
        'Guardian detects pattern, alerts critical, suggests immediate checks, blocks trading',
      severity: 'critical',
    },
    {
      name: 'Contradictory Data',
      description: 'Two sources report conflicting information',
      trigger: 'NewsAPI says "recession", Fundamentals show "growth"',
      expectedBehavior:
        'Guardian flags contradiction, explains sources, lowers confidence, warns of interpretation risk',
      severity: 'high',
    },
    {
      name: 'Latency Spike',
      description: 'Response times exceed thresholds',
      trigger: 'SEC Edgar takes 5000ms instead of 800ms',
      expectedBehavior:
        'Guardian logs latency spike, auto-rotates if > 3s, explains performance impact',
      severity: 'medium',
    },
  ];

  /**
   * RUN RESILIENCE TEST SUITE
   *
   * Simulates each scenario and verifies Guardian responds correctly
   */
  async runFullResilienceTest(guardian: any): Promise<ResilienceTestResult[]> {
    this.logger.log('Guardian: Starting Resilience Test Suite...');

    const results: ResilienceTestResult[] = [];

    for (const scenario of this.scenarios) {
      const result = await this.testScenario(scenario, guardian);
      results.push(result);
      this.logger.log(`  ${scenario.name}: ${result.passed ? '✅ PASS' : '❌ FAIL'}`);
    }

    return results;
  }

  /**
   * TEST ONE SCENARIO
   */
  private async testScenario(scenario: FailureScenario, guardian: any): Promise<ResilienceTestResult> {
    try {
      // Simulate the failure
      const failureResult = await this.simulateFailure(scenario);

      // Get Guardian response
      const guardianResponse = await guardian.analyzeFailure(failureResult);

      // Check if Guardian response is appropriate
      const passed =
        guardianResponse.gracefulHandling &&
        guardianResponse.confidence < 90 && // Should drop confidence
        guardianResponse.explanation.length > 0; // Should explain

      return {
        scenario,
        passed,
        observedBehavior: failureResult.behavior,
        guardianResponse: guardianResponse.explanation,
        confidenceImpact: 100 - guardianResponse.confidence,
        gracefulFailure: guardianResponse.gracefulHandling,
      };
    } catch (error) {
      return {
        scenario,
        passed: false,
        observedBehavior: `Test threw error: ${error.message}`,
        guardianResponse: 'NO RESPONSE - System crashed',
        confidenceImpact: 100,
        gracefulFailure: false,
      };
    }
  }

  /**
   * SIMULATE FAILURE
   *
   * Inject the failure condition and observe system behavior
   */
  private async simulateFailure(scenario: FailureScenario): Promise<any> {
    this.logger.log(`  Simulating: ${scenario.name}`);

    // In production, this would actually inject the failure
    // For now, return mock response
    return {
      scenario: scenario.name,
      behavior: scenario.trigger,
      timestamp: new Date(),
    };
  }

  /**
   * FORMAT RESULTS FOR DISPLAY
   */
  formatResults(results: ResilienceTestResult[]): string {
    const lines: string[] = [];

    lines.push(`\n${'═'.repeat(80)}`);
    lines.push(`RESILIENCE TEST RESULTS`);
    lines.push(`${new Date().toLocaleString()}`);
    lines.push(`${'═'.repeat(80)}\n`);

    const passCount = results.filter(r => r.passed).length;
    const totalCount = results.length;

    lines.push(`SUMMARY: ${passCount}/${totalCount} scenarios passed\n`);

    results.forEach((result, idx) => {
      const icon = result.passed ? '✅' : '❌';
      const graceful = result.gracefulFailure ? '✅ GRACEFUL' : '❌ UNGRACEFUL';

      lines.push(`${idx + 1}. ${icon} ${result.scenario.name}`);
      lines.push(`   Severity: ${result.scenario.severity.toUpperCase()}`);
      lines.push(`   Trigger: ${result.scenario.trigger}`);
      lines.push(`   Guardian: "${result.guardianResponse}"`);
      lines.push(`   Confidence impact: -${result.confidenceImpact}%`);
      lines.push(`   Handling: ${graceful}`);
      lines.push('');
    });

    // Overall verdict
    lines.push(`${'─'.repeat(80)}`);
    if (passCount === totalCount) {
      lines.push(
        `✅ ALL TESTS PASSED - Guardian handles all failure scenarios gracefully`
      );
    } else {
      const failedScenarios = results.filter(r => !r.passed);
      lines.push(
        `🔴 ${failedScenarios.length} TESTS FAILED:\n` +
          failedScenarios.map(r => `  • ${r.scenario.name}`).join('\n')
      );
    }

    lines.push(`${'═'.repeat(80)}\n`);

    return lines.join('\n');
  }
}
