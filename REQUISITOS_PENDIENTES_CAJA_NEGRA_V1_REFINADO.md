---
name: requisitos_pendientes_caja_negra_v1_refinado
description: "R1-R34 enumerados: Requisitos INDISPENSABLE vs DESEABLE para Caja Negra V1, sin implementación"
metadata:
  type: project
  status: 🟡 INVENTARIO REFINADO R1-R34 — SIN IMPLEMENTACIÓN
  date: 2026-09-13
  author: Claude Haiku 4.5
---

# CAJA NEGRA V1: INVENTARIO REFINADO (R1-R34)

**Status:** 🟡 DOCUMENTADO — SIN IMPLEMENTACIÓN  
**Baseline:** Commit `44d4086` (Tarea 5 CLOSED)  
**Sistema:** EN HOLD  

---

## CONVENCIÓN

- **[INDISPENSABLE]** = Requerido para V1, no se puede diferir
- **[OBLIGATORIO]** = Muy importante pero técnicamente diferible a V2 sin riesgo mayor
- **[DESEABLE]** = Bonificación, claramente V2

---

## SECCIÓN 1: TAREA 6 — EVALUACIÓN DE LIQUIDEZ (R1-R8)

### R1. Especificación formal Tarea 6
- **Categoría:** Documentación
- **Objetivo:** Documento formal (> S70_TAREA5_SPECIFICATION.md) que define criterios de liquidez
- **Prioridad:** [INDISPENSABLE]
- **Dependencia:** Tarea 5 (DONE)
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** Documento > 2 páginas, con fórmulas, 6 casos numéricos, 5+ anti-patterns

### R2. Implementación LiquidityGate
- **Categoría:** Tarea 6 (Código)
- **Objetivo:** Función que retorna `{pass: boolean, reason: string}` evaluando segmentación
- **Prioridad:** [INDISPENSABLE]
- **Dependencia:** R1 (especificación)
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** Función implementada, 20+ tests PASS, fail-closed en todos edges

### R3. Integración con comparativa 5 líderes
- **Categoría:** Tarea 6 (Código)
- **Objetivo:** `evaluateLiquidity()` compara OI/premium vs histórico 5d de líderes del sector
- **Prioridad:** [OBLIGATORIO]
- **Dependencia:** R2 (impl base)
- **Estado actual:** 🔴 No existe (datos históricos parciales)
- **Criterio de cierre:** Integración con datos reales, disparidad % <= 40% = pass

### R4. Flag "datos no fiables"
- **Categoría:** Tarea 6 (Código)
- **Objetivo:** Si disparidad > 40% O liquidez < 60% del promedio → flag + razón
- **Prioridad:** [INDISPENSABLE]
- **Dependencia:** R2 (impl), R3 (comparativa)
- **Estado actual:** 🔴 No existe (mock exists en segmentation)
- **Criterio de cierre:** Flag generado correctamente, mensaje claro, bloqueante en SEATBELT Gate 3

### R5. Integration con SEATBELT Gate 3
- **Categoría:** Tarea 6 (Integración)
- **Objetivo:** Si `LiquidityGate.pass === false` → SEATBELT retorna HOLD + razón liquidez
- **Prioridad:** [INDISPENSABLE]
- **Dependencia:** R2 (impl), SEATBELT (DONE)
- **Estado actual:** 🟡 SEATBELT existe, integration pendiente
- **Criterio de cierre:** Route test: `POST /analyze` con cadena no fiable → Gate 3 HOLD

### R6. Tests Tarea 6 (C1-C6)
- **Categoría:** Testing
- **Objetivo:** 6 casos numéricos (similar a Tarea 5) validando fórmulas exactas
- **Prioridad:** [INDISPENSABLE]
- **Dependencia:** R1 (spec), R2 (impl)
- **Estado actual:** 🔴 No existen
- **Criterio de cierre:** npm test → C1-C6 PASS, aritmética exacta

### R7. Tests Tarea 6 (A1-A7 anti-patterns)
- **Categoría:** Testing
- **Objetivo:** 7 validaciones: confundir liquidez con precio, hardcodes, no fail-closed, etc.
- **Prioridad:** [INDISPENSABLE]
- **Dependencia:** R1 (spec), R2 (impl)
- **Estado actual:** 🔴 No existen
- **Criterio de cierre:** npm test → A1-A7 PASS, todos edges capturados

### R8. Fail-closed en Tarea 6
- **Categoría:** Testing
- **Objetivo:** Si falta dato → NULL o "no fiable", nunca crash ni valor asumido
- **Prioridad:** [INDISPENSABLE]
- **Dependencia:** R2 (impl), R6-R7 (tests)
- **Estado actual:** 🔴 Pendiente implementación
- **Criterio de cierre:** 20+ tests fall-closed, todos PASS, 0 unhandled cases

---

## SECCIÓN 2: SISTEMA DE EVENTOS AUTOMÁTICOS (R9-R20)

### R9. Definición exhaustiva de "eventos clave"
- **Categoría:** Documentación
- **Objetivo:** Enumeración completa de eventos que disparan captura: trade close, order fail, loss of traceability, daily summary, no-op explanation, anomaly
- **Prioridad:** [INDISPENSABLE]
- **Dependencia:** Proceso principal (DONE)
- **Estado actual:** 🔴 Parcial (algunos en bitácora)
- **Criterio de cierre:** Listado > 15 eventos, cada uno con disparador y contexto requerido

### R10. Captura automática de contexto por evento
- **Categoría:** Sistema de Eventos (Código)
- **Objetivo:** Cuando evento dispara, capturar: {timestamp (µs), precio spot, griegos, OI, IV, noticias, state machine, user action, reason}
- **Prioridad:** [INDISPENSABLE]
- **Dependencia:** R9 (definición)
- **Estado actual:** 🔴 No existe (bitácora manual)
- **Criterio de cierre:** Captura ocurre EN el evento, no después; timestamp verificable vs mercado

### R11. Evento específico: "Trade Close"
- **Categoría:** Sistema de Eventos (Código)
- **Objetivo:** Al cerrar posición → captura: entrada (precio/hora), salida (precio/hora), P&L, razón cierre, griegos finales
- **Prioridad:** [INDISPENSABLE]
- **Dependencia:** R10 (captura base)
- **Estado actual:** 🔴 No existe (trade-execution.entity existe pero sin captura de contexto)
- **Criterio de cierre:** JSON con campos exactos, timestamp µs, reproducible 6 meses después

### R12. Evento específico: "Order Fail"
- **Categoría:** Sistema de Eventos (Código)
- **Objetivo:** Si orden rechazada/cancelada → captura: ID orden, razón rechazo, precio intent, timestamp, estado mercado
- **Prioridad:** [INDISPENSABLE]
- **Dependencia:** R10 (captura base), orden.service
- **Estado actual:** 🟡 Partial (error logs existen)
- **Criterio de cierre:** Captura estructurada JSON, todos los fallos capturados automáticamente

### R13. Evento específico: "Loss of Traceability"
- **Categoría:** Sistema de Eventos (Código)
- **Objetivo:** Si dato crítico desaparece (precio, griegos, OI) → trigger FAIL + preservar contexto último
- **Prioridad:** [INDISPENSABLE]
- **Dependencia:** R10 (captura base), Guardian (DONE)
- **Estado actual:** 🟡 Guardian tiene detección, falta captura estructurada
- **Criterio de cierre:** FAIL event generado, evidencia preservada, sistema HOLD

### R14. Evento específico: "Daily Summary"
- **Categoría:** Sistema de Eventos (Código)
- **Objetivo:** EOD: consolidar todas las posiciones, trades, P&L, eventos del día en reporte JSON estructurado
- **Prioridad:** [OBLIGATORIO]
- **Dependencia:** R10 (captura), bitácora (DONE)
- **Estado actual:** 🟡 Reporte diario existe, falta consolidación automática post-evento
- **Criterio de cierre:** JSON generado automáticamente EOD, incluye ALL trades + events + summary

### R15. Evento específico: "No-Op Explanation"
- **Categoría:** Sistema de Eventos (Código)
- **Objetivo:** Si Tito NO opera durante ventana (p.ej. liquidez no fiable) → captura razón + contexto + timestamp
- **Prioridad:** [OBLIGATORIO]
- **Dependencia:** R10 (captura base), SEATBELT (DONE)
- **Estado actual:** 🟡 Decision-audit existe, falta consolidación como evento
- **Criterio de cierre:** JSON por cada HOLD, claro por qué no se operó

### R16. Evento específico: "Critical Anomaly"
- **Categoría:** Sistema de Eventos (Código)
- **Objetivo:** Datos anómalos (IV > 500%, precio jump > 10%, OI inversión súbita) → trigger FAIL/HOLD + preservar evidencia
- **Prioridad:** [INDISPENSABLE]
- **Dependencia:** R10 (captura), Guardian detección (DONE)
- **Estado actual:** 🟡 Guardian-detects, falta consolidación como evento estructurado
- **Criterio de cierre:** Evento JSON con anomalía, valores, umbral, timestamp, sistema HOLD

### R17. Consolidación de evidencia post-captura
- **Categoría:** Sistema de Eventos (Código)
- **Objetivo:** Después de cada evento, consolidar contexto capturado en reporte JSON para auditoría 6 meses después
- **Prioridad:** [INDISPENSABLE]
- **Dependencia:** R10-R16 (capturas), B1 (storage)
- **Estado actual:** 🔴 No existe (bitácora parcial)
- **Criterio de cierre:** JSON consolidado, todos campos presentes, verificable post-mortem

### R18. Generación de reporte/evidencia por evento
- **Categoría:** Sistema de Eventos (Código)
- **Objetivo:** Crear JSON/markdown estructura {timestamp, event_type, context, decision, reason, evidence} para cada evento
- **Prioridad:** [INDISPENSABLE]
- **Dependencia:** R17 (consolidación)
- **Estado actual:** 🔴 No existe (templates en decision-audit, no generado automáticamente)
- **Criterio de cierre:** Reporte generado automáticamente, contiene ALL contexto, formateado consistentemente

### R19. Timestamping preciso (µs)
- **Categoría:** Sistema de Eventos (Código)
- **Objetivo:** Cada artefacto (captura, consolidación, reporte) con timestamp ≤ 1 µs de evento real
- **Prioridad:** [INDISPENSABLE]
- **Dependencia:** R10-R18 (todas capturas)
- **Estado actual:** 🟡 Existen timestamps (ms), falta µs en críticos
- **Criterio de cierre:** Audit trail con µs, verificable contra mercado (via Alpaca API)

### R20. Storage persistente e indexado
- **Categoría:** Infraestructura
- **Objetivo:** Guardar eventos en `data/events/{YYYYMMDD}.jsonl`, con índice búsqueda por fecha/ticker/tipo
- **Prioridad:** [INDISPENSABLE]
- **Dependencia:** R10-R18 (generación)
- **Estado actual:** 🟡 bitácora.json existe, falta estructura JSONL + índice
- **Criterio de cierre:** JSONL per day, recuperable 12 meses, búsqueda en <100ms

---

## SECCIÓN 3: INFRAESTRUCTURA & GUARDRAILS (R21-R28)

### R21. Schema JSON para eventos
- **Categoría:** Infraestructura
- **Objetivo:** TypeScript interfaces + JSON Schema para validar estructura evento pre-almacenamiento
- **Prioridad:** [INDISPENSABLE]
- **Dependencia:** R9 (definición eventos)
- **Estado actual:** 🔴 No existe (types.ts parcial)
- **Criterio de cierre:** `EventSchema` TypeScript + JSON Schema, strict validation

### R22. Escritura atómica a disk
- **Categoría:** Infraestructura
- **Objetivo:** Guardar evento a `data/events/{YYYYMMDD}.jsonl` con garantía atómica (no truncado si crash)
- **Prioridad:** [INDISPENSABLE]
- **Dependencia:** R20 (storage), R21 (schema)
- **Estado actual:** 🟡 FS write existe, falta atomicidad (flag temp file)
- **Criterio de cierre:** Test: simular crash mid-write, verificar integridad

### R23. Lectura indexada de eventos
- **Categoría:** Infraestructura
- **Objetivo:** API `GET /api/events?date=&ticker=&type=` búsqueda rápida (<100ms) en archivo JSONL
- **Prioridad:** [OBLIGATORIO]
- **Dependencia:** R20 (storage), R22 (escritura)
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** Route implementada, 1000 eventos queried en <100ms

### R24. Compresión/archivado de eventos
- **Categoría:** Infraestructura
- **Objetivo:** Post-30d → comprimir eventos a `data/events/archive/{YYYY-MM}.tar.gz`
- **Prioridad:** [DESEABLE]
- **Dependencia:** R20 (storage)
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** Auto-run nightly, archivos <50MB cada uno

### R25. Integridad de hash (SHA256 opcional)
- **Categoría:** Infraestructura
- **Objetivo:** Cada evento almacena SHA256 de contexto, detectable si modificado post-almacenamiento
- **Prioridad:** [DESEABLE]
- **Dependencia:** R22 (escritura)
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** Hash verificable, test: simular tampering detectado

### R26. Checksum de reporte
- **Categoría:** Infraestructura
- **Objetivo:** Post-reporte → CRC32 o MD5 de JSON, detecta corrupción durante lectura
- **Prioridad:** [OBLIGATORIO]
- **Dependencia:** R18 (generación)
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** Checksum appended a cada reporte, verificable en lectura

### R27. Completitud de campos
- **Categoría:** Infraestructura
- **Objetivo:** Validación automática post-generación: todos los campos esperados presentes (no NULL excepto opcionales)
- **Prioridad:** [OBLIGATORIO]
- **Dependencia:** R18 (generación), R21 (schema)
- **Estado actual:** 🔴 No existe (schema parcial)
- **Criterio de cierre:** Test: evento sin campo X → FAIL + log

### R28. Rango de valores
- **Categoría:** Infraestructura
- **Objetivo:** Validación: griegos en límites esperados, precios > 0, timestamp coherentes
- **Prioridad:** [OBLIGATORIO]
- **Dependencia:** R18 (generación), R27 (completitud)
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** Test: IV=1000% → FAIL; precio=-$5 → FAIL

---

## SECCIÓN 4: DOCUMENTACIÓN (R29-R31)

### R29. Manual de eventos y captura
- **Categoría:** Documentación
- **Objetivo:** Documento que lista R9 eventos, cuándo capturar, contexto requerido, timestamps, ejemplos JSON
- **Prioridad:** [OBLIGATORIO]
- **Dependencia:** R9-R20 (definición + implementación)
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** Documento > 5 páginas, cada evento con ejemplo real

### R30. Runbook de investigación post-evento
- **Categoría:** Documentación
- **Objetivo:** Guía paso a paso: cómo investigar "¿por qué Tito entró/salió?" usando reportes automáticos
- **Prioridad:** [DESEABLE]
- **Dependencia:** R29 (manual)
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** 3-4 ejemplos reales resueltos con reportes

### R31. Changelog de Caja Negra V1
- **Categoría:** Documentación
- **Objetivo:** Lista oficial de R1-R34 implementados, fecha, estado, pull request
- **Prioridad:** [DESEABLE]
- **Dependencia:** Implementación
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** Markdown actualizado en cada merge

---

## SECCIÓN 5: VALIDACIÓN & TESTING (R32-R34)

### R32. Validación E2E: Liquidez OK
- **Categoría:** Testing
- **Objetivo:** Test: datos reales de SPY → GEX calculado → liquidez evaluada OK → reporte generado
- **Prioridad:** [OBLIGATORIO]
- **Dependencia:** R1-R8 (Tarea 6), R9-R20 (eventos)
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** Test pasa, reporte contiene ALL contexto esperado

### R33. Validación E2E: Liquidez "no fiable"
- **Categoría:** Testing
- **Objetivo:** Test: datos con disparidad > 40% → liquidez FAIL → SEATBELT Gate 3 HOLD → evento "no fiable"
- **Prioridad:** [OBLIGATORIO]
- **Dependencia:** R1-R8 (Tarea 6), R9-R20 (eventos), R5 (SEATBELT)
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** Gate 3 HOLD confirmado, reporte con razón clara

### R34. Reproducibilidad post-mortem
- **Categoría:** Testing
- **Objetivo:** Test: tomar evento de ayer → regenerar reporte → compare vs almacenado → bit-identical
- **Prioridad:** [INDISPENSABLE]
- **Dependencia:** R9-R20 (eventos), R26-R28 (validación)
- **Estado actual:** 🔴 No existe
- **Criterio de cierre:** Test pasa, reportes reproducibles 12 meses atrás

---

## TABLA RESUMEN: INDISPENSABLE vs DESEABLE

### INDISPENSABLE (No se puede diferir — bloqueantes para V1)

| R | Nombre | Categoría |
|---|--------|-----------|
| R1 | Spec Tarea 6 | Documentación |
| R2 | Impl LiquidityGate | Tarea 6 |
| R4 | Flag "datos no fiables" | Tarea 6 |
| R5 | Integration SEATBELT Gate 3 | Tarea 6 |
| R6 | Tests C1-C6 | Testing |
| R7 | Tests A1-A7 | Testing |
| R8 | Fail-closed | Testing |
| R9 | Definición eventos | Documentación |
| R10 | Captura automática contexto | Eventos |
| R11 | Evento "Trade Close" | Eventos |
| R12 | Evento "Order Fail" | Eventos |
| R13 | Evento "Loss of Traceability" | Eventos |
| R16 | Evento "Critical Anomaly" | Eventos |
| R17 | Consolidación evidencia | Eventos |
| R18 | Generación reporte/evidencia | Eventos |
| R19 | Timestamping µs | Eventos |
| R20 | Storage persistente JSONL | Infraestructura |
| R21 | Schema JSON | Infraestructura |
| R22 | Escritura atómica | Infraestructura |
| R26 | Checksum reporte | Infraestructura |
| R27 | Completitud campos | Infraestructura |
| R28 | Rango valores | Infraestructura |
| R32 | E2E liquidez OK | Testing |
| R33 | E2E liquidez FAIL | Testing |
| R34 | Reproducibilidad post-mortem | Testing |

**Total INDISPENSABLE: 24 requisitos** (core para V1)

### OBLIGATORIO (Importante, técnicamente diferible pero recomendado)

| R | Nombre | Categoría |
|---|--------|-----------|
| R3 | Comparativa 5 líderes | Tarea 6 |
| R14 | Daily Summary | Eventos |
| R15 | No-Op Explanation | Eventos |
| R23 | Lectura indexada | Infraestructura |
| R29 | Manual eventos/captura | Documentación |

**Total OBLIGATORIO: 5 requisitos** (V1+ pero no bloqueantes)

### DESEABLE (Bonificación, claramente V2)

| R | Nombre | Categoría |
|---|--------|-----------|
| R24 | Compresión/archivado | Infraestructura |
| R25 | Integridad SHA256 | Infraestructura |
| R30 | Runbook investigación | Documentación |
| R31 | Changelog Caja Negra | Documentación |

**Total DESEABLE: 4 requisitos** (post-V1 sin riesgo)

---

## PROPUESTA DE ORDEN DE IMPLEMENTACIÓN

**Fase 1 (Semana 1): Tarea 6 + Definición eventos**
```
1. R1 — Spec Tarea 6 (documentación)
2. R9 — Definición eventos (documentación)
3. R2 — Impl LiquidityGate (código)
4. R10 — Captura automática (código)
```

**Fase 2 (Semana 1-2): Tests + Eventos específicos**
```
5. R6-R8 — Tests Tarea 6 (testing)
6. R11-R13, R16 — Eventos específicos (código)
```

**Fase 3 (Semana 2): Infraestructura + Integración**
```
7. R21-R22, R26-R28 — Schema + validación (infraestructura)
8. R17-R20 — Storage + consolidación (infraestructura)
9. R5 — Integration SEATBELT (integración)
```

**Fase 4 (Semana 2-3): E2E + Documentación**
```
10. R32-R34 — Validación E2E (testing)
11. R29 — Manual eventos (documentación)
12. Merge a main (Caja Negra V1 COMPLETE)
```

**Post-V1 (V2+):**
```
• R3 — Comparativa 5 líderes
• R14-R15 — Daily Summary / No-Op
• R23 — Lectura indexada
• R24-R25, R30-R31 — Bonificaciones
```

---

## CONCLUSIÓN

**24 requisitos INDISPENSABLE (bloqueantes para V1)**  
**5 requisitos OBLIGATORIO (recomendados en V1)**  
**4 requisitos DESEABLE (V2)**  
**Estimado total V1: 32-36 horas**  

**Criterio de cierre: Todos INDISPENSABLE PASS + OBLIGATORIO >= 80% PASS = Caja Negra V1 COMPLETE**

**Sistema en HOLD. Aguardando instrucción Víctor sobre orden/prioridad.**

