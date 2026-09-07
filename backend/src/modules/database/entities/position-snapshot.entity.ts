import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('position_snapshots')
@Index(['timestamp'])
@Index(['symbol'])
@Index(['timestamp', 'symbol'])
export class PositionSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('timestamp with time zone')
  timestamp!: Date;

  @Column('varchar', { length: 10 })
  symbol!: string;

  // Datos de posición actual
  @Column('decimal', { precision: 20, scale: 8 })
  qty!: number;

  @Column('decimal', { precision: 20, scale: 8 })
  entryPrice!: number;

  @Column('decimal', { precision: 20, scale: 8 })
  currentPrice!: number;

  @Column('decimal', { precision: 20, scale: 8 })
  pnl!: number;

  @Column('decimal', { precision: 10, scale: 4 })
  pnlPercent!: number;

  // Histórico desde entrada
  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  highSinceEntry?: number;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  lowSinceEntry?: number;

  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  maxPnL?: number;

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  maxPnLPercent?: number;

  @Column('integer', { nullable: true })
  daysOpen?: number;

  // Indicadores técnicos
  @Column('decimal', { precision: 20, scale: 8, nullable: true })
  volume?: number;

  @Column('varchar', { length: 20, nullable: true })
  trend?: string; // UP, DOWN, NEUTRAL

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  rsi?: number;

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  atr?: number;

  @Column('decimal', { precision: 10, scale: 4, nullable: true })
  vix?: number;

  // Razonamiento
  @Column('text', { nullable: true })
  reasoning?: string;

  @Column('varchar', { length: 50, nullable: true })
  reassessmentForecast?: string; // HOLD, TAKE_PROFIT, STOP_LOSS, MONITOR

  @CreateDateColumn()
  createdAt!: Date;
}
