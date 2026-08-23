import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Opportunity } from './opportunity.entity';

@Entity('trade_results')
export class TradeResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Opportunity, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'opportunity_id' })
  opportunity: Opportunity;

  @Column('varchar', { length: 20 })
  result: string;

  @Column('float')
  points: number;

  @Column('text', { array: true, default: [] })
  successReasons: string[];

  @Column('text', { array: true, default: [] })
  failureReasons: string[];

  @Column('text', { array: true, default: [] })
  lessons: string[];

  @CreateDateColumn()
  recordedAt: Date;
}
