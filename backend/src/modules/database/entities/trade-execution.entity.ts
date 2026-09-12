import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { DecisionAuditTrail } from './decision-audit-trail.entity';

@Entity('trade_executions')
@Index(['tradeId'])
@Index(['decisionAuditTrailId'])
@Index(['status'])
@Index(['createdAt'])
export class TradeExecution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // === Vínculos ===
  @ManyToOne(() => DecisionAuditTrail, { eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'decision_audit_trail_id' })
  decisionAuditTrail!: DecisionAuditTrail;

  @Column('varchar', { length: 50 })
  tradeId!: string;

  // === Broker Metadata ===
  @Column('varchar', { length: 100, nullable: true })
  brokerId?: string;

  @Column('varchar', { length: 20 })
  side!: string;

  @Column('varchar', { length: 10 })
  symbol!: string;

  @Column('decimal', { precision: 20, scale: 8 })
  quantity!: number;

  @Column('varchar', { length: 50 })
  orderType!: string;

  @Column('varchar', { length: 100, nullable: true })
  clientOrderId?: string;

  @Column('varchar', { length: 100, nullable: true })
  brokerOrderId?: string;

  // === Ejecución ===
  @Column('varchar', { length: 30 })
  status!: string;

  @Column('varchar', { length: 20 })
  executionMode!: string;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  filledQty?: number;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  filledPrice?: number;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  avgFillPrice?: number;

  @Column('timestamp with time zone', { nullable: true })
  filledAt?: Date;

  // === Reintentos ===
  @Column('integer', { default: 0 })
  attemptCount!: number;

  @Column('timestamp with time zone', { nullable: true })
  lastAttemptAt?: Date;

  @Column('varchar', { length: 500, nullable: true })
  lastError?: string;

  // === Stops & Targets ===
  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  stopLoss?: number;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  takeProfit?: number;

  @Column('varchar', { length: 100, nullable: true })
  tpOrderId?: string;

  @Column('varchar', { length: 100, nullable: true })
  slOrderId?: string;

  // === Cierre ===
  @Column('varchar', { length: 30, nullable: true })
  closeStatus?: string;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  exitPrice?: number;

  @Column('timestamp with time zone', { nullable: true })
  closedAt?: Date;

  // === P&L ===
  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  profitLoss?: number;

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  profitLossPercent?: number;

  @Column('varchar', { length: 50, nullable: true })
  outcome?: string;

  // === Evidencia & Auditoría ===
  @Column('jsonb', { nullable: true })
  brokerResponse?: Record<string, any>;

  @Column('text', { nullable: true })
  notes?: string;

  @Column('timestamp with time zone', { nullable: true })
  brokerTimestamp?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
