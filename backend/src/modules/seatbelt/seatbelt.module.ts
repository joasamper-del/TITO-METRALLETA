import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gate1MarketHealthService } from './services/gate1-market-health.service';
import { Gate2RiskBoundaryService } from './services/gate2-risk-boundary.service';
import { Gate3DecisionAuditService } from './services/gate3-decision-audit.service';
import { SeatbeltService } from './services/seatbelt.service';
import { DecisionAuditTrail } from '../database/entities/decision-audit-trail.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DecisionAuditTrail])],
  providers: [
    Gate1MarketHealthService,
    Gate2RiskBoundaryService,
    Gate3DecisionAuditService,
    SeatbeltService,
  ],
  exports: [SeatbeltService],
})
export class SeatbeltModule {}
