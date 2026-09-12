import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

/**
 * ETAPA 2: FASE 3 - MIGRACIONES
 *
 * Crea las tablas y relaciones para trazabilidad operativa:
 * - trade_executions: vincula DecisionAuditTrail con órdenes del broker
 * - execution_events: registro granular de eventos (fills, reintentos, etc.)
 * - Agrega FK a position_snapshots para vincular snapshots a trades
 *
 * Precondición: Etapa 1 (Foreign Keys en PositionSnapshot) ya aplicada
 */
export class AddTradeExecutionTables1726173600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear tabla trade_executions
    await queryRunner.createTable(
      new Table({
        name: 'trade_executions',
        columns: [
          // === Primary Key ===
          new TableColumn({
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          }),

          // === Vínculos ===
          new TableColumn({
            name: 'decision_audit_trail_id',
            type: 'uuid',
            isNullable: false,
            comment: 'FK a DecisionAuditTrail (NOT NULL, RESTRICT)',
          }),

          new TableColumn({
            name: 'trade_id',
            type: 'varchar',
            length: '50',
            isNullable: false,
            comment: 'Identificador lógico único del trade (e.g., trd_ETHUSD_20260912_001)',
          }),

          // === Broker Metadata ===
          new TableColumn({
            name: 'broker_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: 'Nombre del broker (alpaca, schwab, etc.)',
          }),

          new TableColumn({
            name: 'side',
            type: 'varchar',
            length: '20',
            isNullable: false,
            comment: 'BUY | SELL',
          }),

          new TableColumn({
            name: 'symbol',
            type: 'varchar',
            length: '10',
            isNullable: false,
            comment: 'Ticker (e.g., ETHUSD, SPY)',
          }),

          new TableColumn({
            name: 'quantity',
            type: 'numeric',
            precision: 20,
            scale: 8,
            isNullable: false,
            comment: 'Cantidad (puede ser fraccional para crypto)',
          }),

          new TableColumn({
            name: 'order_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
            comment: 'market | limit | stop',
          }),

          new TableColumn({
            name: 'client_order_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: 'Nuestro ID para deduplicación de reintentos',
          }),

          new TableColumn({
            name: 'broker_order_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: 'ID que devolvió el broker (puede ser nulo si order pending)',
          }),

          // === Ejecución ===
          new TableColumn({
            name: 'status',
            type: 'varchar',
            length: '30',
            isNullable: false,
            comment: 'PENDING | PARTIAL | FILLED | CANCELLED | FAILED | EXPIRED',
          }),

          new TableColumn({
            name: 'execution_mode',
            type: 'varchar',
            length: '20',
            isNullable: false,
            comment: 'PAPER | LIVE | SIMULATOR (NOT NULL, set at creation)',
          }),

          new TableColumn({
            name: 'filled_qty',
            type: 'numeric',
            precision: 20,
            scale: 8,
            isNullable: true,
            comment: 'Cantidad ejecutada',
          }),

          new TableColumn({
            name: 'filled_price',
            type: 'numeric',
            precision: 20,
            scale: 8,
            isNullable: true,
            comment: 'Precio de ejecución (VWAP de fills)',
          }),

          new TableColumn({
            name: 'avg_fill_price',
            type: 'numeric',
            precision: 20,
            scale: 8,
            isNullable: true,
            comment: 'Precio promedio si múltiples fills',
          }),

          new TableColumn({
            name: 'filled_at',
            type: 'timestamp with time zone',
            isNullable: true,
            comment: 'Cuándo se completó el fill',
          }),

          // === Reintentos ===
          new TableColumn({
            name: 'attempt_count',
            type: 'integer',
            isNullable: false,
            default: 0,
            comment: 'Número de reintentos (deduplicación)',
          }),

          new TableColumn({
            name: 'last_attempt_at',
            type: 'timestamp with time zone',
            isNullable: true,
            comment: 'Cuándo fue el último intento',
          }),

          new TableColumn({
            name: 'last_error',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: 'Mensaje de error del último intento fallido',
          }),

          // === Stops & Targets ===
          new TableColumn({
            name: 'stop_loss',
            type: 'numeric',
            precision: 20,
            scale: 8,
            isNullable: true,
            comment: 'Precio de stop loss',
          }),

          new TableColumn({
            name: 'take_profit',
            type: 'numeric',
            precision: 20,
            scale: 8,
            isNullable: true,
            comment: 'Precio de take profit',
          }),

          new TableColumn({
            name: 'tp_order_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: 'ID de la orden TP si está activa en broker',
          }),

          new TableColumn({
            name: 'sl_order_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: 'ID de la orden SL si está activa en broker',
          }),

          // === Cierre ===
          new TableColumn({
            name: 'close_status',
            type: 'varchar',
            length: '30',
            isNullable: true,
            comment: 'HOW_CLOSED: TP_HIT | SL_HIT | MANUAL | EXPIRED | PARTIAL',
          }),

          new TableColumn({
            name: 'exit_price',
            type: 'numeric',
            precision: 20,
            scale: 8,
            isNullable: true,
            comment: 'Precio de salida',
          }),

          new TableColumn({
            name: 'closed_at',
            type: 'timestamp with time zone',
            isNullable: true,
            comment: 'Cuándo se cerró el trade',
          }),

          // === P&L ===
          new TableColumn({
            name: 'profit_loss',
            type: 'numeric',
            precision: 20,
            scale: 8,
            isNullable: true,
            comment: '(exitPrice - entryPrice) * qty - commissions',
          }),

          new TableColumn({
            name: 'profit_loss_percent',
            type: 'numeric',
            precision: 10,
            scale: 4,
            isNullable: true,
            comment: 'P&L como porcentaje',
          }),

          new TableColumn({
            name: 'outcome',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: 'PROFITABLE | LOSS | BREAKEVEN | PARTIAL | CANCELLED',
          }),

          // === Evidencia & Auditoría ===
          new TableColumn({
            name: 'broker_response',
            type: 'jsonb',
            isNullable: true,
            comment: 'JSON original del broker (verbatim, immutable)',
          }),

          new TableColumn({
            name: 'notes',
            type: 'text',
            isNullable: true,
            comment: 'Notas internas',
          }),

          new TableColumn({
            name: 'broker_timestamp',
            type: 'timestamp with time zone',
            isNullable: true,
            comment: 'Timestamp del broker para este evento',
          }),

          // === Auditoría ===
          new TableColumn({
            name: 'created_at',
            type: 'timestamp with time zone',
            isNullable: false,
            default: 'now()',
          }),

          new TableColumn({
            name: 'updated_at',
            type: 'timestamp with time zone',
            isNullable: false,
            default: 'now()',
          }),
        ],
      }),
      true,
    );

    // 2. Crear índices en trade_executions
    await queryRunner.createIndex(
      'trade_executions',
      new TableIndex({
        name: 'IDX_trade_executions_trade_id',
        columnNames: ['trade_id'],
      }),
    );

    await queryRunner.createIndex(
      'trade_executions',
      new TableIndex({
        name: 'IDX_trade_executions_decision_audit_trail_id',
        columnNames: ['decision_audit_trail_id'],
      }),
    );

    await queryRunner.createIndex(
      'trade_executions',
      new TableIndex({
        name: 'IDX_trade_executions_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'trade_executions',
      new TableIndex({
        name: 'IDX_trade_executions_created_at',
        columnNames: ['created_at'],
      }),
    );

    // 3. Agregar FK a decision_audit_trail (RESTRICT - no permitir borrar decisiones con trades)
    await queryRunner.createForeignKey(
      'trade_executions',
      new TableForeignKey({
        name: 'FK_trade_executions_decision_audit_trail_id',
        columnNames: ['decision_audit_trail_id'],
        referencedTableName: 'decision_audit_trail',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    // 4. Crear tabla execution_events
    await queryRunner.createTable(
      new Table({
        name: 'execution_events',
        columns: [
          // === Primary Key ===
          new TableColumn({
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          }),

          // === FK a TradeExecution ===
          new TableColumn({
            name: 'trade_execution_id',
            type: 'uuid',
            isNullable: false,
            comment: 'FK a TradeExecution (CASCADE on delete)',
          }),

          // === Evento ===
          new TableColumn({
            name: 'event_type',
            type: 'varchar',
            length: '30',
            isNullable: false,
            comment: 'ORDER_PLACED | PARTIAL_FILL | FILL | RETRY | FAILED | CANCELLED | CLOSED | TP_HIT | SL_HIT',
          }),

          new TableColumn({
            name: 'broker_order_id',
            type: 'varchar',
            length: '100',
            isNullable: true,
            comment: 'En caso de cambio de ID entre reintentos',
          }),

          new TableColumn({
            name: 'filled_qty',
            type: 'numeric',
            precision: 20,
            scale: 8,
            isNullable: true,
            comment: 'Cantidad en este evento',
          }),

          new TableColumn({
            name: 'filled_price',
            type: 'numeric',
            precision: 20,
            scale: 8,
            isNullable: true,
            comment: 'Precio en este evento',
          }),

          new TableColumn({
            name: 'message',
            type: 'varchar',
            length: '500',
            isNullable: true,
            comment: 'Descripción legible (e.g., "Filled 10 shares at 150.25")',
          }),

          new TableColumn({
            name: 'broker_data',
            type: 'jsonb',
            isNullable: true,
            comment: 'Payload del broker para este evento (verbatim)',
          }),

          new TableColumn({
            name: 'broker_timestamp',
            type: 'timestamp with time zone',
            isNullable: true,
            comment: 'Cuándo pasó en el broker',
          }),

          // === Auditoría ===
          new TableColumn({
            name: 'recorded_at',
            type: 'timestamp with time zone',
            isNullable: false,
            default: 'now()',
            comment: 'Cuándo lo registramos nosotros',
          }),
        ],
      }),
      true,
    );

    // 5. Crear índices en execution_events
    await queryRunner.createIndex(
      'execution_events',
      new TableIndex({
        name: 'IDX_execution_events_trade_execution_id',
        columnNames: ['trade_execution_id'],
      }),
    );

    await queryRunner.createIndex(
      'execution_events',
      new TableIndex({
        name: 'IDX_execution_events_event_type',
        columnNames: ['event_type'],
      }),
    );

    await queryRunner.createIndex(
      'execution_events',
      new TableIndex({
        name: 'IDX_execution_events_recorded_at',
        columnNames: ['recorded_at'],
      }),
    );

    // 6. Agregar FK a trade_executions (CASCADE - borrar events si se borra trade)
    await queryRunner.createForeignKey(
      'execution_events',
      new TableForeignKey({
        name: 'FK_execution_events_trade_execution_id',
        columnNames: ['trade_execution_id'],
        referencedTableName: 'trade_executions',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // 7. Agregar columna trade_execution_id a position_snapshots
    await queryRunner.addColumn(
      'position_snapshots',
      new TableColumn({
        name: 'trade_execution_id',
        type: 'uuid',
        isNullable: true,
        comment: 'FK a TradeExecution (SET NULL)',
      }),
    );

    // 8. Agregar índice a trade_execution_id en position_snapshots
    await queryRunner.createIndex(
      'position_snapshots',
      new TableIndex({
        name: 'IDX_position_snapshots_trade_execution_id',
        columnNames: ['trade_execution_id'],
      }),
    );

    // 9. Agregar FK a trade_executions en position_snapshots (SET NULL)
    await queryRunner.createForeignKey(
      'position_snapshots',
      new TableForeignKey({
        name: 'FK_position_snapshots_trade_execution_id',
        columnNames: ['trade_execution_id'],
        referencedTableName: 'trade_executions',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Eliminar FK en position_snapshots (si existe)
    const positionSnapshotsTable = await queryRunner.getTable('position_snapshots');
    if (positionSnapshotsTable) {
      const fk = positionSnapshotsTable.foreignKeys.find(
        (fk) => fk.name === 'FK_position_snapshots_trade_execution_id',
      );
      if (fk) {
        await queryRunner.dropForeignKey('position_snapshots', fk);
      }
    }

    // 2. Eliminar índice en position_snapshots
    const positionSnapshotsTableAfterFk = await queryRunner.getTable('position_snapshots');
    if (positionSnapshotsTableAfterFk) {
      const idx = positionSnapshotsTableAfterFk.indices.find(
        (idx) => idx.name === 'IDX_position_snapshots_trade_execution_id',
      );
      if (idx) {
        await queryRunner.dropIndex('position_snapshots', idx);
      }
    }

    // 3. Eliminar columna trade_execution_id de position_snapshots
    const positionSnapshotsTableBeforeColumn = await queryRunner.getTable('position_snapshots');
    if (positionSnapshotsTableBeforeColumn) {
      const column = positionSnapshotsTableBeforeColumn.columns.find(
        (col) => col.name === 'trade_execution_id',
      );
      if (column) {
        await queryRunner.dropColumn('position_snapshots', column);
      }
    }

    // 4. Eliminar FKs en execution_events
    const executionEventsTable = await queryRunner.getTable('execution_events');
    if (executionEventsTable) {
      const fk = executionEventsTable.foreignKeys.find(
        (fk) => fk.name === 'FK_execution_events_trade_execution_id',
      );
      if (fk) {
        await queryRunner.dropForeignKey('execution_events', fk);
      }
    }

    // 5. Eliminar tabla execution_events
    await queryRunner.dropTable('execution_events', true);

    // 6. Eliminar FKs en trade_executions
    const tradeExecutionsTable = await queryRunner.getTable('trade_executions');
    if (tradeExecutionsTable) {
      const fk = tradeExecutionsTable.foreignKeys.find(
        (fk) => fk.name === 'FK_trade_executions_decision_audit_trail_id',
      );
      if (fk) {
        await queryRunner.dropForeignKey('trade_executions', fk);
      }
    }

    // 7. Eliminar tabla trade_executions
    await queryRunner.dropTable('trade_executions', true);
  }
}
