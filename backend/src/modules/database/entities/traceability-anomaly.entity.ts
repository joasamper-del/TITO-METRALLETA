import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * TRACEABILITY ANOMALY
 * Registra cuando la cadena decision → execution → event → report
 * tiene ruptura de identificadores o falta de relaciones obligatorias
 *
 * Nunca se fabrican IDs, timestamps o razones — se persiste
 * exactamente lo que se pudo determinar del estado anómalo.
 */
@Entity('traceability_anomalies')
@Index(['anomalyType'])
@Index(['createdAt'])
export class TraceabilityAnomaly {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // === Tipo de anomalía ===
  @Column('varchar', { length: 50 })
  anomalyType!: string; // MISSING_TRADE_ID, MISSING_EXECUTION, ORPHAN_EVENT, ORPHAN_REPORT, PERSISTENCE_FAILURE

  // === IDs disponibles (los que SÍ existen) ===
  @Column('varchar', { length: 50, nullable: true })
  tradeId?: string;

  @Column('varchar', { length: 36, nullable: true })
  decisionId?: string;

  @Column('varchar', { length: 36, nullable: true })
  executionId?: string;

  @Column('varchar', { length: 36, nullable: true })
  eventId?: string;

  @Column('varchar', { length: 36, nullable: true })
  reportId?: string;

  // === Descripción exacta de qué enlace falta o es inconsistente ===
  @Column('varchar', { length: 500 })
  anomalyDescription!: string; // Exactamente qué relación es inconsistente

  // === Contexto: qué se intentaba hacer cuando pasó ===
  @Column('varchar', { length: 100, nullable: true })
  operationContext?: string; // close, recordOrderFailure, etc.

  // === Datos que sí se pudieron capturar del estado anómalo ===
  @Column('jsonb', { nullable: true })
  availableData?: Record<string, any>; // Información real que existe, sin fabricación

  @CreateDateColumn()
  createdAt!: Date;
}
