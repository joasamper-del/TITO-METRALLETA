import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { DecisionFeedback } from './feedback.entity';

@Entity('lessons_library')
@Index(['conditionMli', 'conditionVix', 'conditionSymbol'])
@Index(['action'])
@Index(['confidence'])
@Index(['confirmedAt'])
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  feedbackId!: string;

  @ManyToOne(() => DecisionFeedback)
  @JoinColumn({ name: 'feedbackId' })
  feedback!: DecisionFeedback;

  @Column('varchar', { length: 255 })
  title!: string;

  @Column('text', { nullable: true })
  description: string | null = null;

  @Column('float', { nullable: true })
  conditionMli: number | null = null;

  @Column('float', { nullable: true })
  conditionVix: number | null = null;

  @Column('varchar', { length: 10, nullable: true })
  conditionSymbol: string | null = null;

  @Column('varchar', { length: 20 })
  action!: string; // ENTRAR, ESPERAR, NO_ENTRAR, SALIR

  @Column('float', { default: 0 })
  confidence: number = 0; // 0-100

  @Column('integer', { default: 0 })
  sampleSize: number = 0; // Total evaluations

  @Column('integer', { default: 0 })
  favorableCount: number = 0; // Acertó

  @Column('integer', { default: 0 })
  unfavorableCount: number = 0; // Falló

  @Column('varchar', { length: 255, nullable: true })
  bestCondition: string | null = null; // "VIX > 20"

  @Column('varchar', { length: 255, nullable: true })
  worstCondition: string | null = null; // "VIX < 10"

  @Column('varchar', { length: 20, default: 'PRELIMINARY' })
  lessonType!: string; // PRELIMINARY, VALIDATED, REFINED

  @Column('text', { nullable: true })
  notes: string | null = null;

  @CreateDateColumn()
  createdAt!: Date;

  @Column('timestamp', { nullable: true })
  confirmedAt: Date | null = null;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column('jsonb', { nullable: true })
  auditTrail: Record<string, any> | null = null;
}
