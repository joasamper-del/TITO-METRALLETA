import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { DecisionAuditService, DecisionAuditInput, DecisionAuditUpdate } from '../services/decision-audit.service';

@Controller('api/audit')
export class DecisionAuditController {
  constructor(private auditService: DecisionAuditService) {}

  @Post('record')
  async recordDecision(@Body() input: DecisionAuditInput) {
    return this.auditService.recordDecision(input);
  }

  @Post('update/:id')
  async updateDecision(
    @Param('id') id: string,
    @Body() update: DecisionAuditUpdate,
  ) {
    return this.auditService.updateDecisionOutcome(id, update);
  }

  @Get('range')
  async getDecisionsByRange(
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return this.auditService.getDecisionsByDateRange(startDate, endDate);
  }

  @Get('symbol/:symbol')
  async getDecisionsBySymbol(
    @Param('symbol') symbol: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const startDate = start ? new Date(start) : undefined;
    const endDate = end ? new Date(end) : undefined;
    return this.auditService.getDecisionsBySymbol(symbol, startDate, endDate);
  }

  @Get('stats')
  async getDecisionStats(
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return this.auditService.getDecisionStats(startDate, endDate);
  }

  @Get('mli-accuracy')
  async getMliAccuracy(
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const accuracy = await this.auditService.getMliAccuracy(startDate, endDate);
    return { mliAccuracy: accuracy };
  }
}
