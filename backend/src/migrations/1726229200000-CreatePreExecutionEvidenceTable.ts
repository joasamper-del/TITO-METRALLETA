import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePreExecutionEvidenceTable1726229200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'pre_execution_evidence',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'trade_id',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'order_intent_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'gate1_result',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'gate2_result',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'gate3_result',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'gate4_result',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'gate5_result',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'all_gates_pass',
            type: 'boolean',
            isNullable: false,
          },
          {
            name: 'valid_until',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'consumed',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
        indices: [
          new TableIndex({ columnNames: ['trade_id'] }),
          new TableIndex({ columnNames: ['all_gates_pass'] }),
          new TableIndex({ columnNames: ['created_at'] }),
          new TableIndex({ columnNames: ['consumed'] }),
        ],
      }),
      true, // skipIfExist = false, error si ya existe
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('pre_execution_evidence');
  }
}
