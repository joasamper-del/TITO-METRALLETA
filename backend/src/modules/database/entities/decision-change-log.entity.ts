import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { DecisionAuditTrail } from './decision-audit-trail.entity';

@Entity('decision_change_logs')
@Index('idx_dcl_decision_id', ['decisionAuditTrailId'])
@Index('idx_dcl_changed_at', ['changedAt'])
export class DecisionChangeLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  decisionAuditTrailId: string;

  @Column('varchar', { length: 50 })
  action: string; // 'CREATED', 'UPDATED', 'REASONING_ADDED', etc.

  @Column('integer', { nullable: true })
  snapshotCount?: number; // Count of snapshots linked at time of change

  @CreateDateColumn()
  changedAt: Date;

  // Foreign key relationship (CASCADE delete)
  @ManyToOne(() => DecisionAuditTrail, {
    onDelete: 'CASCADE',
    onUpdate: 'RESTRICT',
  })
  @JoinColumn({ name: 'decision_audit_trail_id' })
  decision?: DecisionAuditTrail;
}
