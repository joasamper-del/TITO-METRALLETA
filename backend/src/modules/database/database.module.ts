import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Opportunity, TradeResult } from './entities';

@Module({
  imports: [TypeOrmModule.forFeature([Opportunity, TradeResult])],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
