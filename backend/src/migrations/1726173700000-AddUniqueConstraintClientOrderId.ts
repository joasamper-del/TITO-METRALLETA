import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

/**
 * ETAPA 2: FASE 4 - FIX BLOQUEANTE
 *
 * Agrega constraint UNIQUE a client_order_id en trade_executions
 *
 * Rationale:
 * - Fase 4 requiere deduplicación garantizada de reintentos
 * - Reintentos deben reutilizar mismo clientOrderId (1 trade + attemptCount++)
 * - Sin constraint UNIQUE en BD, servicio no puede garantizar idempotencia
 *
 * Precondición: Migración 1726173600000-AddTradeExecutionTables debe estar ejecutada
 *
 * Seguridad:
 * - Verifica ANTES que NO haya duplicados existentes
 * - UNIQUE permite múltiples NULLs (es nullable)
 * - Rollback incluido
 */
export class AddUniqueConstraintClientOrderId1726173700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Verificar que no haya duplicados antes de crear constraint
    const duplicates = await queryRunner.query(
      `SELECT client_order_id, COUNT(*) as cnt
       FROM trade_executions
       WHERE client_order_id IS NOT NULL
       GROUP BY client_order_id
       HAVING COUNT(*) > 1`,
    );

    if (duplicates && duplicates.length > 0) {
      throw new Error(
        `Cannot add UNIQUE constraint: Found ${duplicates.length} duplicate client_order_id values. ` +
          'Duplicates: ' +
          duplicates.map((d) => `${d.client_order_id} (${d.cnt}x)`).join(', '),
      );
    }

    // 2. Crear índice UNIQUE
    await queryRunner.createIndex(
      'trade_executions',
      new TableIndex({
        name: 'IDX_UNIQUE_trade_executions_client_order_id',
        columnNames: ['client_order_id'],
        isUnique: true,
        where: 'client_order_id IS NOT NULL',
      }),
    );

    // 3. Log éxito
    console.log('✅ UNIQUE constraint creado en client_order_id');
    console.log('   - Nombre: IDX_UNIQUE_trade_executions_client_order_id');
    console.log('   - Columna: client_order_id');
    console.log('   - Condición: WHERE client_order_id IS NOT NULL (permite múltiples NULLs)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Obtener tabla y encontrar índice
    const tradeExecutionsTable = await queryRunner.getTable('trade_executions');

    if (!tradeExecutionsTable) {
      console.warn('⚠️  Table trade_executions no existe, rollback incompleto');
      return;
    }

    // 2. Buscar y eliminar índice UNIQUE
    const idx = tradeExecutionsTable.indices.find(
      (i) => i.name === 'IDX_UNIQUE_trade_executions_client_order_id',
    );

    if (idx) {
      await queryRunner.dropIndex('trade_executions', idx);
      console.log('✅ Índice UNIQUE eliminado');
    } else {
      console.warn('⚠️  Índice IDX_UNIQUE_trade_executions_client_order_id no encontrado');
    }
  }
}
