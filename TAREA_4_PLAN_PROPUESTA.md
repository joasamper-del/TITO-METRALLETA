# TAREA 4 — PROPUESTA DE PLAN (INSPECCIÓN PURA)

**Fecha:** 2026-09-13 11:35 ET  
**Estado:** 🤔 **PROPUESTA PARA REVISIÓN** (sin implementación)  
**Basado en:** Inspección del estado post-TAREA 3

---

## I. CONTEXTO POST-TAREA 3

### Lo que tenemos ahora (d53a8a8):
- ✅ DecisionAuditService inyectado OBLIGATORIO
- ✅ Registra decisión ANTES de validar gates
- ✅ Bloquea si el registro falla

### Lo que FALTA para cerrar el ciclo:
- ❌ Evidencia PRE-EJECUCIÓN: Los 5 gates deben registrar resultados en BD
- ❌ Integridad: Validar que la evidencia está completa antes de ejecutar
- ❌ Trazabilidad post-ejecución: Marcar evidencia como consumida tras ejecutar

---

## II. PROPUESTA TAREA 4: Pre-Execution Evidence Recording

### Objetivo
Integrar **PreExecutionEvidenceService** para registrar y validar evidencia de todos los 5 gates ANTES de que el OperationManager ejecute la orden. Garantiza:
```
decision (TAREA 3) → evidence (TAREA 4) → execution → result
```

### Alcance

#### A. Qué CAMBIARÍA (arquivos involucrados)

**Archivo 1:** `backend/src/modules/seatbelt/services/seatbelt.service.ts`
- Inyectar `PreExecutionEvidenceService` (OBLIGATORIO)
- Después de que todos los gates pasen, registrar evidencia de cada gate
- Validar que la evidencia está completa (todos 5 gates tienen registro)
- Bloquear ejecución si alguna evidencia falta o es inválida
- **Líneas:** ~15-20 nuevas (inyección + lógica de registro)

**Archivo 2:** `backend/src/modules/seatbelt/seatbelt.module.ts`
- Importar DatabaseModule (ya está, PreExecutionEvidenceService viene de ahí)
- Exportar PreExecutionEvidenceService si no está ya

**Archivo 3:** `backend/src/modules/seatbelt/services/seatbelt.service.spec.ts`
- Agregar mock de PreExecutionEvidenceService en beforeEach
- Escribir 4 tests nuevos:
  - T1: Evidencia grabada para cada gate que pasó
  - T2: Si falta evidencia de algún gate, BLOQUEA ejecución
  - T3: Integridad: datos de evidencia coinciden con resultado de gates
  - T4: Regresión: TAREA 3 (DecisionAuditService) sigue funcionando

---

## III. FLUJO ESPERADO

### validateCheckpoint1() con TAREA 4:
```
1. Registra decisión (TASK 3) ✅
2. Valida gate1 → Registra evidencia gate1 (NUEVO)
3. Valida gate2 → Registra evidencia gate2 (NUEVO)
4. Valida gate3 → Registra evidencia gate3 (NUEVO)
5. Verifica integridad: ¿todas 3 evidencias registradas? (NUEVO)
   - SÍ → allGatesPass=true, retorna SeatbeltResult
   - NO → allGatesPass=false, "Missing pre-execution evidence"
```

### validateFull() con TAREA 4:
```
1. Registra decisión (TASK 3) ✅
2. Valida gate1→evidencia, gate2→evidencia, gate3→evidencia
3. Valida gate4→evidencia (si presente), gate5→evidencia (si presente)
4. Verifica integridad: ¿todas las evidencias requeridas registradas? (NUEVO)
5. Retorna resultado
```

---

## IV. ESTRUCTURA DE DATOS (PreExecutionEvidence)

Existe ya en BD:
```typescript
{
  id: string;
  trade_id: string;
  order_intent_id: string;
  gate1_result: { valid: boolean; reason: string; timestamp: Date };
  gate2_result: { ... };
  gate3_result: { ... };
  gate4_result?: { ... };  // Opcional
  gate5_result?: { ... };  // Opcional
  all_gates_pass: boolean;
  consumed: boolean;        // Se marca tras ejecutar
  valid_until: Date;        // Expira en 5 minutos
  created_at: Date;
  updated_at: Date;
}
```

---

## V. RIESGOS IDENTIFICADOS

| Riesgo | Impacto | Mitigación |
|--------|---------|-----------|
| PreExecutionEvidence duplicada | Confusión de auditoría | Usar `trade_id` como clave única |
| Evidencia expirada (>5min) | Ejecutar con datos obsoletos | Validar `valid_until` antes de usar |
| Gate resultado ≠ evidencia guardada | Fallo silencioso | Comparar en integridad check |
| Si falla BD de evidencia | No ejecutar, but mensaje confuso | Mensaje claro: "Cannot record evidence" |

---

## VI. PRUEBAS REQUERIDAS

### T1: Evidencia grabada para cada gate
```
✅ WHEN: validateCheckpoint1 completa con todos gates PASS
✅ EXPECT: 
   - PreExecutionEvidenceService.recordEvidence llamado 3× (gate1/2/3)
   - Cada call con gate1_result/gate2_result/gate3_result correctos
   - BD contiene 1 registro con all_gates_pass=true
```

### T2: Falta de evidencia BLOQUEA
```
✅ WHEN: recordEvidence falla para gate2_result
✅ EXPECT:
   - SeatbeltResult.allGatesPass = false
   - reason = "Missing or invalid pre-execution evidence"
   - Sin progreso hacia ejecución
```

### T3: Integridad de datos
```
✅ WHEN: Gate2 retorna {valid: true, reason: "OK"}
✅ EXPECT: 
   - evidencia.gate2_result.valid = true
   - evidencia.gate2_result.reason = "OK"
   - Coincidencia exacta, no transformación
```

### T4: Regresión TAREA 3
```
✅ WHEN: DecisionAuditService + PreExecutionEvidenceService juntos
✅ EXPECT:
   - DecisionAuditTrail contiene 1 registro (TAREA 3)
   - PreExecutionEvidence contiene 1 registro (TAREA 4)
   - Ambos linked por trade_id
   - No interferencia, flujo limpio
```

**Total tests nuevos:** 4  
**Total tests regresión:** 25 (TAREA 3 + anteriores)  
**Estimado:** 50-60 minutos

---

## VII. CRITERIOS PASS/FAIL

### ✅ GO CUANDO:
1. 4/4 tests nuevos PASS
2. 25/25 regresión PASS (TAREA 3 + Gates 1-5)
3. Build limpio (0 errores TS)
4. Sin silent-fail: todo error → allGatesPass=false
5. Integridad verificada: evidencia coincide con gates

### 🔴 NO-GO CUANDO:
1. Cualquier test falla
2. Regresión en TAREA 3 (DecisionAuditService)
3. Evidencia guardada ≠ resultado de gates
4. BD falla sin mensaje claro
5. Circular dependency entre módulos

---

## VIII. PRESERVACIÓN: Fail-Closed y Rollback

### Fail-Closed:
- Si `PreExecutionEvidenceService.recordEvidence()` falla → retorna allGatesPass=false
- Si BD timeout → error, NO ejecutar
- Si evidencia expirada (valid_until < now) → rechaza, bloquea

### Rollback Plan:
```bash
git checkout cp3-3-clean -- backend/src/modules/seatbelt/
git checkout cp3-3-clean -- backend/src/modules/seatbelt/services/seatbelt.service.ts
git checkout cp3-3-clean -- backend/src/modules/seatbelt/services/seatbelt.service.spec.ts
npm test                          # Verificar que regresión vuelve a PASS
```

---

## IX. TIMELINE ESTIMADO

- **Inspección + Planificación:** 20 min
- **Implementación código:** 25 min
- **Tests:** 30 min
- **Validación + rollback prep:** 15 min
- **Total:** ~90 min (1.5 horas)

---

## X. DECISIÓN ARQUITECTÓNICA

**¿Es TAREA 4 lo correcto?**

Opciones consideradas:
1. **TAREA 4a:** Pre-Execution Evidence (propuesta arriba) — capa de persistencia
2. **TAREA 4b:** Operación Manager Integration — dónde SeatbeltService se llama
3. **TAREA 4c:** Cierre fail-closed — qué pasa si CUALQUIER gate falla

**Recomendación:** TAREA 4a (Pre-Execution Evidence)  
**Razón:** Completa el ciclo de trazabilidad ANTES de saltar a operaciones. Logical progression: auditar decisión → registrar evidencia → luego ejecutar.

---

## XI. PRÓXIMO PASO

**¿Confirmas TAREA 4 = Pre-Execution Evidence Recording?**

- SÍ → Autorizar e implementar con plan anterior
- NO → Clarificar qué debe ser TAREA 4
- AJUSTE → Precisar scope/alcance

---

**ESTADO:** 🤔 **PENDIENTE REVISIÓN Y AUTORIZACIÓN**

*Sin código modificado. Sin commit. Sin implementación. Plan inspeccionado.*

---

**Fecha Propuesta:** 2026-09-13 11:35 ET  
**Preparado por:** Claude Haiku 4.5  
**Para:** Víctor + Jay (decisión arquitectónica)
