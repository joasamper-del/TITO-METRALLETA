import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * PRE-EXECUTION EVIDENCE
 *
 * Foto del estado SEATBELT ANTES de ejecutar orden.
 *
 * Propósito:
 * - Auditoría: cada trade tiene foto de por qué se aprobó
 * - Anti-replay: consumed flag previene ejecutar mismo evidence 2x
 * - Compliance: SEC requiere documentación completa
 */
@Entity('pre_execution_evidence')
@Index(['trade_id'])
@Index(['all_gates_pass'])
@Index(['created_at'])
@Index(['consumed'])
export class PreExecutionEvidence {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 50 })
  trade_id!: string; // Vínculo a DecisionAuditTrail

  @Column('varchar', { length: 100, nullable: true })
  order_intent_id?: string; // Anti-replay hash (SHA256 de order)

  // Gate 1-5 results (cada uno es {valid: boolean, reason: string, timestamp: string})
  @Column('jsonb')
  gate1_result!: {
    valid: boolean;
    reason: string;
    timestamp: string;
  };

  @Column('jsonb')
  gate2_result!: {
    valid: boolean;
    reason: string;
    timestamp: string;
  };

  @Column('jsonb')
  gate3_result!: {
    valid: boolean;
    reason: string;
    timestamp: string;
  };

  @Column('jsonb')
  gate4_result!: {
    valid: boolean;
    reason: string;
    timestamp: string;
  };

  @Column('jsonb')
  gate5_result!: {
    valid: boolean;
    reason: string;
    timestamp: string;
  };

  @Column('boolean')
  all_gates_pass!: boolean; // Key field: true = orden autorizada

  @Column('timestamp')
  valid_until!: Date; // Expiración 5 minutos (para anti-replay)

  @Column('boolean', { default: false })
  consumed!: boolean; // Anti-replay flag: true = ya usada

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;

  // Helper: marcar como consumida (anti-replay)
  markConsumed(): void {
    this.consumed = true;
    this.updated_at = new Date();
  }

  // Helper: verificar si expiró
  isExpired(): boolean {
    return new Date() > this.valid_until;
  }

  // Helper: verificar si puede ser usada
  isUsable(): boolean {
    return !this.consumed && !this.isExpired();
  }
}
