import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * NO-OP EXPLANATION
 * Registra automáticamente cuando Tito NO opera porque una decisión fue bloqueada
 *
 * Causas verificables:
 * - SEATBELT gate bloqueado (especificar cuál)
 * - Mercado cerrado (horario real del mercado)
 * - Pre-execution evidence insuficiente/inválida
 * - Múltiples gates fallidos
 * - Causa determinable con evidencia disponible
 *
 * CRÍTICO: Nunca fabricar razones, IDs, timestamps, condiciones de mercado
 * ni datos faltantes. Si no se puede determinar con evidencia suficiente →
 * FAIL/HOLD o "causa indeterminada verificable".
 */
@Entity('no_op_explanations')
@Index(['decisionId'])
@Index(['blockageReason'])
@Index(['createdAt'])
export class NoOpExplanation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // === IDs reales disponibles (aquellos que existen) ===
  @Column('varchar', { length: 36 })
  decisionId!: string; // Siempre existe: la decisión que fue bloqueada

  @Column('varchar', { length: 50, nullable: true })
  tradeId?: string; // Opcional: si se generó algún orden antes del bloqueo

  @Column('varchar', { length: 36, nullable: true })
  executionEventId?: string; // Opcional: si hay evento de bloqueo

  // === Razón de bloqueo: exacta, verificable, sin fabricación ===
  @Column('varchar', { length: 50 })
  blockageReason!: string; // SEATBELT_GATE, MARKET_CLOSED, INSUFFICIENT_EVIDENCE, MULTIPLE_GATES_FAILED, INDETERMINATE

  @Column('varchar', { length: 200 })
  specificGateOrRule!: string; // Exactamente cuál gate/regla bloqueó (ej. "SEATBELT.maxDrawdown > 15%")

  // === Contexto y evidencia disponible ===
  @Column('timestamp with time zone')
  blockageTimestamp!: Date; // Timestamp real del bloqueo, NO fabricado

  @Column('varchar', { length: 500 })
  blockageExplanation!: string; // Explicación clara de por qué fue bloqueado (sin inventar)

  // === Evidencia que SÍ existe (sin inventar lo que falta) ===
  @Column('jsonb', { nullable: true })
  availableEvidence?: Record<string, any>; // Datos reales capturados en el momento del bloqueo

  @Column('jsonb', { nullable: true })
  failedGates?: Record<string, any>; // Qué gates específicos fallaron y por qué

  // === Repetición ===
  @Column('boolean', { default: false })
  isDuplicate?: boolean; // true si ya existe una explicación para esta decisión

  @Column('varchar', { length: 36, nullable: true })
  duplicateOfId?: string; // ID de la explicación anterior si es duplicado

  @CreateDateColumn()
  createdAt!: Date;
}
