import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { TradeExecution } from './trade-execution.entity';

@Entity('decision_audit_trail')
@Index(['timestamp'])
@Index(['symbol'])
@Index(['decision'])
@Index(['timestamp', 'symbol'])
export class DecisionAuditTrail {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('timestamp with time zone')
  timestamp!: Date;

  @Column('varchar', { length: 10, nullable: true })
  symbol: string | null = null;

  @Column('varchar', { length: 100, nullable: true })
  strategy: string | null = null;

  @Column('varchar', { length: 30 })
  decision!: string; // ENTER, ESPERAR, NO_ENTRAR, SALIR, ERROR

  @Column('float', { nullable: true })
  confidence: number | null = null;

  @Column('varchar', { length: 50, nullable: true })
  riskLevel: string | null = null; // LOW, MEDIUM, HIGH, EXTREME

  @Column('jsonb', { nullable: true })
  riskGatesApplied: Record<string, any> | null = null;

  @Column('float', { nullable: true })
  mliScore: number | null = null;

  @Column('jsonb', { nullable: true })
  mliBreakdown: Record<string, any> | null = null; // Component scores

  @Column('jsonb', { nullable: true })
  marketData: Record<string, any> | null = null; // SPY, QQQ, VIX, Volume, etc.

  @Column('jsonb', { nullable: true })
  dataAvailability: Record<string, any> | null = null; // Which data was REAL vs MOCK vs MISSING

  @Column('jsonb', { nullable: true })
  filtersApplied: Record<string, any> | null = null; // Strategy selector, earnings events, etc.

  @Column('varchar', { length: 255, nullable: true })
  blockedReason: string | null = null; // If decision was blocked, why?

  @Column('float', { nullable: true })
  proposedEntry: number | null = null;

  @Column('float', { nullable: true })
  proposedTarget: number | null = null;

  @Column('float', { nullable: true })
  proposedStop: number | null = null;

  @Column('varchar', { length: 50, nullable: true })
  executionStatus: string | null = null; // PENDING, EXECUTED, FAILED, SKIPPED

  @Column('varchar', { length: 255, nullable: true })
  executionId: string | null = null; // Link to actual trade execution

  @Column('varchar', { length: 50, nullable: true })
  outcome: string | null = null; // PROFITABLE, LOSS, PARTIAL, PENDING, ERROR

  @Column('float', { nullable: true })
  profitLoss: number | null = null;

  @Column('float', { nullable: true })
  profitLossPercent: number | null = null;

  @Column('jsonb', { nullable: true })
  lessons: Record<string, any> | null = null; // Learning insights

  @Column('text', { nullable: true })
  notes: string | null = null;

  // === Etapa 2: Relación reversa a TradeExecution ===
  @OneToMany(() => TradeExecution, (exec) => exec.decisionAuditTrail, {
    lazy: true,
    cascade: false,
  })
  tradeExecutions?: TradeExecution[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
