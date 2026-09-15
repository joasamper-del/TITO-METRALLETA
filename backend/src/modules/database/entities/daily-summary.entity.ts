import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * DAILY SUMMARY
 * Auto-generated consolidación diaria de Caja Negra V1
 *
 * Fuentes de datos (ÚNICAMENTE reales, sin fabricación):
 * - DecisionAuditTrail: decisiones del día
 * - TradeExecution (status=CLOSED): trades ejecutados y cerrados
 * - ExecutionReport (outcome=PROFITABLE|LOSS): resultados reales
 * - ExecutionEvent: eventos de cierre/fallo
 * - NoOpExplanation: razones de no-operación
 * - TraceabilityAnomaly: anomalías de trazabilidad
 *
 * Garantías:
 * - Cero fabricación: solo datos reales capturados
 * - Campos faltantes marcados explícitamente (null con notas)
 * - Integridad comprometida → FAIL/HOLD
 * - Idempotencia: mismo período → misma entrada (actualiza, no duplica)
 * - Manual trigger: permite generar para testing/recovery (marca "manual")
 */
@Entity('daily_summaries')
@Index(['dateET'])
@Index(['generatedMode'])
@Index(['createdAt'])
@Unique(['dateET'])
export class DailySummary {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // === FECHA Y GENERACIÓN ===
  @Column('date')
  dateET!: Date; // Fecha ET (Eastern Time) del período resumido

  @Column('varchar', { length: 20 })
  generatedMode!: string; // AUTOMATIC | MANUAL

  @Column('boolean', { default: false })
  isManualOverride!: boolean; // true si fue disparado manualmente (testing/recovery)

  // === CONTEOS REALES (SIN FABRICACIÓN) ===
  @Column('integer', { default: 0 })
  totalDecisions!: number; // Número de DecisionAuditTrail del día

  @Column('integer', { default: 0 })
  decidedEnter!: number; // ENTRAR

  @Column('integer', { default: 0 })
  decidedWait!: number; // ESPERAR

  @Column('integer', { default: 0 })
  decidedSkip!: number; // NO_ENTRAR

  @Column('integer', { default: 0 })
  decidedExit!: number; // SALIR

  @Column('integer', { default: 0 })
  decidedError!: number; // ERROR

  // === TRADES EJECUTADOS (CLOSED) ===
  @Column('integer', { default: 0 })
  tradesExecuted!: number; // Número de TradeExecution con status=CLOSED

  @Column('integer', { default: 0 })
  tradesClosed!: number; // Alias de tradesExecuted (claridad)

  // === RESULTADOS REALES DE TRADES CERRADOS ===
  @Column('integer', { default: 0 })
  outcomeProfitable!: number; // outcome=PROFITABLE

  @Column('integer', { default: 0 })
  outcomeLoss!: number; // outcome=LOSS

  @Column('integer', { default: 0 })
  outcomeBreakeven!: number; // outcome=BREAKEVEN

  // === P&L CONSOLIDADO (SOLO SI EXISTE EVIDENCIA REAL) ===
  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  totalProfitLoss?: number; // Sumatoria de profitLoss de trades cerrados

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  totalProfitLossPercent?: number; // Promedio de profitLossPercent

  @Column('integer', { nullable: true })
  pnlCalculationStatus?: number; // 1=calculado, 0=parcial, null=faltante

  // === OPERACIONES FALLIDAS (FAILED) ===
  @Column('integer', { default: 0 })
  operationsFailed!: number; // TradeExecution con status=FAILED

  // === NO-OPERACIONES (BLOQUEADAS) ===
  @Column('integer', { default: 0 })
  noOperations!: number; // NoOpExplanation count

  @Column('jsonb', { nullable: true })
  noOpReasons?: Record<string, number>; // Conteo por blockageReason (SEATBELT_GATE, MARKET_CLOSED, etc.)

  // === ANOMALÍAS DE TRAZABILIDAD ===
  @Column('integer', { default: 0 })
  traceabilityAnomalies!: number; // TraceabilityAnomaly count

  @Column('jsonb', { nullable: true })
  traceabilityTypes?: Record<string, number>; // Conteo por anomalyType (MISSING_TRADE_ID, ORPHAN_EVENT, etc.)

  // === EVENTOS EJECUTIVOS AUTOMÁTICOS (CHECKLIST FINAL) ===
  @Column('boolean')
  hasClosed!: boolean; // true si hubo operaciones CLOSED

  @Column('boolean')
  hasFailed!: boolean; // true si hubo operaciones FAILED

  @Column('boolean')
  hasTraceabilityLoss!: boolean; // true si hubo anomalías de trazabilidad

  @Column('boolean')
  hasNoOperations!: boolean; // true si hubo no-operaciones

  // === INTEGRIDAD Y CALIDAD ===
  @Column('varchar', { length: 50 })
  integrityStatus!: string; // PASS | FAIL | HOLD

  @Column('text', { nullable: true })
  integrityNotes?: string; // Detalles si FAIL/HOLD (datos faltantes, inconsistencias, etc.)

  // === EVIDENCIA DISPONIBLE (REGISTRO DE FUENTES CONSULTADAS) ===
  @Column('jsonb', { nullable: true })
  evidenceLog?: Record<string, any>; // Qué fuentes se consultaron y qué se encontró

  // === AUDITORÍA ===
  @Column('text', { nullable: true })
  generationNotes?: string; // Notas sobre la generación (errores encontrados, decisiones, etc.)

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
