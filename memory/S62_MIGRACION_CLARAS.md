---
name: s62-migracion-claras
description: S62 - Aclaración de migración BD para decisionAuditTrailId
metadata:
  type: project
---

# S62 - Aclaración de Migración de Base de Datos

**Fecha:** 2026-09-07  
**Estado:** ACLARACIONES NECESARIAS ANTES DE DECLARAR S62 FUNCIONAL EN ENTORNO REAL

---

## 🎯 Preguntas Clave

El usuario identifica correctamente que **24 tests PASS... pero en un entorno de prueba (mocks)**, no en la BD real donde Tito vive.

### 1. ¿Qué base de datos requiere el cambio?

**Base de datos:** PostgreSQL  
**URL:** `process.env.DATABASE_URL`  
**Tabla afectada:** `position_snapshots`  
**Entorno configuración:**
```typescript
// app.module.ts
type: 'postgres',
url: process.env.DATABASE_URL,
synchronize: process.env.NODE_ENV === 'development',  // ← CRÍTICO
```

---

### 2. ¿Qué columna exacta se necesita agregar?

**Nombre columna:** `decision_audit_trail_id`  
**Tipo:** `UUID`  
**Nullable:** `true` (permite datos históricos)  
**Índice:** NO (relación FK no forzada en esta versión)

**SQL:**
```sql
ALTER TABLE position_snapshots 
ADD COLUMN decision_audit_trail_id UUID NULL;
```

---

### 3. ¿Si existe riesgo para datos actuales?

✅ **NO HAY RIESGO:**
- Columna es `NULLABLE`
- No modifica datos existentes
- Solo agrega capacidad de vinculación futura
- Registros sin decisionAuditTrailId seguirán funcionando

---

### 4. ¿Rollback si falla?

✅ **ROLLBACK SEGURO:**
```sql
ALTER TABLE position_snapshots 
DROP COLUMN decision_audit_trail_id;
```

---

### 5. ¿Qué pruebas faltan después de aplicar la migración?

**Tests de integración REAL (NO mocks) necesarios:**

| Test | Requisito | Evidencia |
|------|-----------|-----------|
| Migración aplicada | Columna existe en BD | `\d position_snapshots` en psql |
| PositionSnapshot se guarda | INSERT con decisionAuditTrailId | SELECT desde BD real |
| Vinculación recuperable | SELECT con decisionAuditTrailId | JOIN con decision_audit_trail si se crea |
| Datos históricos intactos | No hay corrupción | Comparar registros antiguos |
| Índices BD (si aplica) | Performance | EXPLAIN ANALYZE query vinculación |

---

## 🔄 Próximos Pasos

### **Fase 1: Verificar estado actual**
```bash
# 1. Conectar a BD Tito
psql $DATABASE_URL

# 2. Verificar que tabla existe
\d position_snapshots

# 3. Verificar si columna ya existe
\d position_snapshots | grep decision_audit_trail_id

# 4. Si NO existe: aplicar migración
ALTER TABLE position_snapshots 
ADD COLUMN decision_audit_trail_id UUID NULL;

# 5. Verificar resultado
\d position_snapshots
```

### **Fase 2: Tests de integración real**
- NO usar mockRepository
- Usar PositionSnapshotService con TypeORM real
- Guardar → Recuperar desde BD PostgreSQL
- Verificar decisionAuditTrailId persiste

### **Fase 3: Validación de Tito en producción**
- Registrar PositionSnapshot con indicadores
- Vincular a DecisionAuditTrail real
- Recuperar después de cierre de sesión
- Verificar razonamiento íntegro

---

## 🚨 Blockers Actuales

| Blocker | Estado | Resolución |
|---------|--------|-----------|
| ¿Migración ejecutada en BD real? | ❓ DESCONOCIDO | Consultar DB server |
| ¿Tests de integración contra BD real? | ❌ NO (mocks) | Crear tests con DB real |
| ¿Funcional en producción Tito? | ❓ DESCONOCIDO | Validar después migración |

---

## ✅ Criterio de "FUNCIONAL EN ENTORNO REAL"

S62 será considerada COMPLETADA cuando:

1. ✅ Migración BD aplicada y validada
2. ✅ 24 tests PASS (mocks) — YA CUMPLIDO
3. ✅ Tests de integración PASS (BD real) — PENDIENTE
4. ✅ Tito registra snapshots con indicadores y razonamiento
5. ✅ Snapshots recuperables después de reinicio
6. ✅ Guardrails vigentes (sin operaciones, Ethereum abierta)

---

## 📝 Notas

- **No es "no está mal"** — es que **todavía falta demostrar que funciona donde Tito realmente vive**, no solamente en el salón de prácticas.
- Tests unitarios ≠ Funcional en producción
- Mocks ≠ Base de datos real
- Las 62 assertions PASS son validación de lógica, no de persistencia en PostgreSQL

---

## 🔴 Guardrails vigentes

- ✅ Ethereum: ABIERTA
- ✅ Operaciones: NINGUNA
- ✅ Salida/reentrada: BLOQUEADA
- ✅ No avanza a S63 sin aprobación
