import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

/**
 * Warren Buffett Jr. Module
 * Independent value investing system, separate from Tito Metralleta
 *
 * ARCHITECTURE:
 * - Shares: PostgreSQL database (separate schema), data fetchers (read-only)
 * - Isolated: Rules engine, strategy execution, decision logic
 * - Independent: No cross-contamination with Tito Metralleta
 */
@Module({
  imports: [
    // TypeORM entities (Warren schema)
    // TypeOrmModule.forFeature([...WarrenEntities]),
  ],
  providers: [],
  controllers: [],
  exports: [],
})
export class WarrenModule {}
