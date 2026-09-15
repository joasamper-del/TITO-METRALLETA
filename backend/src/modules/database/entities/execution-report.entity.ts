import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { TradeExecution } from './trade-execution.entity';

/**
 * EXECUTION REPORT
 * Auto-generated cuando un trade se cierra (CLOSED) o falla (FAILED)
 * Cierre exitoso: contiene resultado final, P&L, duración
 * Fallo: contiene motivo del rechazo, intentos de reintento
 */
@Entity('execution_reports')
@Index(['tradeId'])
@Index(['symbol'])
@Index(['outcome'])
@Index(['createdAt'])
export class ExecutionReport {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // === Vínculo a Ejecución ===
  @ManyToOne(() => TradeExecution, { eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'trade_execution_id' })
  tradeExecution!: TradeExecution;

  @Column('varchar', { length: 50 })
  tradeId!: string;

  // === Metadata Identidad ===
  @Column('varchar', { length: 10 })
  symbol!: string;

  @Column('varchar', { length: 20 })
  side!: string;

  @Column('varchar', { length: 30 })
  orderType!: string;

  // === Entrada ===
  @Column('decimal', { precision: 20, scale: 8 })
  entryQty!: number;

  @Column('decimal', { precision: 20, scale: 8 })
  entryPrice!: number;

  @Column('timestamp with time zone')
  entryAt!: Date;

  // === Salida (nullable para fallos) ===
  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  exitQty?: number;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  exitPrice?: number;

  @Column('timestamp with time zone', { nullable: true })
  exitAt?: Date;

  // === P&L (nullable para fallos) ===
  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  profitLoss?: number;

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  profitLossPercent?: number;

  // === Resultado: PROFITABLE | LOSS | BREAKEVEN | FAILED ===
  @Column('varchar', { length: 20 })
  outcome!: string;

  // === Duración ===
  @Column('integer', { nullable: true })
  durationSeconds?: number;

  // === FAILED-only: Motivo del rechazo ===
  @Column('varchar', { length: 500, nullable: true })
  failureReason?: string; // Real reason from broker/system

  @Column('integer', { nullable: true })
  retryAttempts?: number; // Cuántos reintentos se hicieron

  // === Contexto ===
  @Column('varchar', { length: 500, nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt!: Date;
}
