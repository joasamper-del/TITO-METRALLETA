---
name: plan_maestro_caja_negra_v1
description: "Plan maestro de implementación Caja Negra V1 — Fases, GO/NO-GO, evidencia, fronteras, autorización"
metadata:
  type: project
  status: 🟡 PLAN MAESTRO — SIN CÓDIGO — PARA AUDITORÍA VÍCTOR
  date: 2026-09-13
  author: Claude Haiku 4.5
  baseline: commit 44d4086 (Tarea 5 CLOSED)
---

# PLAN MAESTRO: CAJA NEGRA V1

**Status:** 🟡 DOCUMENTADO — PARA AUDITORÍA CONJUNTA (Víctor + Claude)  
**Baseline Commit:** `44d4086` (Tarea 5 CLOSED)  
**Requisitos:** R1-R33 (24 INDISPENSABLE + 5 OBLIGATORIO + 4 DESEABLE)  
**Objetivo:** Caja Negra V1 COMPLETE = 24 INDISPENSABLE PASS + 4/5 OBLIGATORIO PASS  

---

## MAPA DE DEPENDENCIAS (24 INDISPENSABLES)

```
FASE 1: ESPECIFICACIÓN + BASES
├─ R1 (Spec Tarea 6)
├─ R9 (Definición eventos)
└─ R21 (Schema JSON)

FASE 2: IMPLEMENTACIÓN TAREA 6
├─ R2 (Impl LiquidityGate) ← R1
├─ R4 (Flag "no fiables") ← R1, R2
├─ R6, R7, R8 (Tests) ← R1, R2
└─ R5 (Integration SEATBELT) ← R2

FASE 3: CAPTURA AUTOMÁTICA EVENTOS
├─ R10 (Captura contexto) ← R9
├─ R11, R12, R13, R16 (Eventos específicos) ← R10
├─ R17 (Consolidación) ← R10-R16
├─ R18 (Generación reporte) ← R17
└─ R19 (Timestamping µs) ← R10-R18

FASE 4: INFRAESTRUCTURA + STORAGE
├─ R22 (Escritura atómica) ← R20, R21
├─ R20 (Storage JSONL) ← R22
└─ R25, R26, R27 (Validación) ← R18, R22

FASE 5: VALIDACIÓN E2E
├─ R31 (E2E liquidez OK) ← R1-R8, R9-R20
├─ R32 (E2E liquidez FAIL) ← R1-R8, R9-R20, R5
└─ R33 (Reproducibilidad) ← R9-R20, R25-R27

FUERA DEL CAMINO CRÍTICO (salvo dependencia):
├─ R3 (Comparativa 5 líderes) — OBLIGATORIO
├─ R14, R15 (Daily Summary, No-Op) — OBLIGATORIO
├─ R23 (Lectura indexada) — OBLIGATORIO
├─ R28 (Manual eventos) — OBLIGATORIO
└─ R24, R29, R30 (Deseable) — V2+
```

---

## FASES DETALLADAS DE IMPLEMENTACIÓN

### FASE 1: ESPECIFICACIÓN + INFRAESTRUCTURA BASE
**Duración estimada:** 6-8 horas  
**Objetivo:** Documentar qué se va a construir, antes de construirlo  
**Criterio GO:** Specs + schema están en code review

---

#### FASE 1.1: Especificación Tarea 6 (R1)
**Qué se implementa:** Documento S70_TAREA6_SPECIFICATION.md  
**Criterio GO:**
- ✅ Criterios de liquidez documentados
- ✅ 6 casos numéricos (C1-C6) definidos
- ✅ 5+ anti-patterns (A1-A5) enumerados
- ✅ Integración con SEATBELT Gate 3 especificada
- ✅ Documento aprobado por Víctor

**Criterio NO-GO:**
- ❌ Ambigüedad en definición de "liquidez"
- ❌ Fórmulas contradictorias
- ❌ Falta integración SEATBELT

**Evidencia de cierre:**
- Pull request con spec completa
- Feedback Víctor: "Aprobado" o "Ajustes menores"
- Documento en repo

**Frontera:** NO implementar código Tarea 6 en esta fase

**Autorización requerida:** Víctor (revision spec)

---

#### FASE 1.2: Definición exhaustiva eventos (R9)
**Qué se implementa:** Documento: lista 15+ eventos clave + contexto requerido cada uno  
**Criterio GO:**
- ✅ Eventos enumerados: Trade Close, Order Fail, Loss of Traceability, Daily Summary, No-Op, Critical Anomaly, (9 más)
- ✅ Cada evento con: disparador, contexto requerido, timestamp, ejemplo JSON
- ✅ Interdependencias entre eventos claras
- ✅ Integración con SEATBELT/Guardian identificada

**Criterio NO-GO:**
- ❌ Evento sin contexto requerido claro
- ❌ Falta integración con sistemas existentes
- ❌ Timestamp sin precisión especificada

**Evidencia de cierre:**
- Documento completo (3+ páginas)
- Matriz eventos vs contexto
- Feedback Víctor: "Listo para implementar"

**Frontera:** NO definir formato JSON aún (eso es R21)

**Autorización requerida:** Víctor (review eventos)

---

#### FASE 1.3: Schema JSON eventos (R21)
**Qué se implementa:** TypeScript interfaces + JSON Schema (no generado aún, solo tipos)  
**Criterio GO:**
- ✅ EventBase interface definida (timestamp, type, context)
- ✅ Interfaces específicas: TradeCloseEvent, OrderFailEvent, etc.
- ✅ JSON Schema compilable sin errores
- ✅ Schema valida contra ejemplos R9

**Criterio NO-GO:**
- ❌ Schema incompatible con contexto definido en R9
- ❌ Campo requerido falta
- ❌ Errores TypeScript

**Evidencia de cierre:**
- Archivos `event.types.ts` + `event.schema.json` sin errores
- npm build: ✅ Clean
- Test: jsonschema.validate(example, schema) → PASS

**Frontera:** NO generar eventos todavía, solo tipos

**Autorización requerida:** Claude code review (tipos TS)

---

### FASE 2: TAREA 6 — EVALUACIÓN DE LIQUIDEZ
**Duración estimada:** 8-10 horas  
**Objetivo:** Implementar y validar `LiquidityGate` + tests  
**Criterio GO:** 33/33 tests PASS (20 funcionales + 13 fail-closed)

---

#### FASE 2.1: Implementación LiquidityGate (R2)
**Qué se implementa:** `backend/src/modules/liquidity/liquidity.service.ts`  
**Criterio GO:**
- ✅ Función `evaluateLiquidity(input: SegmentationData) → LiquidityGate`
- ✅ Comparación vs 5 líderes (si R3 ya implementado) o stub
- ✅ Fail-closed: NULL/false si dato falta
- ✅ Mensaje claro en `.reason`

**Criterio NO-GO:**
- ❌ Función asume datos (no null-safe)
- ❌ Regresión en CP1/CP2/CP3
- ❌ Compilación con errores TS

**Evidencia de cierre:**
- npm build: ✅
- npm lint: ✅ zero errors en liquidity/
- Archivo existente en repo

**Frontera:** NO integrar SEATBELT aún (eso es R5)

**Autorización requerida:** Víctor (implementación correcta)

---

#### FASE 2.2: Flag "datos no fiables" (R4)
**Qué se implementa:** Lógica dentro `evaluateLiquidity`: si disparidad > 40% O liquidez < 60% → `{pass: false, reason: "Liquidez insuficiente"}`  
**Criterio GO:**
- ✅ Flag generado correctamente con umbral exacto
- ✅ Mensaje claro y accionable
- ✅ Tests validan umbrales exactos (39% PASS, 41% FAIL)

**Criterio NO-GO:**
- ❌ Umbral hardcodeado sin configurable
- ❌ Mensaje ambiguo
- ❌ No fail-closed si falta comparativa

**Evidencia de cierre:**
- Test: 40% disparidad → PASS; 41% → FAIL
- Test: 61% liquidez → PASS; 59% → FAIL

**Frontera:** NO cambiar umbrales sin Víctor

**Autorización requerida:** Víctor (umbrales de riesgo)

---

#### FASE 2.3: Tests Tarea 6 — C1-C6 (R6)
**Qué se implementa:** 6 casos numéricos exactos (similar a Tarea 5)  
**Criterio GO:**
- ✅ C1: OI=100k, premium=$50k, 5d avg=$48k → disparidad 4% PASS
- ✅ C2-C6: Casos reales SPY/QQQ/TSLA, fórmulas exactas
- ✅ npm test → C1-C6 PASS

**Criterio NO-GO:**
- ❌ Test usa mock en vez de función real
- ❌ Aritmética inexacta (±0.01% tolerancia máximo)
- ❌ Caso no verificable vs histórico real

**Evidencia de cierre:**
- Test output: "C1-C6: 6/6 PASS"
- Cada test con comentario: esperado vs resultado actual

**Frontera:** NO agregar casos nuevos sin Víctor (cambia cobertura)

**Autorización requerida:** Claude (test review)

---

#### FASE 2.4: Tests Tarea 6 — A1-A7 anti-patterns (R7)
**Qué se implementa:** 7 validaciones: confundir liquidez con precio, no fail-closed, hardcodes, etc.  
**Criterio GO:**
- ✅ A1: Input falta → no crash
- ✅ A2-A7: Otros anti-patterns capturados
- ✅ npm test → A1-A7 PASS

**Criterio NO-GO:**
- ❌ Anti-pattern no detectado por test
- ❌ Test pasa pero código tiene bug
- ❌ Menos de 7 validaciones

**Evidencia de cierre:**
- Test output: "A1-A7: 7/7 PASS"
- Cada test aislado (no interdependencias)

**Frontera:** NO modificar tests sin Víctor si tiene impacto en seguridad

**Autorización requerida:** Víctor (seguridad)

---

#### FASE 2.5: Fail-closed Tarea 6 (R8)
**Qué se implementa:** Validación exhaustiva: si OI=null → FAIL, si premium=null → FAIL, si histórico falta → "no fiable"  
**Criterio GO:**
- ✅ 20+ tests fall-closed, todos PASS
- ✅ Cero unhandled exceptions
- ✅ npm test → 100% PASS

**Criterio NO-GO:**
- ❌ Exception no capturada
- ❌ Valor asumido sin validación
- ❌ Regresión en happy path

**Evidencia de cierre:**
- Test coverage report: 100% en liquidity.service.ts
- npm test: todas ramas cubiertas

**Frontera:** NO asumir valores, siempre fail-closed

**Autorización requerida:** Claude (seguridad)

---

#### FASE 2.6: Integration SEATBELT Gate 3 (R5)
**Qué se implementa:** Modificar SEATBELT Gate 3: `if (liquidityGate.pass === false) return HOLD`  
**Criterio GO:**
- ✅ Route `POST /analyze` con cadena no fiable → Gate 3 HOLD
- ✅ Mensaje HOLD incluye razón liquidez
- ✅ npm test de Gate 3: PASS

**Criterio NO-GO:**
- ❌ Integration rota otros gates
- ❌ Regresión en análisis operativo
- ❌ Test de Gate 3 falla

**Evidencia de cierre:**
- Test: POST /analyze (no fiable) → status HOLD + reason "Liquidez"
- SEATBELT tests: todos pasan

**Frontera:** NO cambiar lógica otros gates

**Autorización requerida:** Víctor (cambio crítico)

---

### FASE 3: SISTEMA DE EVENTOS AUTOMÁTICOS
**Duración estimada:** 12-16 horas  
**Objetivo:** Captura + consolidación + generación de reportes  
**Criterio GO:** Eventos capturables, consolidables, reporteables

---

#### FASE 3.1: Captura automática contexto (R10)
**Qué se implementa:** Función `captureEventContext(event: EventType) → ContextSnapshot`  
**Criterio GO:**
- ✅ Captura en el momento del evento, no después
- ✅ Contexto: {timestamp µs, spot, griegos, OI, IV, reason, state}
- ✅ Timestamp verificable vs mercado (Alpaca API)
- ✅ npm test: captura correcta

**Criterio NO-GO:**
- ❌ Captura tardía (>100ms después evento)
- ❌ Timestamp fake o no verificable
- ❌ Contexto incompleto (falta campo)
- ❌ Exception en captura

**Evidencia de cierre:**
- Function implementada, compilable
- Test: evento dispara → captura dentro 100ms
- Timestamp dentro 1µs del evento real

**Frontera:** NO modificar mercado data en captura

**Autorización requerida:** Claude (timing crítico)

---

#### FASE 3.2-3.5: Eventos específicos (R11-R13, R16)
**Qué se implementa:** Trade Close, Order Fail, Loss of Traceability, Critical Anomaly  
**Criterio GO POR EVENTO:**
- ✅ Disparador identificado
- ✅ Contexto completamente capturado
- ✅ JSON valida contra schema R21
- ✅ Test: disparo automático

**Criterio NO-GO:**
- ❌ Evento manual (debe ser automático)
- ❌ Contexto falta
- ❌ JSON inválido contra schema

**Evidencia de cierre:**
- 4 eventos implementados (R11, R12, R13, R16)
- Cada uno con test disparando automáticamente
- npm test: 4/4 eventos PASS

**Frontera:** NO forzar eventos manualmente

**Autorización requerida:** Víctor (c/evento crítico)

---

#### FASE 3.6: Consolidación + Generación (R17, R18)
**Qué se implementa:** Post-captura: consolidar contexto en reporte JSON estructurado  
**Criterio GO:**
- ✅ Función `consolidateAndGenerateReport(snapshots[]) → EventReport`
- ✅ Reporte incluye: timestamp, event_type, context, decision, reason, evidence
- ✅ JSON valida contra schema
- ✅ Formateado consistentemente

**Criterio NO-GO:**
- ❌ Campo requerido falta
- ❌ JSON inválido
- ❌ Formato inconsistente entre eventos

**Evidencia de cierre:**
- Función implementada
- Test: captura → consolidación → reporte (end-to-end dentro R10-R18)
- npm test: PASS

**Frontera:** NO cambiar format JSON sin esquema

**Autorización requerida:** Claude (format)

---

#### FASE 3.7: Timestamping µs (R19)
**Qué se implementa:** Validación: todos artefactos (captura, consolidación, reporte) con timestamp ≤ 1µs del evento  
**Criterio GO:**
- ✅ Captura timestamp: ≤ 1µs vs evento
- ✅ Reporte timestamp: ≤ 1µs vs captura
- ✅ Audit trail verificable vs Alpaca API
- ✅ npm test: timestamp validado

**Criterio NO-GO:**
- ❌ Timestamp > 1µs diff vs evento real
- ❌ Timestamp fake
- ❌ No verificable

**Evidencia de cierre:**
- Test: evento tiempo T → captura timestamp T ±0.001ms
- Alpaca API check: timestamp vs real trade timestamp

**Frontera:** NO aceptar timestamps sin validación

**Autorización requerida:** Víctor (auditoría crítica)

---

### FASE 4: INFRAESTRUCTURA + ALMACENAMIENTO
**Duración estimada:** 6-8 horas  
**Objetivo:** Persistir eventos duraderamente, recuperables 12 meses  
**Criterio GO:** JSONL almacenado, indexado, validado

---

#### FASE 4.1: Storage JSONL (R20)
**Qué se implementa:** `data/events/{YYYYMMDD}.jsonl` con eventos por línea  
**Criterio GO:**
- ✅ Directorio creado
- ✅ Un `.jsonl` por día
- ✅ Eventos append-only (no truncado)
- ✅ Recuperable 12 meses atrás

**Criterio NO-GO:**
- ❌ Archivo truncado
- ❌ No recuperable
- ❌ Permiso insuficiente

**Evidencia de cierre:**
- `data/events/20260913.jsonl` existe con eventos
- Test: append evento → verificar en archivo
- Test: leer evento almacenado 30 días atrás

**Frontera:** NO modificar eventos almacenados (solo append)

**Autorización requerida:** Claude (persistencia)

---

#### FASE 4.2: Escritura atómica (R22)
**Qué se implementa:** Validación: si crash mid-write, no se corrompe archivo  
**Criterio GO:**
- ✅ Usa temp file + rename atómico
- ✅ Test: simula crash → verificar integridad
- ✅ npm test: PASS

**Criterio NO-GO:**
- ❌ Archivo truncado si crash
- ❌ JSONL inválido (línea incompleta)
- ❌ Evento perdido

**Evidencia de cierre:**
- Test crash simulado → integridad verificada
- npm test: atomicity PASS

**Frontera:** NO escribir directo al destino

**Autorización requerida:** Claude (seguridad)

---

#### FASE 4.3-4.4: Validación (R25, R26, R27)
**Qué se implementa:** Checksum + completitud + rango de valores  
**Criterio GO:**
- ✅ R25: SHA256 por evento almacenado
- ✅ R26: Checksum reporte (CRC32)
- ✅ R27: Todos campos presentes
- ✅ Rango validado (precios > 0, IV ≤ 1000%, etc.)

**Criterio NO-GO:**
- ❌ Validación skipped
- ❌ Campo requerido permitido NULL
- ❌ Valor inválido no rechazado

**Evidencia de cierre:**
- Test: tampering detectado por checksum
- Test: campo NULL → FAIL
- Test: IV=1000% → PASS; IV=1001% → FAIL

**Frontera:** NO permitir valores inválidos

**Autorización requerida:** Víctor (integridad)

---

### FASE 5: VALIDACIÓN E2E
**Duración estimada:** 4-6 horas  
**Objetivo:** Validar flujo completo: datos → decisión → reporte  
**Criterio GO:** Escenarios real + anomalía pasando

---

#### FASE 5.1-5.2: E2E Liquidez OK + FAIL (R31, R32)
**Qué se implementa:** Dos escenarios completos  
**Criterio GO LIQUIDEZ OK (R31):**
- ✅ Datos SPY reales (OI, premium, 5d avg)
- ✅ GEX calculado
- ✅ Liquidez evaluada OK
- ✅ Reporte generado automáticamente

**Criterio GO LIQUIDEZ FAIL (R32):**
- ✅ Datos con disparidad > 40%
- ✅ LiquidityGate.pass === false
- ✅ SEATBELT Gate 3 HOLD
- ✅ Evento generado con razón "Liquidez no fiable"

**Criterio NO-GO:**
- ❌ Escenario no ejecutable
- ❌ Reporte falta
- ❌ No entra en SEATBELT

**Evidencia de cierre:**
- Test: npm test (ambos escenarios) PASS
- Reporte actual generado para cada escenario

**Frontera:** NO usar mock data (datos reales)

**Autorización requerida:** Víctor (validación operativa)

---

#### FASE 5.3: Reproducibilidad post-mortem (R33)
**Qué se implementa:** Verificación: evento antiguo → regenerar reporte → bit-identical vs almacenado  
**Criterio GO:**
- ✅ Evento de hace 30 días recuperable
- ✅ Reporte regenerado idéntico al almacenado
- ✅ Timestamp + checksum validados
- ✅ npm test: PASS

**Criterio NO-GO:**
- ❌ Evento no recuperable
- ❌ Reporte diverge (diferente hash)
- ❌ Timestamp no verificable

**Evidencia de cierre:**
- Test: evento viejo → regenerar → hash identical
- Verificable 12 meses atrás

**Frontera:** NO cambiar lógica generación (rompe reproducibilidad)

**Autorización requerida:** Víctor (auditoría histórica)

---

## CHECKPOINTS Y PUNTOS DE AUTORIZACIÓN HUMANA

### Checkpoint 1: Post-FASE 1 (Especificación)
**Responsable:** Víctor  
**Pregunta:** ¿Especificaciones (R1, R9, R21) son claras y ejecutables?  
**Criterio GO:** "Aprobado, proceder Fase 2"  
**Criterio HOLD:** Ajustes solicitados, revise  
**Criterio NO-GO:** Concepto fundamental equivocado, rediseñar  

---

### Checkpoint 2: Post-FASE 2 (Tarea 6)
**Responsable:** Víctor  
**Pregunta:** ¿LiquidityGate + tests (R2-R8) están correctos?  
**Criterio GO:** "Tests 33/33 PASS, integración SEATBELT OK, proceder Fase 3"  
**Criterio HOLD:** Algunos tests fallan, fix  
**Criterio NO-GO:** Diseño Tarea 6 incorrecto, revertir  

---

### Checkpoint 3: Post-FASE 3 (Eventos)
**Responsable:** Víctor  
**Pregunta:** ¿Eventos automáticos (R10-R18) capturan correctamente?  
**Criterio GO:** "Eventos en JSONL, consolidación OK, timestamps validados, proceder Fase 4"  
**Criterio HOLD:** Captura tardía, fix timing  
**Criterio NO-GO:** Sistema eventos fundamentalmente roto, revertir  

---

### Checkpoint 4: Post-FASE 4 (Infraestructura)
**Responsable:** Víctor  
**Pregunta:** ¿Almacenamiento + validación (R20-R27) son durables y auditables?  
**Criterio GO:** "Storage OK, integridad validada, proceder Fase 5"  
**Criterio HOLD:** Validación incompleta, fix  
**Criterio NO-GO:** Storage roto, revertir  

---

### Checkpoint 5: Post-FASE 5 (E2E)
**Responsable:** Víctor + Claude  
**Pregunta:** ¿E2E flujos (R31-R33) funcionan correctamente con datos reales?  
**Criterio GO:** "Escenarios OK, reproducibilidad validada → **Caja Negra V1 COMPLETE**"  
**Criterio HOLD:** Escenario falla, diagnosticar  
**Criterio NO-GO:** Falla crítica, revertir a Checkpoint anterior  

---

## ENTREGABLES POR FASE

| Fase | Entregable | Formato | Evidencia |
|------|-----------|---------|-----------|
| **1** | Specs R1, R9, R21 | Markdown + TS types | Doc + npm build ✅ |
| **2** | Code R2-R8 | TS + tests | npm test 33/33 PASS |
| **3** | Code R10-R18 | TS + tests | npm test PASS, timestamps OK |
| **4** | Code R20-R27 | TS + tests | JSONL stored, validation PASS |
| **5** | Tests R31-R33 | TS tests | E2E scenarios PASS |

---

## CRITERIO FINAL: CAJA NEGRA V1 COMPLETE

```
IF (24 INDISPENSABLE all PASS) AND (OBLIGATORIO >= 4/5 PASS) AND (5 checkpoints = GO)
THEN Caja Negra V1 COMPLETE ✅
ELSE Revert to checkpoint, fix, re-run
```

---

## NOTAS CRÍTICAS

### Fronteras intocables (no pueden cruzarse)
- ❌ R1-R8 NO usan código de R9-R20
- ❌ R9-R20 NO usan código de R25-R27
- ❌ Eventos NO se generan sin captura previa
- ❌ Reportes NO se almacenan sin validación
- ❌ NO se cambia lógica generación post-almacenamiento

### Autorización siempre requerida (no delegable)
- 🟢 Umbrales de riesgo (liquidez %, disparidad %) → **Víctor**
- 🟢 Cambios SEATBELT → **Víctor**
- 🟢 Timestamp precision → **Víctor** (auditoría)
- 🟢 Versión final (V1 COMPLETE) → **Víctor**

### Sin regresión en CP1/CP2/CP3
- ✅ Cada fase verifica: `npm test` en módulos existentes PASS
- ✅ No se modifica código fuera scope

---

## RESUMEN

**Plan maestro de 5 fases, 30-36 horas totales, 24 requisitos INDISPENSABLE en camino crítico.**

**Baseline:** Commit `44d4086`  
**Destino:** Caja Negra V1 COMPLETE  
**Status:** 🟡 EN HOLD para auditoría Víctor + Claude

---

**¿Autoriza proceder con implementación conforme a este plan?**

Esperando feedback pre-fase-1.

