import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateDailySummaryTable1726358000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'daily_summaries',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'dateET',
            type: 'date',
            isNullable: false,
          },
          {
            name: 'generatedMode',
            type: 'varchar',
            length: '20',
            isNullable: false,
          },
          {
            name: 'isManualOverride',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'totalDecisions',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'decidedEnter',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'decidedWait',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'decidedSkip',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'decidedExit',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'decidedError',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'tradesExecuted',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'tradesClosed',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'outcomeProfitable',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'outcomeLoss',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'outcomeBreakeven',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'totalProfitLoss',
            type: 'numeric',
            precision: 20,
            scale: 8,
            isNullable: true,
          },
          {
            name: 'totalProfitLossPercent',
            type: 'numeric',
            precision: 10,
            scale: 4,
            isNullable: true,
          },
          {
            name: 'pnlCalculationStatus',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'operationsFailed',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'noOperations',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'noOpReasons',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'traceabilityAnomalies',
            type: 'integer',
            default: 0,
            isNullable: false,
          },
          {
            name: 'traceabilityTypes',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'hasClosed',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'hasFailed',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'hasTraceabilityLoss',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'hasNoOperations',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'integrityStatus',
            type: 'varchar',
            length: '50',
            default: "'PASS'",
            isNullable: false,
          },
          {
            name: 'integrityNotes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'evidenceLog',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'generationNotes',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'timestamp with time zone',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Índices
    await queryRunner.createIndex(
      'daily_summaries',
      new TableIndex({
        name: 'idx_daily_summaries_dateET',
        columnNames: ['dateET'],
      }),
    );

    await queryRunner.createIndex(
      'daily_summaries',
      new TableIndex({
        name: 'idx_daily_summaries_generatedMode',
        columnNames: ['generatedMode'],
      }),
    );

    await queryRunner.createIndex(
      'daily_summaries',
      new TableIndex({
        name: 'idx_daily_summaries_createdAt',
        columnNames: ['createdAt'],
      }),
    );

    // Constraint único en dateET (idempotencia)
    await queryRunner.query(`
      ALTER TABLE daily_summaries
      ADD CONSTRAINT uk_daily_summaries_dateET UNIQUE ("dateET");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('daily_summaries', true);
  }
}
