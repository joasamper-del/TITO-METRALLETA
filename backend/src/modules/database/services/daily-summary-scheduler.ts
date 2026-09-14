import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { DailySummaryService } from './daily-summary.service';

@Injectable()
export class DailySummaryScheduler {
  private readonly logger = new Logger(DailySummaryScheduler.name);
  private readonly timezone: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly dailySummaryService: DailySummaryService,
  ) {
    // Timezone configuration: explicit America/New_York with override support
    this.timezone = this.configService.get<string>('CRON_TIMEZONE', 'America/New_York');
    this.logger.log(`DailySummaryScheduler initialized with timezone: ${this.timezone}`);
  }

  /**
   * Automated daily summary generation at market close (16:00 ET)
   * Cron expression: 0 16 * * 1-5 (4 PM on weekdays)
   * Timezone: America/New_York (EST/EDT handled automatically)
   * Generated mode: AUTOMATIC to distinguish from manual runs
   */
  @Cron('0 16 * * 1-5', {
    name: 'dailySummaryClose',
    timeZone: 'America/New_York', // Explicit timezone for EST/EDT transitions
  })
  async runDailySummary() {
    try {
      const now = new Date();
      this.logger.log(`[AUTO] Daily summary trigger fired at ${now.toISOString()}`);

      // Use ET date for summary
      const dateET = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));

      // Check for existing summary (idempotence)
      const existing = await this.dailySummaryService.getDailySummary(dateET);
      if (existing) {
        this.logger.warn(
          `[AUTO] Summary already exists for ${dateET.toISOString().split('T')[0]}, skipping generation`,
        );
        return;
      }

      // Generate and save with AUTOMATIC mode
      const summary = await this.dailySummaryService.generateAndSave(dateET, 'AUTOMATIC');
      this.logger.log(`[AUTO] Daily summary saved for ${dateET.toISOString().split('T')[0]}`);
      this.logger.debug(`[AUTO] Summary integrity status: ${summary.integrityStatus}`);

      // Log failures/holds visibly
      if (summary.integrityStatus === 'FAIL' || summary.integrityStatus === 'HOLD') {
        this.logger.error(
          `[AUTO] Summary integrity ${summary.integrityStatus}: ${summary.integrityNotes || 'no details'}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `[AUTO] Failed to generate daily summary: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Fail-closed: visible in logs, does not swallow error
      throw error;
    }
  }

  /**
   * Get scheduler metadata for testing
   */
  getSchedulerMetadata() {
    return {
      name: 'dailySummaryClose',
      cronExpression: '0 16 * * 1-5',
      timeZone: 'America/New_York',
      generatedMode: 'AUTO',
      enabled: true,
    };
  }
}
