---
name: requisitos_pendientes_caja_negra_v1
description: "Inventario exacto de requisitos pendientes para declarar Caja Negra V1 COMPLETA"
metadata:
  type: project
  status: 🟡 INVENTARIO DOCUMENTADO — SIN IMPLEMENTACIÓN
  date: 2026-09-13
  author: Claude Haiku 4.5
  baselineDate: 2026-09-13T13:42:00
---

# INVENTARIO DE REQUISITOS PENDIENTES PARA "CAJA NEGRA V1 COMPLETA"

**Status:** 🟡 DOCUMENTADO (sin implementar)  
**Baseline Commit:** `44d4086` (Tarea 5 CLOSED)  
**Sistema:** En HOLD  
**Próximo paso:** Autorización Víctor para priorizar requisitos

---

## I. RESUMEN EJECUTIVO

**Pregunta:** ¿Qué falta para declarar "Caja Negra V1 COMPLETA"?

**Respuesta:**
1. **Tarea 6:** Evaluación de liquidez (especificación + implementación)
2. **Generación automática de reportes/evidencia por eventos** (requisito crítico no en Tarea 5/6)
3. **Integración de Tarea 6 en pipeline operativo** (después de implementación)
4. **Validación E2E** (después de todo)

---

## II. REQUISITOS POR CATEGORÍA

### CATEGORÍA A: TAREAS DE CÓDIGO (Tarea 6, Tareas Futuras)

#### A1. TAREA 6 — EVALUACIÓN DE LIQUIDEZ
**Estado:** 🟡 Especificación pendiente  
**Descripción:** Decidir si cadena de opciones es líquida basado en segmentación (Tarea 5)

**Requisitos detallados:**
| # | Requisito | Scope | Dependencia | Prioridad |
|---|-----------|-------|-------------|-----------|
| A1a | Especificación formal Tarea 6 | Documento + criterios | Tarea 5 (DONE) | **CRÍTICA** |
| A1b | Implementación `LiquidityGate` | Lógica de decisión | Spec Tarea 6 (A1a) | **CRÍTICA** |
| A1c | Validación vs 5 líderes sectoriales | Comparación OI/premium | Datos históricos | ALTA |
| A1d | Flag "datos no fiables" | Si disparidad > 40% o liquidez < 60% | Spec Tarea 6 (A1a) | ALTA |
| A1e | Integration con GEX analysis | Gate 3 SEATBELT si no fiable | Spec SEATBELT (DONE) | MEDIA |
| A1f | Tests (C1-C6 + A1-A7) | Mínimo 20 tests | Implementación (A1b) | **CRÍTICA** |

---

#### A2. GENERADOR AUTOMÁTICO DE REPORTES/EVIDENCIA POR EVENTOS
**Estado:** 🔴 NO ESPECIFICADO — Requisito crítico identificado  
**Descripción:** Sistema que captura, consolida y genera reportes automáticos cuando ocurren eventos clave

**Requisitos detallados:**
| # | Requisito | Scope | Dependencia | Prioridad |
|---|-----------|-------|-------------|-----------|
| A2a | Definir "eventos clave" | Lista exhaustiva | Proceso principal | **CRÍTICA** |
| A2b | Captura automática de contexto | Datos de mercado, griegos, estado | Cada evento | **CRÍTICA** |
| A2c | Consolidación de evidencia | Agregación post-evento | Captura (A2b) | **CRÍTICA** |
| A2d | Generación de reporte/evidencia | JSON/markdown estructurado | Consolidación (A2c) | **CRÍTICA** |
| A2e | Timestamping preciso (µs) | Cada artefacto auditado | Captura (A2b) | ALTA |
| A2f | Storage persistente | `data/events/` con índice | Generación (A2d) | ALTA |
| A2g | Pruebas de confiabilidad | Replicabilidad post-mortem | Implementación | **CRÍTICA** |

**Ejemplos de eventos clave:**
```
• Trade execution (Tito coloca orden)
• Order fill/rejection
• Position change (entry/exit)
• GEX flip (gamma regime inversion)
• IV spike/compression
• News arrival (macro/sectorial)
• Level touch (soporte/resistencia)
• Prediction target hit
• Liquidez "no fiable"
• Risk gate activation (SEATBELT)
```

---

#### A3. INTEGRACIÓN TAREA 6 EN PIPELINE OPERATIVO
**Estado:** 🟡 Especificación pendiente (post-Tarea 6 implementación)  
**Descripción:** Conectar salida de Tarea 6 (LiquidityGate) con decisiones operativas

**Requisitos detallados:**
| # | Requisito | Scope | Dependencia | Prioridad |
|---|-----------|-------|-------------|-----------|
| A3a | Ruta API `POST /api/liquidity-check` | REPL handler | Tarea 6 impl (A1b) | MEDIA |
| A3b | Feedback a GEX analysis | Si no fiable → modo "cautela" | Tarea 6 (A1e) | MEDIA |
| A3c | Log estructurado por evento | Cada decisión de liquidez | Tarea 6 impl (A1b) | MEDIA |
| A3d | Integración con decision-audit trail | Reporte de motivo HOLD/NO-TRADE | Decisión-audit (DONE) | MEDIA |

---

### CATEGORÍA B: INFRAESTRUCTURA & GUARDRAILS

#### B1. SISTEMA DE EVENTOS PERSISTENTE
**Estado:** 🟡 Existe parcialmente (bitácora), pendiente especialización  
**Descripción:** Almacenamiento y recuperación de eventos auditados con timestamp/hash

**Requisitos detallados:**
| # | Requisito | Scope | Dependencia | Prioridad |
|---|-----------|-------|-------------|-----------|
| B1a | Schema JSON para eventos | Tipos TypeScript | Definición A2a | **CRÍTICA** |
| B1b | Escritura atomática a disk | `data/events/{YYYYMMDD}.jsonl` | Schema (B1a) | **CRÍTICA** |
| B1c | Lectura indexada | Búsqueda por date/ticker/tipo | Almacenamiento (B1b) | ALTA |
| B1d | Compresión/archivado | Post-30d | Lectura (B1c) | MEDIA |
| B1e | Integridad de hash (opcional SHA256) | Detección de tampering | Escritura (B1b) | MEDIA |

---

#### B2. VALIDACIÓN POST-GENERACIÓN DE REPORTES
**Estado:** 🔴 NO ESPECIFICADO  
**Descripción:** Auditoría automática post-reporte para garantizar integridad y completitud

**Requisitos detallados:**
| # | Requisito | Scope | Dependencia | Prioridad |
|---|-----------|-------|-------------|-----------|
| B2a | Checksum de reporte | Validación de corrupción | Generación (A2d) | ALTA |
| B2b | Completitud de campos | Todos los campos esperados presentes | Schema (B1a) | ALTA |
| B2c | Rango de valores | Griegos en límites esperados | Captura (A2b) | MEDIA |
| B2d | Correlación temporal | Timestamp consistente con mercado | Timestamp (A2e) | MEDIA |

---

### CATEGORÍA C: DOCUMENTACIÓN & PROCESOS

#### C1. ESPECIFICACIÓN FORMAL DE TAREA 6
**Estado:** 🔴 NO EXISTE  
**Descripción:** Documento formal equivalente a S70_TAREA5_SPECIFICATION.md para Tarea 6

**Requisitos detallados:**
| # | Requisito | Scope | Dependencia | Prioridad |
|---|-----------|-------|-------------|-----------|
| C1a | Definición de "liquidez" | Criterios + fórmula | Proceso principal | **CRÍTICA** |
| C1b | Umbrales de evaluación | % disparidad, % del promedio | Spec Tarea 6 | **CRÍTICA** |
| C1c | Casos de prueba numéricos | 6 casos (C1-C6) como en Tarea 5 | Spec Tarea 6 | **CRÍTICA** |
| C1d | Anti-patterns Tarea 6 | 5-7 validaciones de borde | Spec Tarea 6 | ALTA |
| C1e | Integración con SEATBELT | Gate específica de liquidez | SEATBELT spec (DONE) | MEDIA |

---

#### C2. MANUAL DE EVENTOS Y CAPTURA
**Estado:** 🔴 NO EXISTE  
**Descripción:** Documento que lista eventos clave, cuándo capturar y qué contexto recopilar

**Requisitos detallados:**
| # | Requisito | Scope | Dependencia | Prioridad |
|---|-----------|-------|-------------|-----------|
| C2a | Listado exhaustivo de eventos | Enumeración | Definición A2a | **CRÍTICA** |
| C2b | Contexto requerido por evento | Griegos, precio, OI, etc. | Listado (C2a) | **CRÍTICA** |
| C2c | Timestamp mínimo | Precisión µs o ms | Spec temporal | ALTA |
| C2d | Ejemplos de captura/reporte | Muestras JSON reales | Contexto (C2b) | MEDIA |

---

### CATEGORÍA D: VALIDACIÓN & TESTING

#### D1. VALIDACIÓN E2E POST-IMPLEMENTACIÓN
**Estado:** 🔴 NO APLICABLE (Tarea 6 no implementada)  
**Descripción:** Pruebas de extremo a extremo: Datos → GEX → Liquidez → Decisión

**Requisitos detallados:**
| # | Requisito | Scope | Dependencia | Prioridad |
|---|-----------|-------|-------------|-----------|
| D1a | Escenario simulado: liquidez OK | Datos reales + evaluación OK | Tarea 6 impl (A1b) | MEDIA |
| D1b | Escenario simulado: no fiable | Datos reales + evaluación FAIL | Tarea 6 impl (A1b) | MEDIA |
| D1c | Escenario simulado: event capture | Trade real → reporte generado | A2a-A2d completado | MEDIA |
| D1d | Reproducibilidad de reporte | Mismo evento → mismo reporte | Persistencia (B1b) | MEDIA |

---

## III. MATRIZ DE DEPENDENCIAS

```
TAREA 5 (DONE ✅)
    ↓
TAREA 6 (ESPECIFICACIÓN → IMPLEMENTACIÓN → TESTS)
    ├─ A1a: Spec Tarea 6
    ├─ A1b: Impl LiquidityGate (depende A1a)
    ├─ A1f: Tests (depende A1b)
    └─ A1e: Integration SEATBELT (depende A1b)
    ↓
A2a-A2g: SISTEMA DE EVENTOS (en paralelo con Tarea 6)
    ├─ A2a: Definir eventos
    ├─ A2b-A2d: Captura/consolidación
    ├─ B1a-B1c: Almacenamiento
    └─ B2a-B2d: Validación
    ↓
A3a-A3d: INTEGRACIÓN TAREA 6 EN PIPELINE
    ↓
D1a-D1d: VALIDACIÓN E2E
    ↓
🟢 CAJA NEGRA V1 COMPLETA
```

---

## IV. ESTIMACIÓN DE ESFUERZO

| Categoría | Items | Estimado | Crítico |
|-----------|-------|----------|---------|
| **A. Tarea 6 + Eventos** | 13 items | 12-16h | ✅ SÍ |
| **B. Infraestructura** | 9 items | 6-8h | ✅ PARCIAL |
| **C. Documentación** | 8 items | 4-6h | ✅ SÍ |
| **D. Validación** | 4 items | 4-6h | MEDIA |
| **TOTAL** | **34 items** | **26-36h** | **26-34h críticas** |

---

## V. REQUISITO CRÍTICO NO ABORDADO EN TAREA 5

### 🔴 GENERACIÓN AUTOMÁTICA DE REPORTES/EVIDENCIA POR EVENTOS

**Por qué es crítico:**

1. **Auditoría post-trade:** Cuando Tito cierra una posición ganadora/perdedora, el sistema debe capturar automáticamente el contexto completo (precio entrada, precio salida, griegos en el momento, noticias relevantes, etc.)

2. **Reproducibilidad de decisiones:** Para auditar "¿por qué Tito entró?" o "¿por qué salió?", necesitamos la foto exacta del mercado en ese momento.

3. **Cumplimiento normativo:** Reportes automáticos por evento protegen frente a acusaciones de "decidiste esto después del hecho".

4. **Mejora continua:** El sistema de aprendizaje necesita datos estructurados de eventos para calibrarse.

**Lo que NO es:**

- ❌ Bitácora manual post-facto (llegamos a eso después)
- ❌ Reporte diario consolidado (puede ser posterior)
- ❌ Interfaz de usuario (data primero, UI después)

**Lo que SÍ es:**

- ✅ Captura automática de contexto EN el momento del evento
- ✅ Consolidación en reporte JSON/estructurado
- ✅ Persistencia en disco con timestamp/hash
- ✅ Recuperable para auditoría 6 meses después

---

## VI. PROPUESTA PARA PRÓXIMA SESIÓN

**Opción 1 (Recomendado):** 
```
1. Aprobación de Spec Tarea 6 (C1a-C1e) por Víctor
2. Implementación Tarea 6 (A1a-A1f)
3. Sistema de Eventos en paralelo (A2a-A2g + B1a-B1c)
4. Integración + E2E (A3 + D1)
```

**Opción 2 (Lite):**
```
1. Tarea 6 core (A1a-A1f) alone
2. Eventos pospuestos a sesión siguiente
```

**Opción 3 (Eventos first):**
```
1. Sistema de eventos (A2a-A2g) como infraestructura base
2. Tarea 6 después
```

---

## VII. PUNTOS DE DECISIÓN PARA VÍCTOR

1. **¿Prioridad Tarea 6 o Sistema de Eventos?** (Pueden ser paralelos)
2. **¿Generación automática de reportes en Caja Negra V1 o V2?** (Impacta 6h)
3. **¿Umbrales de liquidez en Tarea 6 = especificación + código, o especificación + mock?**
4. **¿E2E validation antes de merge a main o post-merge?**

---

## VIII. CONCLUSIÓN

**71 criterios PASS en Tarea 5 = punto de referencia limpio y recuperable.**

**34 requisitos pendientes = roadmap completo hacia Caja Negra V1.**

**Requisito crítico no previsto = Generación automática de reportes/evidencia (10-15% del esfuerzo total, pero 80% del valor de auditoría).**

**Sistema en HOLD, listo para instrucciones.**

---

**Generado:** 2026-09-13T13:42:30 UTC  
**Responsable:** Claude Haiku 4.5  
**Autorización requerida:** Víctor (decisión sobre orden/prioridad)

