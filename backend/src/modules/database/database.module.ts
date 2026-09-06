import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Opportunity, TradeResult, DecisionAuditTrail } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([Opportunity, TradeResult, DecisionAuditTrail])],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
