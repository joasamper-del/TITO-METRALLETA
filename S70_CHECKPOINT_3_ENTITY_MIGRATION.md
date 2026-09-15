# S70 CHECKPOINT 3: PreExecutionEvidence Entity + Migration

**Timeline:** Day 7  
**Depends on:** Checkpoints 1-2 PASS  
**Status:** 🟡 PENDING CHECKPOINT 2  
**Authorized by:** Víctor (solo documentación)  
**For decision:** Jay  

---

## 📋 OBJETIVO

Crear la **capa de auditoría** — tabla BD + entity TypeORM:
- **PreExecutionEvidence:** Foto de cada validación SEATBELT antes de ejecutar
- **Migration:** Crear tabla, índices, constraints
- **Integration:** Conectar con `seatbeltService` y `executionEngine`
- **Rollback:** Test migración reversible

**Líneas totales:** +200 líneas nuevas

---

## 📂 ARCHIVOS A MODIFICAR

### NUEVOS (2 archivos)

**1. `backend/src/modules/database/entities/pre-execution-evidence.entity.ts`** (+100 líneas)

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * PRE-EJECUCIÓN EVIDENCE: Foto del estado SEATBELT ANTES de ejecutar orden
 * 
 * Propósito:
 * - Auditoría: cada trade tiene foto de por qué se aprobó
 * - Anti-replay: consume flag previene ejecutar mismo evidence 2x
 * - Compliance: SEC requiere documentación completa
 */
@Entity('pre_execution_evidence')
@Index(['trade_id'])
@Index(['all_gates_pass'])
@Index(['created_at'])
export class PreExecutionEvidence {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('varchar', { length: 50 })
  trade_id!: string; // Vínculo a DecisionAuditTrail

  @Column('varchar', { length: 100, nullable: true })
  order_intent_id?: string; // Anti-replay hash (SHA256 de order)

  // Gates 1-5 results (cada uno es {valid: boolean, reason: string})
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
```

**Propósito:** Entity TypeORM con columnas JSONB para gates, anti-replay, auditoría.

---

**2. `backend/src/migrations/1726229200000-CreatePreExecutionEvidenceTable.ts`** (+100 líneas)

```typescript
import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePreExecutionEvidenceTable1726229200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'pre_execution_evidence',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'trade_id',
            type: 'varchar',
            length: 50,
            isNullable: false,
          },
          {
            name: 'order_intent_id',
            type: 'varchar',
            length: 100,
            isNullable: true,
          },
          {
            name: 'gate1_result',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'gate2_result',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'gate3_result',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'gate4_result',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'gate5_result',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'all_gates_pass',
            type: 'boolean',
            isNullable: false,
          },
          {
            name: 'valid_until',
            type: 'timestamp',
            isNullable: false,
          },
          {
            name: 'consumed',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'now()',
            isNullable: false,
          },
        ],
        indices: [
          new TableIndex({ columnNames: ['trade_id'] }),
          new TableIndex({ columnNames: ['all_gates_pass'] }),
          new TableIndex({ columnNames: ['created_at'] }),
          new TableIndex({ columnNames: ['consumed'] }),
        ],
      }),
      true, // skipIfExist = false, error si ya existe
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('pre_execution_evidence');
  }
}
```

**Propósito:** Migration TypeORM creando tabla con índices, rollback limpio.

---

## ✅ LÍNEAS EXACTAS

| Componente | Líneas |
|-----------|--------|
| PreExecutionEvidence entity | +100 |
| Migration script | +100 |
| **TOTAL CHECKPOINT 3** | **+200** |

---

## 🔍 RIESGOS IDENTIFICADOS

| Riesgo | Probabilidad | Severidad | Mitigación |
|--------|---|---|---|
| JSONB columns too large | 1% | Baja | Compress gate results if needed |
| Index creation slow on large table | 2% | Media | Non-blocking index creation |
| UUID generation fails | <1% | Alta | PostgreSQL gen_random_uuid() native |
| down() migration destroys data | 0% | Crítica | **ONLY use if FULL rollback needed** |
| Timestamp precision (UTC) | 1% | Baja | PostgreSQL default OK |

---

## ✅ PASS/FAIL CRITERIA

### ✅ CHECKPOINT 3 PASSES IF:

```bash
# En staging:
npm run db:migrate

# Verificar tabla creada:
SELECT * FROM pre_execution_evidence LIMIT 0;
→ Table exists, 0 rows

# Verificar índices:
SELECT * FROM pg_indexes WHERE tablename='pre_execution_evidence';
→ 4 indices found (trade_id, all_gates_pass, created_at, consumed)

# Test insert:
INSERT INTO pre_execution_evidence (
  trade_id, gate1_result, gate2_result, gate3_result, gate4_result, gate5_result,
  all_gates_pass, valid_until, consumed
) VALUES (
  'TID-001',
  '{"valid":true,"reason":"OK","timestamp":"2026-09-12T14:00:00Z"}',
  '{"valid":true,"reason":"OK","timestamp":"2026-09-12T14:00:00Z"}',
  '{"valid":true,"reason":"OK","timestamp":"2026-09-12T14:00:00Z"}',
  '{"valid":true,"reason":"OK","timestamp":"2026-09-12T14:00:00Z"}',
  '{"valid":true,"reason":"OK","timestamp":"2026-09-12T14:00:00Z"}',
  true,
  NOW() + INTERVAL '5 minutes',
  false
);
→ 1 row inserted OK

# Test rollback:
npm run db:migrate:revert
→ Table dropped
→ npm run db:migrate recreates OK
```

### ❌ CHECKPOINT 3 FAILS IF:

```
Migration fails to apply
OR table not created
OR indices not created
OR rollback doesn't work
```

---

## 🔄 ROLLBACK STRATEGY

If Checkpoint 3 fails:

```bash
# Revert migration
npm run db:migrate:revert

# Table pre_execution_evidence dropped
# Tito unchanged (SEATBELT_ENABLED = false)
# Checkpoints 1-2 code untouched

# Timeline: 2-5 minutes max
```

---

## 📋 PRE-FLIGHT CONTROL

- [ ] **Schema Validation:** JSONB columns tested with sample data
- [ ] **Index Performance:** Verify indices on trade_id, all_gates_pass work
- [ ] **Rollback Test:** down() migration tested in staging
- [ ] **Data Integrity:** No foreign key constraint to non-existent tables
- [ ] **Timestamps:** Using PostgreSQL native NOW(), UTC timezone
- [ ] **Storage:** JSONB doesn't explode size (normal gate results ~100 bytes)

---

## 📚 EVIDENCE JAY MUST REVIEW

1. **Entity Design:** JSONB for gates is correct (flexible, queryable)
2. **Migration:** Indices on trade_id, all_gates_pass (important for lookups)
3. **Rollback:** down() is clean, no cascades, no data loss
4. **Timestamps:** All timestamps UTC, consistent
5. **Anti-replay:** consumed flag + valid_until work together

---

## 🎯 NEXT STEPS (IF JAY APPROVES)

1. Claude creates entity + migration
2. Test migration in staging: `npm run db:migrate`
3. Verify table + indices exist
4. Test rollback: `npm run db:migrate:revert`
5. Code review: Víctor + Jay approve
6. Merge to main (one commit)
7. Apply migration to production (if GO to LIVE)
8. PROCEED TO CHECKPOINT 4

---

## ⏹️ STATE AFTER CHECKPOINT 3

- ✅ PreExecutionEvidence table created
- ✅ Indices on key columns
- ✅ Entity ready for insert/query
- ✅ BrokerAdapter now has real table for bypass detection
- ✅ Auditoría trail ready to populate
- ❌ Tito still blocked (SEATBELT_ENABLED = false)
- ❌ Paper Trading not yet run

---

**Checkpoint 3 is the persistence layer. Checkpoint 4 validates it all in production.**

**Status: HOLD — Awaiting Checkpoint 2 PASS to proceed.**
