/**
 * Audit Trail Controller (S58)
 * REST endpoints for READ-ONLY decision history
 */

import { Controller, Get, Query, BadRequestException, HttpCode } from '@nestjs/common';
import { AuditTrailService, AuditTrailQuery } from './audit-trail.service';

@Controller('api/audit-trail')
export class AuditTrailController {
  constructor(private readonly auditTrailService: AuditTrailService) {}

  /**
   * GET /api/audit-trail/decisions
   * Query decisions with filters
   *
   * Query params:
   * - startDate: ISO date (required)
   * - endDate: ISO date (required)
   * - ticker: string[] (optional, multi-value)
   * - type: string[] (optional, multi-value)
   *
   * Response:
   * {
   *   decisions: DecisionRecord[],
   *   summary: Record<string, DecisionSummary>,
   *   meta: { count, queryTime }
   * }
   */
  @Get('decisions')
  @HttpCode(200)
  async getDecisions(
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
    @Query('ticker') tickersParam?: string | string[],
    @Query('type') typesParam?: string | string[],
  ) {
    // Parse dates
    if (!startDateStr || !endDateStr) {
      throw new BadRequestException(
        'startDate and endDate are required (ISO format)',
      );
    }

    let startDate: Date;
    let endDate: Date;

    try {
      startDate = new Date(startDateStr);
      endDate = new Date(endDateStr);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (error) {
      throw new BadRequestException(
        'Invalid date format. Use ISO format (YYYY-MM-DD)',
      );
    }

    // Parse multi-value query params
    const tickers = Array.isArray(tickersParam)
      ? tickersParam
      : tickersParam
        ? [tickersParam]
        : undefined;

    const types = Array.isArray(typesParam)
      ? typesParam
      : typesParam
        ? [typesParam]
        : undefined;

    // Build query
    const query: AuditTrailQuery = {
      startDate,
      endDate,
      tickers,
      types,
    };

    // Validate
    const validation = this.auditTrailService.validateQuery(query);
    if (!validation.valid) {
      throw new BadRequestException(validation.errors?.join('; '));
    }

    // Execute
    const startTime = Date.now();
    const decisions = await this.auditTrailService.getDecisions(query);
    const summary = await this.auditTrailService.getSummary(query);
    const queryTime = Date.now() - startTime;

    // Response
    return {
      decisions,
      summary,
      meta: {
        count: decisions.length,
        queryTime: `${queryTime}ms`,
        filters: {
          dateRange: `${startDateStr} to ${endDateStr}`,
          tickers: tickers || 'all',
          types: types || 'all',
        },
      },
    };
  }

  /**
   * GET /api/audit-trail/summary
   * Get summary only (faster, no detailed decisions)
   */
  @Get('summary')
  @HttpCode(200)
  async getSummary(
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ) {
    if (!startDateStr || !endDateStr) {
      throw new BadRequestException(
        'startDate and endDate are required (ISO format)',
      );
    }

    let startDate: Date;
    let endDate: Date;

    try {
      startDate = new Date(startDateStr);
      endDate = new Date(endDateStr);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new Error('Invalid date format');
      }
    } catch (error) {
      throw new BadRequestException(
        'Invalid date format. Use ISO format (YYYY-MM-DD)',
      );
    }

    const query: AuditTrailQuery = { startDate, endDate };

    // Validate
    const validation = this.auditTrailService.validateQuery(query);
    if (!validation.valid) {
      throw new BadRequestException(validation.errors?.join('; '));
    }

    // Execute
    const summary = await this.auditTrailService.getSummary(query);

    return {
      summary,
      meta: {
        dateRange: `${startDateStr} to ${endDateStr}`,
      },
    };
  }

  /**
   * GET /api/audit-trail/health
   * Verify service is READ-ONLY (no write endpoints)
   */
  @Get('health')
  @HttpCode(200)
  getHealth() {
    return {
      status: 'OK',
      service: 'AuditTrail',
      mode: 'READ-ONLY',
      endpoints: {
        'GET /api/audit-trail/decisions': 'Query decisions with filters',
        'GET /api/audit-trail/summary': 'Get summary only',
        'GET /api/audit-trail/health': 'Health check',
      },
      writeEndpoints: [],
      note: 'No write/delete/update endpoints. This is intentional for audit safety.',
    };
  }
}
