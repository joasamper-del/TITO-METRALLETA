import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { DecisionFeedback } from './feedback.entity';
import { DecisionAuditTrail } from './decision-audit-trail.entity';

export enum ValidationOutcome {
  PROFITABLE = 'PROFITABLE',
  LOSS = 'LOSS',
  PENDING = 'PENDING',
}

@Entity('feedback_validation_record')
@Index(['feedbackId'])
@Index(['decisionId'])
@Index(['createdAt'])
export class FeedbackValidationRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  feedbackId!: string;

  @ManyToOne(() => DecisionFeedback, (feedback) => feedback.validationRecords)
  @JoinColumn({ name: 'feedbackId' })
  feedback!: DecisionFeedback;

  @Column('uuid')
  decisionId!: string;

  @ManyToOne(() => DecisionAuditTrail)
  @JoinColumn({ name: 'decisionId' })
  subsequentDecision!: DecisionAuditTrail;

  @Column('boolean', { nullable: true })
  hypothesisAppliedCorrectly: boolean | null = null;

  @Column('enum', { enum: ValidationOutcome, default: ValidationOutcome.PENDING })
  outcome!: ValidationOutcome;

  @Column('boolean', { nullable: true })
  conditionsMatching: boolean | null = null;

  @Column('text', { nullable: true })
  notes: string | null = null;

  @CreateDateColumn()
  createdAt!: Date;
}
