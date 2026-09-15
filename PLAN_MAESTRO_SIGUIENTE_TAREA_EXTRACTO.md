# SIGUIENTE TAREA — EXTRACTO DEL PLAN MAESTRO CAJA NEGRA V1

**Fuente:** PLAN_MAESTRO_CAJA_NEGRA_V1.md (líneas 64-527)  
**Status:** A PARTIR DE AQUÍ — sin implementación, sin suposiciones  
**Autorización requerida:** Víctor

---

## CONTEXTO

Tarea 7 (Monitoreo RSS) está **COMPLETE**. Commit: `879af68`

El Plan Maestro define **Caja Negra V1** como sistema de 5 fases:

```
FASE 1: ESPECIFICACIÓN + INFRAESTRUCTURA BASE
├─ R1: Especificación Tarea 6 (liquidez)          ← YA IMPLEMENTADA (commit 35a1d2d)
├─ R9: Definición exhaustiva eventos             ← SIGUIENTE
└─ R21: Schema JSON eventos                       ← SIGUIENTE

FASE 2: IMPLEMENTACIÓN TAREA 6 — EVALUACIÓN DE LIQUIDEZ
├─ R2-R8: Código + tests

FASE 3: SISTEMA DE EVENTOS AUTOMÁTICOS
├─ R10-R19: Captura + consolidación + timestamps

FASE 4: INFRAESTRUCTURA + ALMACENAMIENTO
├─ R20-R27: JSONL + atomicidad + validación

FASE 5: VALIDACIÓN E2E
├─ R31-R33: Escenarios real + reproducibilidad
```

---

## SIGUIENTE TAREA — FASE 1.2 (R9): DEFINICIÓN EXHAUSTIVA DE EVENTOS

### Qué se implementa
**Documento:** `S70_TAREA8_SPECIFICATION_R9_EVENTOS.md`

Lista 15+ eventos clave + contexto requerido cada uno.

### Criterio GO
- ✅ Eventos enumerados: Trade Close, Order Fail, Loss of Traceability, Daily Summary, No-Op, Critical Anomaly, (9 más)
- ✅ Cada evento con: **disparador, contexto requerido, timestamp, ejemplo JSON**
- ✅ Interdependencias entre eventos claras
- ✅ Integración con SEATBELT/Guardian identificada

### Criterio NO-GO
- ❌ Evento sin contexto requerido claro
- ❌ Falta integración con sistemas existentes
- ❌ Timestamp sin precisión especificada

### Evidencia de cierre
- Documento completo (3+ páginas)
- Matriz eventos vs contexto
- Feedback Víctor: "Listo para implementar"

### Frontera
- **NO** definir formato JSON aún (eso es R21)
- **NO** escribir código (solo especificación)

### Autorización requerida
**Víctor** (review eventos)

---

## SIGUIENTE TAREA — FASE 1.3 (R21): SCHEMA JSON EVENTOS

### Qué se implementa
**Archivos:**
- `web/types/event.types.ts` — TypeScript interfaces
- `web/schemas/event.schema.json` — JSON Schema

### Criterio GO
- ✅ EventBase interface definida (timestamp, type, context)
- ✅ Interfaces específicas: TradeCloseEvent, OrderFailEvent, etc.
- ✅ JSON Schema compilable sin errores
- ✅ Schema valida contra ejemplos de R9

### Criterio NO-GO
- ❌ Schema incompatible con contexto definido en R9
- ❌ Campo requerido falta
- ❌ Errores TypeScript

### Evidencia de cierre
- Archivos `event.types.ts` + `event.schema.json` sin errores
- `npm build`: ✅ Clean
- Test: `jsonschema.validate(example, schema)` → PASS

### Frontera
- **NO** generar eventos todavía, solo tipos
- **NO** implementar Fase 2

### Autorización requerida
**Claude** (code review tipos TS)

---

## CHECKPOINT POST-FASE-1 (ESPECIFICACIÓN)

### Responsable
**Víctor**

### Pregunta
¿Especificaciones (R9, R21) son claras y ejecutables?

### Criterio GO
"Aprobado, proceder Fase 2"

### Criterio HOLD
Ajustes solicitados, revise

### Criterio NO-GO
Concepto fundamental equivocado, rediseñar

---

## RESUMEN

**Siguiente tarea = FASE 1 (Especificación):**
1. R9: Definir 15+ eventos (documento)
2. R21: Schema JSON (tipos TS + JSON Schema)

**No son trabajos de código de producción.** Son especificaciones: R9 es documento, R21 es tipos (no implementación).

**Autorización requerida antes de proceder:** Víctor

