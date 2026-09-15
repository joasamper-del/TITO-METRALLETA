# TAREA 4 — PLAN COMPLETO DETALLADO

**Fecha:** 2026-09-13 11:36 ET  
**Estado:** 🔍 **INSPECCIÓN EXHAUSTIVA** (sin código, sin commit, sin implementación)  
**Disciplina:** Entender → Inspeccionar → Autorizar → Implementar

---

## I. OBJETIVO FINAL

**Integrar PreExecutionEvidenceService** para que ANTES de que OperationManager ejecute una orden:
1. Se registre evidencia de CADA gate (5 resultados)
2. Se valide que la evidencia está completa y vigente
3. Se bloquee la ejecución si algo falta o es inválido
4. Se cree un registro persistente e inmutable para auditoría

**Garantiza:** `decisión (TASK 3) → evidencia (TASK 4) → ejecución → resultado`

---

## II. FLUJO EVENTO POR EVENTO

### CASO 1: Flujo Normal (Todos los gates PASAN)

#### Evento 1: OperationManager llama validateCheckpoint1()
```
INPUT: order, account, currentMarket, config, tradeId
ACCIÓN: SeatbeltService.validateCheckpoint1() inicia
```

#### Evento 2: Registra DecisionAuditTrail (TASK 3)
```
ACCIÓN: await decisionAudit.recordDecision({
  symbol: 'BTC',
  decision: 'SEATBELT_CHECKPOINT1_INITIATED',
  timestamp: 2026-09-13T11:36:00Z,
  ...
})
RESULTADO BD: INSERT into decision_audit_trail VALUES (...)
STATUS: ✅ id='DAT-123'
```

#### Evento 3: Valida Gate1 (Market Health)
```
ACCIÓN: await gate1.validate('BTC')
RESULTADO: { valid: true, reason: 'Market healthy', gate: 'gate1' }
```

#### Evento 4: NUEVO - Registra Evidence Gate1 (TASK 4)
```
ACCIÓN: await preExecutionEvidence.recordEvidence({
  trade_id: 'BTC_20260913_0001',
  gate: 'gate1',
  gate1_result: { valid: true, reason: 'Market healthy' },
  timestamp: 2026-09-13T11:36:01Z
})
RESULTADO BD: INSERT into pre_execution_evidence (gate1_result) VALUES (...)
STATUS: ✅ evidenceId='PEE-456'
```

#### Evento 5: Valida Gate2 (Risk Boundary)
```
ACCIÓN: await gate2.validate(order, account, config)
RESULTADO: { valid: true, reason: 'Risk OK', gate: 'gate2' }
```

#### Evento 6: NUEVO - Registra Evidence Gate2
```
ACCIÓN: await preExecutionEvidence.recordEvidence({
  trade_id: 'BTC_20260913_0001',
  gate: 'gate2',
  gate2_result: { valid: true, reason: 'Risk OK' },
  timestamp: 2026-09-13T11:36:02Z
})
RESULTADO BD: UPDATE pre_execution_evidence SET gate2_result=... WHERE trade_id='...'
STATUS: ✅
```

#### Evento 7: Valida Gate3 (Decision Audit)
```
ACCIÓN: await gate3.validate(order, tradeId, currentMarket)
RESULTADO: { valid: true, reason: 'Decision OK', gate: 'gate3' }
```

#### Evento 8: NUEVO - Registra Evidence Gate3 + Integridad
```
ACCIÓN: await preExecutionEvidence.recordEvidence({
  trade_id: 'BTC_20260913_0001',
  gate: 'gate3',
  gate3_result: { valid: true, reason: 'Decision OK' },
  all_gates_pass: true,  // ← Se calcula aquí
  timestamp: 2026-09-13T11:36:03Z
})

VALIDACIÓN DE INTEGRIDAD:
- gate1_result.valid === true ✅
- gate2_result.valid === true ✅
- gate3_result.valid === true ✅
- all_gates_pass = true
- valid_until = now + 5 minutes ✅

RESULTADO BD: UPDATE pre_execution_evidence SET gate3_result=..., all_gates_pass=true
STATUS: ✅ Evidence complete
```

#### Evento 9: NUEVO - Verifica que Evidencia está Completa
```
ACCIÓN: await preExecutionEvidence.validateIntegrityBeforeUse('BTC_20260913_0001')

VALIDACIONES:
1. ¿Existe registro? ✅
2. ¿gate1_result definido? ✅
3. ¿gate2_result definido? ✅
4. ¿gate3_result definido? ✅
5. ¿all_gates_pass === true? ✅
6. ¿valid_until > now? ✅ (2026-09-13T11:41:00Z > 2026-09-13T11:36:03Z)
7. ¿consumed === false? ✅ (not used yet)

RESULTADO: { valid: true, reason: 'All evidence valid' }
STATUS: ✅ Cleared for execution
```

#### Evento 10: Retorna SeatbeltResult (TASK 4 completo)
```
RETURN:
{
  allGatesPass: true,
  gates: [ gate1Result, gate2Result, gate3Result ],
  reason: 'All gates pass',
  timestamp: 2026-09-13T11:36:03Z,
  evidenceId: 'PEE-456'  // NUEVO - referencia a BD
}
```

#### Evento 11: OperationManager recibe OK, inicia ejecución
```
ACCIÓN: if (seatbeltResult.allGatesPass) {
  await operationManager.executeOrder(order, evidenceId)
}
```

#### Evento 12: NUEVO - Marca evidencia como consumida (post-ejecución)
```
ACCIÓN: await preExecutionEvidence.markAsConsumed('PEE-456')
RESULTADO BD: UPDATE pre_execution_evidence SET consumed=true, updated_at=now
STATUS: ✅ Evidence marked as used
```

---

### CASO 2: Gate Falla (Early Exit sin evidencia)

#### Evento A: Registra DecisionAuditTrail ✅
```
ACCIÓN: await decisionAudit.recordDecision({...})
RESULTADO: id='DAT-123' ✅
```

#### Evento B: Valida Gate1 ✅
```
RESULTADO: { valid: true } ✅
```

#### Evento C: Registra Evidence Gate1 ✅
```
ACCIÓN: await preExecutionEvidence.recordEvidence({
  trade_id: 'BTC_20260913_0001',
  gate1_result: { valid: true }
})
RESULTADO: ✅
```

#### Evento D: Valida Gate2 ❌ FALLA
```
RESULTADO: { valid: false, reason: 'Position too large', gate: 'gate2' }
```

#### Evento E: NUEVO - Registra Evidence Gate2 con resultado negativo
```
ACCIÓN: await preExecutionEvidence.recordEvidence({
  trade_id: 'BTC_20260913_0001',
  gate: 'gate2',
  gate2_result: { valid: false, reason: 'Position too large' },
  all_gates_pass: false  // ← Inmediato, no espera gate3
})
RESULTADO: ✅ (registra el fallo)
```

#### Evento F: EARLY EXIT - No valida Gate3
```
ACCIÓN: return {
  allGatesPass: false,
  gates: [ gate1Result, gate2Result ],  // Gate3 nunca se ejecutó
  reason: 'Gates failed: gate2',
  evidenceId: 'PEE-456'
}
```

#### Evento G: OperationManager rechaza ejecución
```
ACCIÓN: if (!seatbeltResult.allGatesPass) {
  LOG('Seatbelt blocked: ' + reason)
  RETURN  // No ejecuta
}
```

#### Evento H: NUEVO - Evidencia queda pendiente (no consumida)
```
STATUS: pre_execution_evidence.consumed = false
COMPORTAMIENTO:
- Si se intenta ejecutar con esta evidencia → rechaza (no está completa)
- Limpiador (cleanup job) la marca como expirada después de 5 minutos
- Auditoría puede revisar por qué se bloqueó
```

---

### CASO 3: Recording de Evidence Falla (BD inaccesible)

#### Evento X1: Registra DecisionAuditTrail ✅
```
RESULTADO: id='DAT-123' ✅
```

#### Evento X2: Valida Gate1 ✅
```
RESULTADO: { valid: true } ✅
```

#### Evento X3: Intenta registrar Evidence Gate1 ❌
```
ACCIÓN: await preExecutionEvidence.recordEvidence({...})
ERROR: TimeoutError: Connection to database failed after 5s
```

#### Evento X4: NUEVO - Comportamiento ante pérdida de trazabilidad
```
OPCIÓN A (FAIL-CLOSED): ❌ Bloquea inmediatamente
  - ACCIÓN: catch(error) → return { allGatesPass: false, reason: 'Cannot record evidence' }
  - EFECTO: Trade NO ejecuta
  - SEGURIDAD: ✅ Máxima (prefiere no operar a operar sin auditoría)

OPCIÓN B (RETRY): ⏱️ Reintentar 3× con backoff
  - ACCIÓN: await retryWithBackoff(recordEvidence, {maxAttempts: 3, delayMs: 100})
  - EFECTO: Espera a que BD se recupere
  - RIESGO: Si BD no se recupera en 30s, igual falla

OPCIÓN C (FALLBACK): ⚠️ Ejecutar sin persistencia (PROHIBIDO)
  - ACCIÓN: Si recordEvidence falla, ejecutar igual pero log warning
  - RIESGO: Pierde trazabilidad, viola SEATBELT

RECOMENDACIÓN: OPCIÓN A (FAIL-CLOSED)
  - Por qué: TAREA 4 es sobre garantizar trazabilidad. Sin trazabilidad, no ejecutamos.
```

#### Evento X5: Retorna Error
```
RETURN:
{
  allGatesPass: false,
  gates: [],
  reason: 'Failed to record pre-execution evidence - BD timeout',
  timestamp: 2026-09-13T11:36:05Z,
  errorId: 'ERR-789'  // NUEVO - para investigación
}
```

#### Evento X6: OperationManager rechaza
```
ACCIÓN: if (!seatbeltResult.allGatesPass) { RETURN }
RESULTADO: Orden NO se ejecuta, se logea el error
```

---

## III. CRITERIOS PASS/FAIL/HOLD

### ✅ PASS (Ejecutar la orden)
```
✅ AND condición1: DecisionAuditTrail registrado sin error
✅ AND condición2: Gate1 PASS + Evidence1 registrada
✅ AND condición3: Gate2 PASS + Evidence2 registrada
✅ AND condición4: Gate3 PASS + Evidence3 registrada
✅ AND condición5: validateIntegrityBeforeUse() retorna valid=true
✅ AND condición6: all_gates_pass = true en BD
✅ AND condición7: valid_until > now (evidencia no expirada)
✅ AND condición8: consumed = false (evidencia no ya usada)

RESULTADO: SeatbeltResult.allGatesPass = true
ACCIÓN: OperationManager.executeOrder(evidenceId)
```

### ❌ FAIL (NO ejecutar)
```
❌ SI: Algún gate.valid = false
❌ SI: recordEvidence() falla (BD timeout, etc.)
❌ SI: validateIntegrityBeforeUse() retorna valid=false
❌ SI: Evidence incompleta (falta gate1_result, gate2_result, etc.)
❌ SI: Evidence expirada (valid_until < now)
❌ SI: Evidence ya consumida (consumed = true)
❌ SI: DecisionAuditTrail no existe

RESULTADO: SeatbeltResult.allGatesPass = false
ACCIÓN: Log reason, NO ejecutar orden
```

### 🟡 HOLD (Reintentar o revisar manual)
```
🟡 SI: Gate3 tarda >10s en responder
  - ACCIÓN: HOLD por 5s, reintentar 1×
  - SI sigue tardando: FAIL (timeout)

🟡 SI: Evidence parcialmente registrada (gate1 ✅, gate2 ❌)
  - ACCIÓN: HOLD, intentar completar gate2
  - SI timeout: FAIL, descartar evidencia parcial

🟡 SI: MarketState cambió significativamente (±5%) desde Gate1
  - ACCIÓN: HOLD, revalidar gates
  - SI alguno falla: FAIL
```

---

## IV. PÉRDIDA DE TRAZABILIDAD — Comportamiento Crítico

### Escenario: ¿Qué pasa si se pierden los registros de evidence?

#### Entrada: Intenta ejecutar sin evidencia
```
INPUT: OperationManager.executeOrder(tradeId='BTC_20260913_0001')
ACCIÓN: Busca pre_execution_evidence para este trade
RESULTADO: SELECT * FROM pre_execution_evidence WHERE trade_id='...' → EMPTY
```

#### Decisión: FAIL-CLOSED
```
SI (evidenceId is null OR evidence.consumed = true OR evidence.valid_until < now):
  RETURN {
    allowed: false,
    reason: 'Cannot execute: pre-execution evidence missing or invalid',
    tradeId: '...',
    timestamp: now
  }
```

#### Efecto: Order NO se ejecuta
```
- LOG: WARNING "Execution blocked: missing evidence for trade BTC_20260913_0001"
- ALERT: "Missing audit trail - investigate"
- ESCALATE: Requiere revisión manual antes de poder ejecutar
```

#### Auditoría: Rastro disponible
```
- DecisionAuditTrail.id='DAT-123' ✅ (TASK 3)
- PreExecutionEvidence.id='PEE-456' ?? (lost)
- Gap: entre decisión y ejecución

INVESTIGACIÓN:
- ¿Por qué se perdió la evidencia?
- ¿Fallo de BD? ¿Limpieza errónea? ¿Bug?
- Acción correctiva ANTES de permitir nuevos trades
```

---

## V. PRUEBAS ESPECÍFICAS

### Test Suite: PreExecutionEvidenceService Integration

#### T1: Evidencia se registra para CADA gate
```
GIVEN: validateCheckpoint1() completa con gates 1,2,3 PASS
WHEN: Todos los gates ejecutan correctamente
THEN:
  ✅ preExecutionEvidence.recordEvidence llamado 3× (gate1, gate2, gate3)
  ✅ Cada call contiene el resultado correcto del gate
  ✅ BD contiene 1 registro con:
     - gate1_result.valid = true
     - gate2_result.valid = true
     - gate3_result.valid = true
     - all_gates_pass = true
     - valid_until > now + 4:59
```

#### T2: Si recordEvidence falla, BLOQUEA (no silent-fail)
```
GIVEN: Gate1 PASS, intenta registrar Evidence1
WHEN: BD timeout (recordEvidence retorna error)
THEN:
  ✅ SeatbeltResult.allGatesPass = false
  ✅ reason contains "Cannot record evidence"
  ✅ Gates 2,3 NUNCA se ejecutan (early exit)
  ✅ OperationManager rechaza (no ejecuta)
  ✅ Log/Alert generado para investigación
```

#### T3: Integridad — Evidence coincide con Gate results
```
GIVEN: Gate2 retorna { valid: false, reason: 'Risk too high' }
WHEN: Evidence se registra
THEN:
  ✅ evidencia.gate2_result.valid = false
  ✅ evidencia.gate2_result.reason = 'Risk too high'
  ✅ Coincidencia EXACTA, no transformación
  ✅ all_gates_pass = false (inmediato, no espera gate3)
```

#### T4: validateIntegrityBeforeUse valida completitud
```
GIVEN: Evidence registrada para gates 1,2,3
WHEN: Llama validateIntegrityBeforeUse('trade-id')
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
GIVEN: Evidence registrada con valid_until = 2026-09-13T11:36:00Z
WHEN: Ahora = 2026-09-13T11:42:00Z (después de 6 minutos)
THEN:
  ✅ validateIntegrityBeforeUse retorna { valid: false, reason: 'Evidence expired' }
  ✅ SeatbeltResult.allGatesPass = false
  ✅ OperationManager rechaza
```

#### T6: Evidence consumida no se reutiliza
```
GIVEN: Evidence registrada y marked as consumed=true
WHEN: Intenta ejecutar otra orden con same evidenceId
THEN:
  ✅ validateIntegrityBeforeUse retorna { valid: false, reason: 'Evidence already consumed' }
  ✅ SeatbeltResult.allGatesPass = false
```

#### T7: Regresión TASK 3 — DecisionAuditService sigue funcionando
```
GIVEN: TASK 3 + TASK 4 integrados
WHEN: validateCheckpoint1() ejecuta
THEN:
  ✅ DecisionAuditTrail registrado
  ✅ PreExecutionEvidence registrado
  ✅ Ambos linked por trade_id
  ✅ Sin interferencia, flujo limpio
  ✅ TASK 3 tests (25/25) siguen PASS
```

#### T8: validateFull (Gates 1-5) con TASK 4
```
GIVEN: validateFull con gates 4,5 presentes
WHEN: Todos los gates PASS
THEN:
  ✅ Evidence registrada para gate1, gate2, gate3, gate4, gate5
  ✅ Evidence.gate4_result definido
  ✅ Evidence.gate5_result definido
  ✅ all_gates_pass = true
  ✅ Validación completitud requiere todos 5 gates
```

**Total tests:** 8 (nuevos)  
**Total regresión:** 25 (TASK 3 + anteriores)  
**Total esperado:** 33/33 PASS

---

## VI. PRESERVACIÓN: Fail-Closed y Rollback

### Fail-Closed Guarantees
```
❌ NUNCA:
  - Ejecutar sin evidencia registrada
  - Silenciar fallo de BD (todo error → allGatesPass=false)
  - Reutilizar evidencia consumida
  - Procesar evidencia expirada

✅ SIEMPRE:
  - Si recordEvidence() falla → BLOQUEA (no reintentos silenciosos)
  - Si validateIntegrity() falla → BLOQUEA
  - Si evidencia incompleta → BLOQUEA
  - Log/Alert cada bloqueo para investigación
```

### Rollback Plan (SI TASK 4 falla)
```
git checkout cp3-3-clean -- backend/src/modules/seatbelt/
git checkout cp3-3-clean -- backend/src/modules/seatbelt/services/seatbelt.service.ts
git checkout cp3-3-clean -- backend/src/modules/seatbelt/services/seatbelt.service.spec.ts

npm test                          # Verificar TASK 3 (25/25) vuelve a PASS
npm run build                     # Compilación limpia
git log --oneline -3              # Verificar commit d53a8a8 (TASK 3) es HEAD
```

---

## VII. TIMELINE ESTIMADO

| Fase | Tiempo | Notas |
|------|--------|-------|
| Inspección + Planificación | 15 min | Este documento |
| Implementación seatbelt.service.ts | 25 min | Inyección + 2 métodos |
| Implementación seatbelt.module.ts | 5 min | ImportDatabase |
| Tests (8 nuevos + setup) | 35 min | Mocks de PreExecutionEvidenceService |
| Validación + Rollback prep | 15 min | npm test, build, git cleanup |
| **TOTAL** | **95 min** | ~1.5 horas |

---

## VIII. CRITERIOS GO/NO-GO FINAL

### ✅ GO CUANDO:
1. 8/8 tests nuevos PASS
2. 25/25 regresión PASS (TASK 3 + anteriores)
3. Build limpio (0 errores TS)
4. No silent-fail: todo error → allGatesPass=false
5. Integridad verificada: Evidence coincide con Gate results
6. Fail-closed garantizado: sin Evidence, NO ejecuta
7. Rollback probado: cero datos residuales post-rollback

### 🔴 NO-GO CUANDO:
1. Cualquier test falla
2. Regresión en TASK 3 o tests previos
3. Evidence guardada ≠ resultado de gates
4. BD falla sin mensaje claro o sin bloqueo
5. Silent-fail detectado (algo se ejecuta sin evidencia)
6. Pérdida de trazabilidad posible (ej: consumed no se verifica)
7. Circular dependency entre PreExecutionEvidenceService y SeatbeltService

---

## IX. DECISIÓN FINAL

**¿Proceder con TASK 4 = Pre-Execution Evidence Recording?**

- Objetivo: ✅ Claro (registrar evidencia de gates, validar integridad)
- Flujo: ✅ Detallado (evento por evento, casos edge incluidos)
- Pérdida trazabilidad: ✅ Manejada (fail-closed)
- Pruebas: ✅ Especificadas (8 tests, criterios claros)
- Rollback: ✅ Definido
- Timeline: ✅ Realista (~1.5 horas)

---

## X. PRÓXIMO PASO

**¿AUTORIZO IMPLEMENTACIÓN DE TASK 4?**

- ✅ **SÍ** → Ejecutar plan con disciplina exacta (sin cambios)
- 🔴 **NO** → Qué revisar o ajustar
- 🟡 **AJUSTE** → Precisar algo específico (ej: timeout de BD, retry logic)

---

**ESTADO:** 🔍 **INSPECCIÓN EXHAUSTIVA COMPLETADA**

*Sin código. Sin commit. Sin implementación. Plan detallado y verificable.*

---

**Fecha Finalización Plan:** 2026-09-13 11:40 ET  
**Preparado por:** Claude Haiku 4.5  
**Para:** Víctor + Jay (decisión final para autorizar)
