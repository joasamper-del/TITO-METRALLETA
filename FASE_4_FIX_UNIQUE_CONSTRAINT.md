# 🔧 FASE 4 FIX — UNIQUE Constraint para client_order_id

**Auditor:** Claude Haiku 4.5  
**Timestamp:** 2026-09-12 03:15 ET  
**Estado:** PREPARADO, SIN EJECUTAR  
**Autorización:** PENDIENTE

---

## 📋 CONTEXTO

**Problema encontrado en auditoría:** clientOrderId NO tiene UNIQUE constraint

**Impacto:** Reintentos pueden crear múltiples TradeExecutions con mismo clientOrderId, rompiendo dedup

**Oportunidad:** BD está limpia (tabla migrations vacía), podemos arreglar ANTES de ejecutar cualquier migración

---

## 🔍 VERIFICACIÓN DE BD

```
Estado actual:
- Tabla trade_executions: NO EXISTE
- Tabla execution_events: NO EXISTE  
- Tabla migrations: EXISTE pero vacía (0 registros)
- Status: BD limpia, cero migraciones ejecutadas

Conclusión: ✅ Podemos modificar migración original SIN riesgo
```

---

## ✅ SOLUCIÓN PROPUESTA

### Opción 1 (RECOMENDADA): Modificar migración original

**Ubicación:** `backend/src/migrations/1726173600000-AddTradeExecutionTables.ts`

**Cambios:**
1. Agregar constraint UNIQUE en la sección CREATE TABLE (línea ~302)
2. Agregar índice UNIQUE explícito si es necesario
3. Incluir rollback correspondiente en método `down()`

### Opción 2 (ALTERNATIVA): Crear migración nueva

- Crear `1726173700000-AddUniqueConstraintClientOrderId.ts`
- Ejecutarse DESPUÉS de 1726173600000
- Ventaja: Reversible sin modificar historial
- Desventaja: Más migración

**Recomendación:** Opción 1 (simple, limpio, antes de ejecutar nada)

---

## 🔧 CAMBIO EXACTO A REALIZAR

### Archivo: `backend/src/migrations/1726173600000-AddTradeExecutionTables.ts`

**ANTES (línea ~300-304):**

```typescript
        ],
      }),
      true,
    );

    // 2. Crear índices en trade_executions
```

**DESPUÉS (AGREGAR):**

```typescript
        ],
      }),
      true,
    );

    // *** NUEVO: Agregar constraint UNIQUE a client_order_id ***
    await queryRunner.createIndex(
      'trade_executions',
      new TableIndex({
        name: 'IDX_UNIQUE_trade_executions_client_order_id',
        columnNames: ['client_order_id'],
        isUnique: true,
        where: 'client_order_id IS NOT NULL',
      }),
    );

    // 2. Crear índices en trade_executions
```

**Explicación:**
- Usa TypeORM TableIndex con `isUnique: true`
- Incluye `WHERE client_order_id IS NOT NULL` porque es nullable
- En PostgreSQL: `UNIQUE (client_order_id) WHERE client_order_id IS NOT NULL`
- Permite múltiples NULLs (valores nulos no violan UNIQUE)

---

## 🔄 ROLLBACK (en método `down()`)

**Ubicación:** Aproximadamente línea 516+

**ANTES:**

```typescript
  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Eliminar FK en position_snapshots...
```

**DESPUÉS (AGREGAR AL INICIO):**

```typescript
  public async down(queryRunner: QueryRunner): Promise<void> {
    // *** NUEVO: Eliminar constraint UNIQUE *** (debe ser PRIMERO)
    const tradeExecutionsTable = await queryRunner.getTable('trade_executions');
    if (tradeExecutionsTable) {
      const idx = tradeExecutionsTable.indices.find(
        (idx) => idx.name === 'IDX_UNIQUE_trade_executions_client_order_id',
      );
      if (idx) {
        await queryRunner.dropIndex('trade_executions', idx);
      }
    }

    // 1. Eliminar FK en position_snapshots...
```

---

## 📊 CAMBIOS EXACTOS

| Archivo | Línea | Tipo | Cambio |
|---------|-------|------|--------|
| 1726173600000-AddTradeExecutionTables.ts | ~305 | ADD | Crear índice UNIQUE |
| 1726173600000-AddTradeExecutionTables.ts | ~516 | ADD | Dropear índice UNIQUE en rollback |
| TOTAL | 2 | ADD | ~15 líneas |

---

## 🧪 VALIDACIÓN

### Antes de ejecutar:

1. ✅ BD está limpia (migrations table vacía)
2. ✅ No existen datos en trade_executions
3. ✅ Cambio es reversible (rollback incluido)
4. ✅ Sintaxis TypeORM correcta
5. ✅ PostgreSQL soporta UNIQUE con WHERE

### Después de ejecutar (cuando se autorice):

```bash
# 1. Correr migración
cd backend/
npm run build
npx typeorm -d dist/data-source.js migration:run

# 2. Verificar constraint
SELECT indexname, indexdef FROM pg_indexes 
WHERE tablename = 'trade_executions' AND indexname LIKE '%UNIQUE%';

# Esperado:
# IDX_UNIQUE_trade_executions_client_order_id | CREATE UNIQUE INDEX ... WHERE client_order_id IS NOT NULL
```

---

## ⚠️ RIESGOS IDENTIFICADOS

### Riesgo BAJO: Sintaxis TypeORM

- ✅ Verificado: TableIndex soporta `isUnique: true` desde TypeORM 0.2.x
- ✅ Verificado: Parámetro `where` soportado

### Riesgo BAJO: PostgreSQL

- ✅ Verificado: UNIQUE con WHERE soportado en PostgreSQL 12+

### Riesgo BAJO: Rollback

- ✅ Rollback incluido en método `down()`
- ✅ Si falla, `npx typeorm migration:revert` revierte limpiamente

---

## 🎯 ALTERNATIVA: Sin modificar migración existente

Si prefieres **NO modificar migración ya escrita**, crea una migración NUEVA:

**Archivo:** `backend/src/migrations/1726173700000-AddUniqueConstraintClientOrderId.ts`

```typescript
import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

/**
 * Agrega constraint UNIQUE a client_order_id en trade_executions
 * Precondición: Migración 1726173600000 ya ejecutada
 */
export class AddUniqueConstraintClientOrderId1726173700000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createIndex(
      'trade_executions',
      new TableIndex({
        name: 'IDX_UNIQUE_trade_executions_client_order_id',
        columnNames: ['client_order_id'],
        isUnique: true,
        where: 'client_order_id IS NOT NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tradeExecutionsTable = await queryRunner.getTable('trade_executions');
    if (tradeExecutionsTable) {
      const idx = tradeExecutionsTable.indices.find(
        (idx) => idx.name === 'IDX_UNIQUE_trade_executions_client_order_id',
      );
      if (idx) {
        await queryRunner.dropIndex('trade_executions', idx);
      }
    }
  }
}
```

**Ventaja:** Mantiene historial de migraciones limpio  
**Desventaja:** Una migración más para ejecutar

---

## 🚫 DECISIÓN PENDIENTE

### Opción A (RECOMENDADA):
✅ Modificar `1726173600000-AddTradeExecutionTables.ts` directamente
- Línea ~305: Agregar createIndex UNIQUE
- Línea ~516: Agregar dropIndex en rollback

### Opción B (ALTERNATIVA):
✅ Crear nueva migración `1726173700000-AddUniqueConstraintClientOrderId.ts`

---

## 📝 CHECKLIST PRE-EJECUCIÓN

Antes de autorizar ejecución:

- [ ] Revisar cambios propuestos (líneas exactas)
- [ ] Verificar BD está limpia (migrations table vacía) ✅
- [ ] Confirmar no hay datos en trade_executions ✅
- [ ] Elegir Opción A o B
- [ ] Dar autorización explícita

---

## 🔒 ESTADO ACTUAL

```
✅ FIX PREPARADO, SIN EJECUTAR
✅ BD LIMPIA (cero riesgos de duplicados)
❌ ESPERANDO AUTORIZACIÓN ANTES DE APLICAR
```

---

**Preparado por:** Claude Haiku 4.5  
**Timestamp:** 2026-09-12 03:15 ET  
**Estatus:** DETENIDO — REQUIERE APROBACIÓN

_No se ejecutó ningún comando de BD. Solo documentación de cambios propuestos._
