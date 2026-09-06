import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { DecisionAuditTrail } from './decision-audit-trail.entity';
import { FeedbackValidationRecord } from './feedback-validation.entity';

export enum FeedbackStatus {
  HYPOTHESIS = 'HYPOTHESIS',
  IN_VALIDATION = 'IN_VALIDATION',
  PROPOSED_LESSON = 'PROPOSED_LESSON',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}

@Entity('decision_feedback')
@Index(['decisionId'])
@Index(['status'])
@Index(['createdAt'])
export class DecisionFeedback {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  decisionId!: string;

  @ManyToOne(() => DecisionAuditTrail)
  @JoinColumn({ name: 'decisionId' })
  decision!: DecisionAuditTrail;

  @Column('text')
  jayResponse!: string;

  @Column('enum', { enum: FeedbackStatus, default: FeedbackStatus.HYPOTHESIS })
  status!: FeedbackStatus;

  @Column('varchar', { length: 100, default: 'Jay' })
  respondedBy: string = 'Jay';

  @Column('int', { default: 0 })
  validationEvidenceFavor: number = 0;

  @Column('int', { default: 0 })
  validationEvidenceAgainst: number = 0;

  @Column('jsonb', { nullable: true })
  auditHistory: Array<{
    timestamp: Date;
    action: string;
    actor?: string;
    details?: string;
    changedFrom?: string;
    changedTo?: string;
  }> | null = null;

  @OneToMany(
    () => FeedbackValidationRecord,
    (record) => record.feedback,
    { cascade: true }
  )
  validationRecords?: FeedbackValidationRecord[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
