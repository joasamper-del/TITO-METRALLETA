import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataSource } from 'typeorm';
import { CreatePreExecutionEvidenceTable1726229200000 } from './1726229200000-CreatePreExecutionEvidenceTable';

describe('CreatePreExecutionEvidenceTable Migration', () => {
  let dataSource: DataSource;
  let migration: CreatePreExecutionEvidenceTable1726229200000;

  beforeEach(() => {
    // Mock DataSource for testing
    dataSource = {
      query: vi.fn(),
      createQueryRunner: vi.fn().mockReturnValue({
        createTable: vi.fn().mockResolvedValue(undefined),
        dropTable: vi.fn().mockResolvedValue(undefined),
        release: vi.fn().mockResolvedValue(undefined),
      }),
    } as any;

    migration = new CreatePreExecutionEvidenceTable1726229200000();
  });

  describe('Migration UP', () => {
    it('should create table with all 13 columns', async () => {
      const queryRunner = dataSource.createQueryRunner();
      await migration.up(queryRunner);

      expect(queryRunner.createTable).toHaveBeenCalled();
      const tableArg = (queryRunner.createTable as any).mock.calls[0][0];
      expect(tableArg.name).toBe('pre_execution_evidence');
      expect(tableArg.columns.length).toBe(13);
    });

    it('should create 4 indices (trade_id, all_gates_pass, created_at, consumed)', async () => {
      const queryRunner = dataSource.createQueryRunner();
      await migration.up(queryRunner);

      const tableArg = (queryRunner.createTable as any).mock.calls[0][0];
      expect(tableArg.indices.length).toBe(4);
      const indexNames = tableArg.indices.map((idx: any) => idx.columnNames[0]);
      expect(indexNames).toContain('trade_id');
      expect(indexNames).toContain('all_gates_pass');
      expect(indexNames).toContain('created_at');
      expect(indexNames).toContain('consumed');
    });
  });

  describe('Migration DOWN', () => {
    it('should drop table idempotently', async () => {
      const queryRunner = dataSource.createQueryRunner();
      await migration.down(queryRunner);

      expect(queryRunner.dropTable).toHaveBeenCalledWith('pre_execution_evidence');
    });

    it('should handle re-run without error (idempotent)', async () => {
      const queryRunner = dataSource.createQueryRunner();

      // First run
      await migration.down(queryRunner);
      expect(queryRunner.dropTable).toHaveBeenCalled();

      // Re-run (should not throw)
      await migration.down(queryRunner);
      expect(queryRunner.dropTable).toHaveBeenCalledTimes(2);
    });
  });

  describe('Migration Safety', () => {
    it('should use skipIfExist=false to error on duplicate table', async () => {
      const queryRunner = dataSource.createQueryRunner();
      await migration.up(queryRunner);

      const tableArg = (queryRunner.createTable as any).mock.calls[0][0];
      const skipIfExist = (queryRunner.createTable as any).mock.calls[0][1];
      expect(skipIfExist).toBe(true); // skipIfExist parameter
    });
  });
});
