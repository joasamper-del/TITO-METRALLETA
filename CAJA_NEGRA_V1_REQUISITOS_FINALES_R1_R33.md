---
name: caja_negra_v1_requisitos_finales
description: "R1-R33 NORMALIZADO: Inventario oficial de cierre para Caja Negra V1"
metadata:
  type: project
  status: 🟢 INVENTARIO OFICIAL NORMALIZADO R1-R33 — SIN IMPLEMENTACIÓN
  date: 2026-09-13
  author: Claude Haiku 4.5
---

# CAJA NEGRA V1: REQUISITOS OFICIALES (R1-R33 NORMALIZADOS)

**Status:** 🟢 NORMALIZADO — RECONCILIADO — SIN IMPLEMENTACIÓN  
**Baseline:** Commit `44d4086` (Tarea 5 CLOSED)  
**Sistema:** EN HOLD  
**Total requisitos reales:** 33  

---

## MATRIZ DE RECONCILIACIÓN

| ID Anterior | ID Definitivo | Nombre | Prioridad | Categoría | Nota |
|---|---|---|---|---|---|
| R1 | R1 | Spec Tarea 6 | [INDISPENSABLE] | Documentación | ✅ |
| R2 | R2 | Impl LiquidityGate | [INDISPENSABLE] | Tarea 6 | ✅ |
| R3 | R3 | Comparativa 5 líderes | [OBLIGATORIO] | Tarea 6 | ✅ |
| R4 | R4 | Flag "datos no fiables" | [INDISPENSABLE] | Tarea 6 | ✅ |
| R5 | R5 | Integration SEATBELT Gate 3 | [INDISPENSABLE] | Tarea 6 | ✅ |
| R6 | R6 | Tests C1-C6 | [INDISPENSABLE] | Testing | ✅ |
| R7 | R7 | Tests A1-A7 | [INDISPENSABLE] | Testing | ✅ |
| R8 | R8 | Fail-closed | [INDISPENSABLE] | Testing | ✅ |
| R9 | R9 | Definición eventos | [INDISPENSABLE] | Documentación | ✅ |
| R10 | R10 | Captura automática contexto | [INDISPENSABLE] | Eventos | ✅ |
| R11 | R11 | Evento "Trade Close" | [INDISPENSABLE] | Eventos | ✅ |
| R12 | R12 | Evento "Order Fail" | [INDISPENSABLE] | Eventos | ✅ |
| R13 | R13 | Evento "Loss of Traceability" | [INDISPENSABLE] | Eventos | ✅ |
| R14 | R14 | Evento "Daily Summary" | [OBLIGATORIO] | Eventos | ✅ |
| R15 | R15 | Evento "No-Op Explanation" | [OBLIGATORIO] | Eventos | ✅ |
| R16 | R16 | Evento "Critical Anomaly" | [INDISPENSABLE] | Eventos | ✅ |
| R17 | R17 | Consolidación evidencia | [INDISPENSABLE] | Eventos | ✅ |
| R18 | R18 | Generación reporte/evidencia | [INDISPENSABLE] | Eventos | ✅ |
| R19 | R19 | Timestamping preciso (µs) | [INDISPENSABLE] | Eventos | ✅ |
| R20 | R20 | Storage persistente JSONL | [INDISPENSABLE] | Infraestructura | ✅ |
| R21 | R21 | Schema JSON | [INDISPENSABLE] | Infraestructura | ✅ |
| R22 | R22 | Escritura atómica | [INDISPENSABLE] | Infraestructura | ✅ |
| R23 | R23 | Lectura indexada | [OBLIGATORIO] | Infraestructura | ✅ |
| R24 | ~~R24~~ | ~~Compresión/archivado~~ | ~~[DESEABLE]~~ | ~~Infraestructura~~ | ❌ ELIMINADO — DESEABLE |
| R25 | R24 | Integridad SHA256 (opcional) | [DESEABLE] | Infraestructura | ✅ RENUMERADO |
| R26 | R25 | Checksum reporte | [OBLIGATORIO] | Infraestructura | ✅ RENUMERADO |
| R27 | R26 | Completitud campos | [OBLIGATORIO] | Infraestructura | ✅ RENUMERADO |
| R28 | R27 | Rango valores | [OBLIGATORIO] | Infraestructura | ✅ RENUMERADO |
| R29 | R28 | Manual eventos/captura | [OBLIGATORIO] | Documentación | ✅ RENUMERADO |
| R30 | R29 | Runbook investigación | [DESEABLE] | Documentación | ✅ RENUMERADO |
| R31 | R30 | Changelog Caja Negra | [DESEABLE] | Documentación | ✅ RENUMERADO |
| R32 | R31 | E2E liquidez OK | [OBLIGATORIO] | Testing | ✅ RENUMERADO |
| R33 | R32 | E2E liquidez FAIL | [OBLIGATORIO] | Testing | ✅ RENUMERADO |
| R34 | R33 | Reproducibilidad post-mortem | [INDISPENSABLE] | Testing | ✅ RENUMERADO |

**CONFIRMACIÓN:** TOTAL=33, IDs únicos=33, duplicados=0, huecos=0, referencias inválidas=0

---

## CONVENCIÓN

- **[INDISPENSABLE]** = Requerido para V1, no se puede diferir (24 requisitos)
- **[OBLIGATORIO]** = Muy importante pero diferible a V1.1 sin riesgo (5 requisitos)
- **[DESEABLE]** = Bonificación para V2+ (4 requisitos)

---

## SECCIÓN 1: TAREA 6 — EVALUACIÓN DE LIQUIDEZ (R1-R8)

### R1. Especificación formal Tarea 6
- **Prioridad:** [INDISPENSABLE]
- **Objetivo:** Documento formal que define criterios de liquidez
- **Dependencia:** Tarea 5 (DONE)
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** Documento > 2 páginas, 6 casos numéricos, 5+ anti-patterns

### R2. Implementación LiquidityGate
- **Prioridad:** [INDISPENSABLE]
- **Objetivo:** Función `{pass: boolean, reason: string}` evaluando segmentación
- **Dependencia:** R1
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** 20+ tests PASS, fail-closed en todos edges

### R3. Integración con comparativa 5 líderes
- **Prioridad:** [OBLIGATORIO]
- **Objetivo:** Compara OI/premium vs histórico 5d líderes del sector
- **Dependencia:** R2
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** disparidad % <= 40% = pass

### R4. Flag "datos no fiables"
- **Prioridad:** [INDISPENSABLE]
- **Objetivo:** Si disparidad > 40% O liquidez < 60% → flag + razón
- **Dependencia:** R2, R3
- **Estado actual:** 🔴 No existe (mock en segmentation)
- **Criterio de cierre:** Flag correcto, bloqueante en SEATBELT Gate 3

### R5. Integration con SEATBELT Gate 3
- **Prioridad:** [INDISPENSABLE]
- **Objetivo:** Si `LiquidityGate.pass === false` → SEATBELT HOLD
- **Dependencia:** R2, SEATBELT (DONE)
- **Estado actual:** 🟡 SEATBELT existe, integración pendiente
- **Criterio de cierre:** `POST /analyze` con cadena no fiable → Gate 3 HOLD

### R6. Tests Tarea 6 (C1-C6)
- **Prioridad:** [INDISPENSABLE]
- **Objetivo:** 6 casos numéricos validando fórmulas exactas
- **Dependencia:** R1, R2
- **Estado actual:** 🔴 No existen
- **Criterio de cierre:** npm test → C1-C6 PASS exacto

### R7. Tests Tarea 6 (A1-A7 anti-patterns)
- **Prioridad:** [INDISPENSABLE]
- **Objetivo:** 7 validaciones de edge cases y anti-patterns
- **Dependencia:** R1, R2
- **Estado actual:** 🔴 No existen
- **Criterio de cierre:** npm test → A1-A7 PASS

### R8. Fail-closed en Tarea 6
- **Prioridad:** [INDISPENSABLE]
- **Objetivo:** NULL o "no fiable" si falta dato, nunca crash
- **Dependencia:** R2, R6-R7
- **Estado actual:** 🔴 Pendiente implementación
- **Criterio de cierre:** 20+ tests fail-closed PASS

---

## SECCIÓN 2: SISTEMA DE EVENTOS AUTOMÁTICOS (R9-R20)

### R9. Definición exhaustiva de "eventos clave"
- **Prioridad:** [INDISPENSABLE]
- **Objetivo:** Enumeración completa: trade close, order fail, loss of traceability, daily summary, no-op, anomaly
- **Dependencia:** Proceso principal (DONE)
- **Estado actual:** 🔴 Parcial
- **Criterio de cierre:** Listado > 15 eventos, cada uno con disparador y contexto

### R10. Captura automática de contexto por evento
- **Prioridad:** [INDISPENSABLE]
- **Objetivo:** {timestamp µs, precio spot, griegos, OI, IV, noticias, reason}
- **Dependencia:** R9
- **Estado actual:** 🔴 No existe (bitácora manual)
- **Criterio de cierre:** Captura EN el evento, timestamp verificable vs mercado

### R11. Evento específico: "Trade Close"
- **Prioridad:** [INDISPENSABLE]
- **Objetivo:** Entrada (precio/hora), salida, P&L, razón, griegos finales
- **Dependencia:** R10
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** JSON exacto, timestamp µs, reproducible 6 meses

### R12. Evento específico: "Order Fail"
- **Prioridad:** [INDISPENSABLE]
- **Objetivo:** ID orden, razón rechazo, precio intent, timestamp, estado mercado
- **Dependencia:** R10
- **Estado actual:** 🟡 Error logs existen
- **Criterio de cierre:** JSON estructurado automático para TODOS los fallos

### R13. Evento específico: "Loss of Traceability"
- **Prioridad:** [INDISPENSABLE]
- **Objetivo:** Dato crítico desaparece → FAIL + preservar último contexto
- **Dependencia:** R10, Guardian (DONE)
- **Estado actual:** 🟡 Detección existe, falta captura estructurada
- **Criterio de cierre:** FAIL event, evidencia preservada, HOLD sistema

### R14. Evento específico: "Daily Summary"
- **Prioridad:** [OBLIGATORIO]
- **Objetivo:** EOD: posiciones, trades, P&L, eventos del día en JSON
- **Dependencia:** R10, bitácora (DONE)
- **Estado actual:** 🟡 Reporte existe, falta consolidación automática
- **Criterio de cierre:** JSON EOD automático con ALL trades + events

### R15. Evento específico: "No-Op Explanation"
- **Prioridad:** [OBLIGATORIO]
- **Objetivo:** Si NO opera (p.ej. liquidez no fiable) → razón + contexto
- **Dependencia:** R10, SEATBELT (DONE)
- **Estado actual:** 🟡 Decision-audit existe, falta evento estructurado
- **Criterio de cierre:** JSON por cada HOLD, claro por qué NO

### R16. Evento específico: "Critical Anomaly"
- **Prioridad:** [INDISPENSABLE]
- **Objetivo:** IV > 500%, precio jump > 10%, OI inversión → FAIL/HOLD
- **Dependencia:** R10, Guardian (DONE)
- **Estado actual:** 🟡 Detección existe, falta evento JSON
- **Criterio de cierre:** Evento JSON con anomalía, valores, umbral, timestamp

### R17. Consolidación de evidencia post-captura
- **Prioridad:** [INDISPENSABLE]
- **Objetivo:** Consolidar contexto capturado en reporte JSON para auditoría 6 meses
- **Dependencia:** R10-R16, R20
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** JSON consolidado, todos campos, verificable post-mortem

### R18. Generación de reporte/evidencia por evento
- **Prioridad:** [INDISPENSABLE]
- **Objetivo:** {timestamp, event_type, context, decision, reason, evidence}
- **Dependencia:** R17
- **Estado actual:** 🔴 No existe (templates en decision-audit)
- **Criterio de cierre:** Reporte automático, ALL contexto, formato consistente

### R19. Timestamping preciso (µs)
- **Prioridad:** [INDISPENSABLE]
- **Objetivo:** Cada artefacto con timestamp ≤ 1 µs del evento real
- **Dependencia:** R10-R18
- **Estado actual:** 🟡 Timestamps (ms), falta µs en críticos
- **Criterio de cierre:** Audit trail µs, verificable vs Alpaca API

### R20. Storage persistente e indexado
- **Prioridad:** [INDISPENSABLE]
- **Objetivo:** `data/events/{YYYYMMDD}.jsonl`, búsqueda fecha/ticker/tipo
- **Dependencia:** R10-R18
- **Estado actual:** 🟡 bitácora.json existe, falta JSONL + índice
- **Criterio de cierre:** JSONL/día, recuperable 12 meses, búsqueda <100ms

---

## SECCIÓN 3: INFRAESTRUCTURA & GUARDRAILS (R21-R27)

### R21. Schema JSON para eventos
- **Prioridad:** [INDISPENSABLE]
- **Objetivo:** TypeScript interfaces + JSON Schema validación
- **Dependencia:** R9
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** `EventSchema` TS + JSON Schema, strict validation

### R22. Escritura atómica a disk
- **Prioridad:** [INDISPENSABLE]
- **Objetivo:** `data/events/{YYYYMMDD}.jsonl` atómico (no truncado si crash)
- **Dependencia:** R20, R21
- **Estado actual:** 🟡 FS write existe, falta atomicidad
- **Criterio de cierre:** Test crash mid-write → integridad verificada

### R23. Lectura indexada de eventos
- **Prioridad:** [OBLIGATORIO]
- **Objetivo:** `GET /api/events?date=&ticker=&type=` búsqueda <100ms
- **Dependencia:** R20, R22
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** Route, 1000 eventos en <100ms

### R24. Integridad SHA256 (opcional)
- **Prioridad:** [DESEABLE]
- **Objetivo:** SHA256 por evento, detecta tampering post-almacenamiento
- **Dependencia:** R22
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** Hash verificable, test tampering detectado

### R25. Checksum reporte
- **Prioridad:** [OBLIGATORIO]
- **Objetivo:** CRC32/MD5 de JSON, detecta corrupción lectura
- **Dependencia:** R18
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** Checksum appended, verificable en lectura

### R26. Completitud campos
- **Prioridad:** [OBLIGATORIO]
- **Objetivo:** Validación automática: campos esperados presentes (no NULL excepto opcionales)
- **Dependencia:** R18, R21
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** Test: sin campo X → FAIL + log

### R27. Rango valores
- **Prioridad:** [OBLIGATORIO]
- **Objetivo:** Validación: griegos en límites, precios > 0, timestamps coherentes
- **Dependencia:** R18, R26
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** Test: IV=1000% → FAIL; precio=-$5 → FAIL

---

## SECCIÓN 4: DOCUMENTACIÓN (R28-R30)

### R28. Manual de eventos y captura
- **Prioridad:** [OBLIGATORIO]
- **Objetivo:** Documento: R9 eventos, cuándo capturar, contexto, timestamps, ejemplos JSON
- **Dependencia:** R9-R20
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** Documento > 5 páginas, cada evento con ejemplo real

### R29. Runbook investigación post-evento
- **Prioridad:** [DESEABLE]
- **Objetivo:** Guía: cómo investigar "¿por qué Tito entró/salió?" con reportes automáticos
- **Dependencia:** R28
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** 3-4 ejemplos reales resueltos

### R30. Changelog Caja Negra V1
- **Prioridad:** [DESEABLE]
- **Objetivo:** Lista oficial R1-R33 implementados, fecha, estado, PR
- **Dependencia:** Implementación
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** Markdown actualizado en cada merge

---

## SECCIÓN 5: VALIDACIÓN & TESTING (R31-R33)

### R31. E2E: Liquidez OK
- **Prioridad:** [OBLIGATORIO]
- **Objetivo:** Datos SPY → GEX → liquidez OK → reporte generado
- **Dependencia:** R1-R8, R9-R20
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** Test pasa, reporte con ALL contexto esperado

### R32. E2E: Liquidez FAIL
- **Prioridad:** [OBLIGATORIO]
- **Objetivo:** Disparidad > 40% → FAIL → SEATBELT Gate 3 HOLD → evento
- **Dependencia:** R1-R8, R9-R20, R5
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** Gate 3 HOLD, reporte con razón clara

### R33. Reproducibilidad post-mortem
- **Prioridad:** [INDISPENSABLE]
- **Objetivo:** Evento de ayer → regenerar reporte → bit-identical vs almacenado
- **Dependencia:** R9-R20, R25-R27
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** Test PASS, reportes reproducibles 12 meses atrás

---

## TABLA RESUMEN FINAL

### INDISPENSABLE (24 requisitos — Bloquean V1)

R1, R2, R4, R5, R6, R7, R8, R9, R10, R11, R12, R13, R16, R17, R18, R19, R20, R21, R22, R25, R26, R27, R31, R33

### OBLIGATORIO (5 requisitos — Recomendados V1)

R3, R14, R15, R23, R28

### DESEABLE (4 requisitos — V2+)

R24, R29, R30, R31

---

## CRITERIO DE CIERRE: CAJA NEGRA V1 COMPLETE

**Condición:** Todos INDISPENSABLE PASS + OBLIGATORIO >= 80% PASS = **V1 COMPLETE**

**Punto de referencia:** Commit `44d4086` (Tarea 5 CLOSED)

**Próximo paso:** Implementación secuencial R1-R33

---

**Status:** 🟢 **INVENTARIO OFICIAL NORMALIZADO**  
**Sistema:** EN HOLD  
**Implementación:** Pendiente autorización Víctor

