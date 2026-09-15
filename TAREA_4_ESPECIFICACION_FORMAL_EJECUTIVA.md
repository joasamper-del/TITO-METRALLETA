# TAREA 4 — ESPECIFICACIÓN FORMAL EJECUTIVA
## Reconciliación: Pre-Execution Evidence Recording + SEATBELT Orchestration + Caja Negra V1

**Fecha:** 2026-09-13 11:43 ET  
**Estado:** 🔒 **ESPECIFICACIÓN FORMAL CONGELADA** (sin implementación)  
**Para:** Jay (autorización), Víctor (ingeniería)  
**Basado en:** Inspección exhaustiva de CP3 + planes T4 + Caja Negra V1

---

## I. TESIS: ¿TAREA 4 = PRE-EXECUTION EVIDENCE O SEATBELT ORCHESTRATION?

### La Pregunta
Reconciliar:
- **"Pre-Execution Evidence Recording"** (registrar evidencia de gates)
- **"SEATBELT Orchestration"** (orquestar 5 gates, ejecutar, validar)
- **"Caja Negra V1"** (cierre con evidencia + reportes + fail-closed)

### La Respuesta
**TAREA 4 = PRE-EXECUTION EVIDENCE RECORDING** (especialización de orquestación)

```
SEATBELT Orchestration (ya implementada, CP1+CP2+CP3):
  ├─ Gate1-5: Validaciones independientes ✅
  ├─ SeatbeltService: Llama gates en secuencia ✅
  └─ Retorna SeatbeltResult (pass/fail) ✅

TAREA 4 = Extensión: Registrar evidencia DURANTE orquestación
  ├─ PreExecutionEvidenceService: Persistir cada gate result
  ├─ Validar integridad: ¿evidencia completa?
  ├─ Fail-closed: Sin evidencia → NO ejecuta
  └─ Trazabilidad: Auditoría 100% (decisión → evidencia → ejecución)
```

**Conclusión:** No es contradicción. Tarea 4 **completa** la orquestación.

---

## II. INTENCIÓN DE CIERRE — CAJA NEGRA V1

### Qué significa "Caja Negra V1"

**Definición:** Sistema de protección y auditoría que:
1. **Registra EVIDENCIA**: Cada decisión + cada gate + cada resultado
2. **Genera REPORTES AUTOMÁTICOS**: Por eventos (orden bloqueada, BD falla, etc.)
3. **FAIL-CLOSED**: Si algo falla → NO ejecuta (preferir no operar)
4. **HOLD ANTE ANOMALÍAS**: Si pérdida de trazabilidad → requiere revisión manual

### Cómo Tarea 4 lo implementa

| Componente Caja Negra V1 | Implementación en Tarea 4 | Status |
|--------------------------|--------------------------|--------|
| **Evidencia registrada** | PreExecutionEvidenceService guarda cada gate | ✅ Esta es T4 |
| **Reportes automáticos** | ExecutionEvent + logs por anomalías | ✅ Beneficiario de T4 |
| **Fail-closed** | Si recordEvidence falla → allGatesPass=false → NO ejecuta | ✅ Garantizado en T4 |
| **HOLD ante pérdida tracza** | Si pre_execution_evidence NO existe → rechaza, escala | ✅ Validado en T4 |

---

## III. OBJETIVO TAREA 4 (FORMAL)

```
Integrar PreExecutionEvidenceService en SeatbeltService para:

1. REGISTRAR evidencia de TODOS los gates ANTES de ejecución
2. VALIDAR integridad: ¿todos los gates tienen registro?
3. BLOQUEAR ejecución si:
   - Algún gate falla
   - Evidencia no se puede registrar (BD falla)
   - Evidencia está incompleta o expirada
4. GARANTIZAR trazabilidad 100%: decisión → evidencia → resultado

Resultado: Ciclo cerrado de auditoría sin gaps.
```

---

## IV. ALCANCE ARQUITECTÓNICO

### Archivos Modificados (SOLO 2)
```
1. backend/src/modules/seatbelt/services/seatbelt.service.ts
   - Inyectar PreExecutionEvidenceService
   - Después de cada gate que pasa, registrar evidencia
   - Antes de retornar, validar integridad completa
   - Líneas: ~20 nuevas

2. backend/src/modules/seatbelt/services/seatbelt.service.spec.ts
   - Mock PreExecutionEvidenceService
   - 8 tests nuevos (flujo completo + edge cases)
   - Líneas: ~120 nuevas
```

### Archivos NO modificados
```
❌ Pre-Execution entity (ya existe, inmutable)
❌ Decision Audit Service (TAREA 3, sin cambios)
❌ Gates 1-5 (sin cambios, solo consumidos)
❌ ExecutionEngine (se integra en TAREA 5+)
```

---

## V. FLUJO EVENTO POR EVENTO

### Caso Normal: Todos los gates PASAN

```
Evento 1: validateCheckpoint1(order, tradeId) inicia
  ↓
Evento 2: Registra DecisionAuditTrail (TAREA 3)
  ↓
Evento 3: Gate1 valida + Registra Evidence Gate1 (NUEVO)
  ↓
Evento 4: Gate2 valida + Registra Evidence Gate2 (NUEVO)
  ↓
Evento 5: Gate3 valida + Registra Evidence Gate3 (NUEVO)
  ↓
Evento 6: validateIntegrityBeforeUse('trade-id') verifica:
  - ¿gate1_result definido? ✅
  - ¿gate2_result definido? ✅
  - ¿gate3_result definido? ✅
  - ¿all_gates_pass = true? ✅
  - ¿valid_until > now? ✅
  - ¿consumed = false? ✅
  ↓
Evento 7: Retorna SeatbeltResult { allGatesPass: true, evidenceId: 'PEE-456' }
  ↓
Evento 8: OperationManager recibe OK, ejecuta orden
  ↓
Evento 9: Post-ejecución, markAsConsumed('PEE-456')
  Resultado: BD actualizada (consumed = true)
```

### Caso Falla: Gate Retorna Negativo

```
Evento A: validateCheckpoint1 inicia
  ↓
Evento B: Gate1 valida OK + registra Evidence1 ✅
  ↓
Evento C: Gate2 valida FAIL + registra Evidence2 (negative) ✅
  ↓
Evento D: EARLY EXIT (no valida Gate3)
  ↓
Evento E: SeatbeltResult { allGatesPass: false, reason: 'Gate2 failed', evidenceId: 'PEE-456' }
  ↓
Evento F: OperationManager rechaza (no ejecuta)
  ↓
Evento G: Evidence queda marcada (consumed = false, pero fallo registrado)
  - Auditoría puede revisar por qué se bloqueó
```

### Caso Crítico: Pérdida de Trazabilidad (BD falla)

```
Evento X1: Gate1 OK, intenta registrar Evidence1
  ↓
Evento X2: recordEvidence() retorna ERROR (BD timeout)
  ↓
Evento X3: COMPORTAMIENTO FAIL-CLOSED:
  - NO continúa a Gate2
  - NO intenta ejecutar
  - Retorna SeatbeltResult { allGatesPass: false, reason: 'Cannot record evidence - BD timeout' }
  ↓
Evento X4: OperationManager rechaza
  ↓
Evento X5: LOG/ALERT generado para investigación
  - Error ID: ERR-789
  - Timestamp: cuando ocurrió
  - Action: Requiere revisión antes de permitir nuevos trades
```

---

## VI. CRITERIOS PASS/FAIL/HOLD (FORMAL)

### ✅ PASS — Ejecutar la orden
```
AND condición 1: DecisionAuditTrail registrado sin error
AND condición 2: Gate1 PASS + Evidence1 registrada
AND condición 3: Gate2 PASS + Evidence2 registrada
AND condición 4: Gate3 PASS + Evidence3 registrada
AND condición 5: validateIntegrityBeforeUse() = valid: true
AND condición 6: all_gates_pass = true en BD
AND condición 7: valid_until > now (no expirada)
AND condición 8: consumed = false (no reutilizada)

RESULTADO: SeatbeltResult.allGatesPass = true
ACCIÓN: OperationManager.executeOrder(evidenceId)
```

### ❌ FAIL — NO ejecutar
```
SI: Algún gate.valid = false
SI: recordEvidence() retorna error (BD timeout, constraint, etc.)
SI: validateIntegrityBeforeUse() = valid: false
SI: Evidence incompleta (falta gate1_result, gate2_result, etc.)
SI: Evidence expirada (valid_until < now)
SI: Evidence ya consumida (consumed = true)
SI: DecisionAuditTrail no existe

RESULTADO: SeatbeltResult.allGatesPass = false
ACCIÓN: Log reason, NO ejecutar orden
```

### 🟡 HOLD — Reintentar o revisar manual
```
SI: Gate responde lentamente (>10s)
  ACCIÓN: HOLD 5s, reintentar 1× 
  SI sigue lento: FAIL (timeout)

SI: Evidence parcialmente registrada (gate1 OK, gate2 fallo)
  ACCIÓN: HOLD, intentar completar gate2
  SI timeout: FAIL, descartar evidence parcial

SI: MarketState cambió significativamente (±5%) desde Gate1
  ACCIÓN: HOLD, revalidar gates
  SI alguno falla: FAIL
```

---

## VII. TEST SUITE ESPECIFICADO

### Nuevos Tests (8 total)

#### T1: Evidencia se registra por CADA gate
```
GIVEN: validateCheckpoint1() completa con gates 1,2,3 PASS
WHEN: Todos pasan correctamente
THEN:
  ✅ recordEvidence() llamado 3× (una por gate)
  ✅ Cada call contiene resultado correcto
  ✅ BD contiene 1 registro con gate1/2/3_result definidos
  ✅ all_gates_pass = true
```

#### T2: Si recordEvidence falla, BLOQUEA (no silent-fail)
```
GIVEN: Gate1 PASS, intenta registrar Evidence1
WHEN: recordEvidence() retorna ERROR (BD timeout)
THEN:
  ✅ SeatbeltResult.allGatesPass = false
  ✅ reason contiene "Cannot record evidence"
  ✅ Gates 2,3 NUNCA se ejecutan (early exit)
  ✅ OperationManager rechaza
  ✅ Error ID generado para investigación
```

#### T3: Integridad — Evidence coincide con Gate results
```
GIVEN: Gate2 retorna { valid: false, reason: 'Risk too high' }
WHEN: Evidence se registra
THEN:
  ✅ evidence.gate2_result.valid = false
  ✅ evidence.gate2_result.reason = 'Risk too high'
  ✅ EXACTO match, no transformación
  ✅ all_gates_pass = false inmediato
```

#### T4: validateIntegrityBeforeUse valida completitud
```
GIVEN: Evidence registrada para gates 1,2,3
WHEN: validateIntegrityBeforeUse('trade-id')
THEN:
  ✅ Verifica gate1_result ≠ null
  ✅ Verifica gate2_result ≠ null
  ✅ Verifica gate3_result ≠ null
  ✅ Verifica all_gates_pass = true
  ✅ Verifica valid_until > now
  ✅ Verifica consumed = false
  ✅ Retorna { valid: true }
```

#### T5: Evidence expirada se rechaza
```
GIVEN: Evidence con valid_until = hora X
WHEN: Ahora = hora X + 6 minutos (después de timeout 5min)
THEN:
  ✅ validateIntegrityBeforeUse = { valid: false, reason: 'expired' }
  ✅ SeatbeltResult.allGatesPass = false
  ✅ OperationManager rechaza
```

#### T6: Evidence consumida no se reutiliza
```
GIVEN: Evidence con consumed = true
WHEN: Intenta validar para otra orden
THEN:
  ✅ validateIntegrityBeforeUse = { valid: false, reason: 'already consumed' }
  ✅ SeatbeltResult.allGatesPass = false
```

#### T7: Regresión TAREA 3 — DecisionAuditService sin interferencia
```
GIVEN: TAREA 3 + TAREA 4 integradas
WHEN: validateCheckpoint1() ejecuta
THEN:
  ✅ DecisionAuditTrail registrado
  ✅ PreExecutionEvidence registrado
  ✅ Ambos linked por trade_id
  ✅ Sin interferencia, flujo limpio
  ✅ TAREA 3 tests (25/25) siguen PASS
```

#### T8: validateFull (Gates 1-5) con TAREA 4
```
GIVEN: validateFull con gates 4,5 presentes
WHEN: Todos los gates PASS
THEN:
  ✅ Evidence registrada para gates 1,2,3,4,5
  ✅ gate4_result y gate5_result definidos
  ✅ all_gates_pass = true
  ✅ Integridad requiere todos 5 gates
```

### Totales
```
Nuevos tests: 8
Regresión (TAREA 3 + anteriores): 25
Total esperado: 33/33 PASS
```

---

## VIII. FAIL-CLOSED GUARANTEES (CAJA NEGRA V1)

### NUNCA
```
❌ Ejecutar sin evidencia registrada en BD
❌ Silenciar fallo de BD (todo error → allGatesPass=false)
❌ Reutilizar evidencia consumida
❌ Procesar evidencia expirada
❌ Continuar a gates posteriores si recordEvidence falla
```

### SIEMPRE
```
✅ Si recordEvidence() falla → BLOQUEA (no reintentos silenciosos)
✅ Si validateIntegrity() falla → BLOQUEA
✅ Si evidencia incompleta → BLOQUEA
✅ Log/Alert cada bloqueo para investigación
✅ Error ID generado para rastrabilidad
```

---

## IX. ROLLBACK PLAN (SI TAREA 4 FALLA)

```bash
# Opción 1: Revert cambios de TAREA 4
git checkout cp3-3-clean -- backend/src/modules/seatbelt/services/seatbelt.service.ts
git checkout cp3-3-clean -- backend/src/modules/seatbelt/services/seatbelt.service.spec.ts

# Verificar TAREA 3 vuelve a funcionar
npm test                          # 25/25 PASS (TAREA 3 + Gates 1-5)
npm run build                     # 0 errores TS

# Opción 2: Si algo muy mal, reset completo
git reset --hard cp3-3-clean
```

---

## X. TIMELINE ESTIMADO

| Fase | Tiempo | Notas |
|------|--------|-------|
| **Formalización especificación** | 15 min | Este documento |
| **Implementación seatbelt.service.ts** | 25 min | Inyección + 2 métodos nuevos |
| **Implementación seatbelt.service.spec.ts** | 35 min | 8 tests + setup |
| **Validación + Rollback prep** | 15 min | npm test, build, cleanup |
| **TOTAL** | **90 min** | ~1.5 horas |

---

## XI. CRITERIOS GO/NO-GO FINAL

### ✅ GO CUANDO:
```
1. 8/8 tests nuevos PASS
2. 25/25 regresión PASS (TAREA 3 + Gates 1-5)
3. Build limpio (0 errores TS)
4. No silent-fail: todo error → allGatesPass=false
5. Integridad verificada: Evidence coincide con Gate results
6. Fail-closed garantizado: sin Evidence, NO ejecuta
7. Rollback probado: cero datos residuales post-rollback
8. Caja Negra V1 implementada: evidencia + reportes + fail-closed + HOLD
```

### 🔴 NO-GO CUANDO:
```
1. Cualquier test falla
2. Regresión en TAREA 3 (DecisionAuditService)
3. Evidence guardada ≠ resultado de gates
4. BD falla sin mensaje claro o sin bloqueo (silent-fail)
5. Pérdida de trazabilidad posible
6. Circular dependency entre PreExecutionEvidenceService y SeatbeltService
7. Caja Negra V1 no está completa (falta evidencia, reportes o fail-closed)
```

---

## XII. PRESERVACIÓN DE ARQUITECTURA

### CP1 + CP2 + CP3 INTACTOS
```
✅ Gates 1-5: Sin cambios (solo consumidos)
✅ DecisionAuditService: Sin cambios (coexiste)
✅ PreExecutionEvidence entity: Sin cambios (consumida)
✅ SeatbeltService base: Extendido, no reemplazado
```

### NO INVADE TAREA 5+
```
✅ ExecutionEngine: Sin cambios (espera TAREA 5)
✅ OperationManager: Sin cambios (espera TAREA 5)
✅ Broker adapters: Sin cambios
✅ Se solo registra evidencia, no ejecuta
```

---

## XIII. RESUMEN RECONCILIACIÓN

### Pregunta Original
> ¿Qué es TAREA 4? ¿Pre-Execution Evidence? ¿SEATBELT Orchestration? ¿Contradicción?

### Respuesta
```
TAREA 4 = Pre-Execution Evidence Recording

Qué es:
  - Especialización de SEATBELT Orchestration
  - Añade capa de persistencia de evidencia
  - Completa intención de Caja Negra V1

Qué implementa:
  1. Registrar evidencia de CADA gate
  2. Validar integridad (¿completa?)
  3. Fail-closed si algo falla
  4. Trazabilidad 100% (decisión → evidencia → ejecución)

No es contradicción. Es extensión necesaria.
```

---

## XIV. DECISIÓN FINAL

**¿Autorizar TAREA 4 con esta especificación formal?**

- ✅ **GO** → Implementar con disciplina exacta (sin cambios)
- 🔴 **NO-GO** → Requiere ajustes (especificar cuáles)
- 🟡 **HOLD** → Necesita revisión adicional (punto específico)

---

**ESTADO:** 🔒 **ESPECIFICACIÓN FORMAL CONGELADA**

*Sin código. Sin commit. Sin implementación. Especificación formal y verificable.*

---

**Fecha Finalización:** 2026-09-13 11:43 ET  
**Preparado por:** Claude Haiku 4.5  
**Para decisión:** Jay + Víctor  
**Basado en:** Inspección exhaustiva + planes anteriores + Caja Negra V1

