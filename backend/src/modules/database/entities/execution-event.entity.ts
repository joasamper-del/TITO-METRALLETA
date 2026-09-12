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

@Entity('execution_events')
@Index(['eventType'])
export class ExecutionEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => TradeExecution, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'trade_execution_id' })
  tradeExecution!: TradeExecution;

  @Column('varchar', { length: 30 })
  eventType!: string;

  @Column('varchar', { length: 100, nullable: true })
  brokerOrderId?: string;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  filledQty?: number;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  filledPrice?: number;

  @Column('varchar', { length: 500, nullable: true })
  message?: string;

  @Column('jsonb', { nullable: true })
  brokerData?: Record<string, any>;

  @Column('timestamp with time zone', { nullable: true })
  brokerTimestamp?: Date;

  @CreateDateColumn()
  recordedAt!: Date;
}
