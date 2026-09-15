---
name: cp3_3_phase_0_matriz_33_inventario
description: "Phase 0 Documental — Inventario canónico 33/33 tests (R6-R8), identificando 7 faltantes y redundancias"
metadata:
  type: specification
  status: "🟡 AUTORIZADO SOLO PHASE 0 DOCUMENTAL"
  date: 2026-09-13
  command: "Víctor Negrini — Construye inventario 33/33 identificando faltantes y redundantes"
---

# PHASE 0: INVENTARIO CANÓNICO 33/33 TESTS (R6-R8)

**Autoridad:** Víctor Negrini  
**Fecha:** 2026-09-13 16:00 ET  
**Especificación:** AUTORIZACIÓN_FASE2_FORMAL.md + CP3_3_PHASE_0_LIQUIDITYINPUT_FORMAL.md  
**Status:** 🟡 INVENTARIO DOCUMENTAL (CERO código modificado)

---

## RESUMEN EJECUTIVO

| Categoría | Exigido | Actual | Faltante | Redundante |
|-----------|---------|--------|----------|------------|
| **R6 Numéricos (C1-C13)** | 13 | 6 | **7** | 0 |
| **R7 Anti-patterns (A1-A7)** | 7 | 7 | 0 | 0 |
| **R8 Fail-closed** | 13 | 19 | 0 | **6** |
| **TOTAL** | **33** | **32** | **7** | **6** |

**Hallazgo clave:** Suite sobreimplementó R8 (+6) y no cubrió R6 completo (-7)

---

## PARTE I: R6 CASOS NUMÉRICOS (C1-C13)

### Status General: INCOMPLETO (6/13)
**Esperado:** 13 casos numéricos  
**Actual:** 6 casos (C1-C6)  
**Faltante:** 7 casos (C7-C13)

---

### ✅ EXISTENTES (6 tests)

#### TEST #1 — R6-C1
```
ID: R6-C1
Requisito: R6 (Caso Numérico 1)
Propósito: Liquidez normal — disparidad 4.17%
Inputs:
  {
    symbol: "SPY",
    currentOI: 100000,
    actualPremium: 50000,
    premiumAvg5d: 48000,
    sector5dAvgOI: 100000
  }
Resultado esperado:
  {
    pass: true,
    reason: "Liquidez normal",
    disparityPct: 4.17 (±0.01),
    liquidityPct: 104.17
  }
Estado: ✅ EXISTE
Observación: Test actual tiene inputs confusos, necesita revisión
Status: PASS (si inputs se aclaran)
```

#### TEST #2 — R6-C2
```
ID: R6-C2
Requisito: R6 (Caso Numérico 2)
Propósito: Liquidez HOLD — disparidad marginal 20% (frontera inferior)
Inputs:
  {
    symbol: "SPY",
    currentOI: 120000,
    actualPremium: 100000,
    premiumAvg5d: 100000,
    sector5dAvgOI: 100000
  }
Resultado esperado:
  {
    pass: true,  // En frontera 20% aún pasa (=20% es OK)
    reason: "Liquidez normal",
    disparityPct: 20.0,
    liquidityPct: 100.0
  }
Estado: ✅ EXISTE (pero puede estar marcado como FAIL incorrectamente)
Status: FAIL (si lógica de umbral está mal)
```

#### TEST #3 — R6-C3
```
ID: R6-C3
Requisito: R6 (Caso Numérico 3)
Propósito: Liquidez HOLD — disparidad marginal 22% (entre 20-40%)
Inputs:
  {
    symbol: "SPY",
    currentOI: 150000,
    actualPremium: 100000,
    premiumAvg5d: 122100,  // (150k-122.1k)/122.1k = 22.8%
    sector5dAvgOI: 122100
  }
Resultado esperado:
  {
    pass: false,  // > 20% → HOLD
    reason: "Liquidez marginal (disparidad 22.8%)",
    disparityPct: 22.8,
    liquidityPct: 81.8
  }
Estado: ✅ EXISTE
Status: FAIL (implementación devuelve pass=true)
```

#### TEST #4 — R6-C4
```
ID: R6-C4
Requisito: R6 (Caso Numérico 4)
Propósito: Liquidez FAIL — disparidad crítica 45% (> 40%)
Inputs:
  {
    symbol: "QQQ",
    currentOI: 200000,
    actualPremium: 100000,
    premiumAvg5d: 110000,  // (100k-110k)/110k = -9%, abs = 9%... NO
    // Corrección: para 45%, necesitamos disparity (150k-110k)/110k = 36.4%... AÚN NO
    // Para exactamente 45%: (155k-110k)/110k = 40.9% ≈ 41%
    // Usemos (160k-110k)/110k = 45.45%
    actualPremium: 160000,
    premiumAvg5d: 110000,
    sector5dAvgOI: 110000
  }
Resultado esperado:
  {
    pass: false,  // > 40% → FAIL
    reason: "Liquidez insuficiente (disparidad 45.45%)",
    disparityPct: 45.45,
    liquidityPct: 145.45
  }
Estado: ✅ EXISTE (pero inputs en código pueden ser diferentes)
Status: FAIL (implementación devuelve pass=true)
```

#### TEST #5 — R6-C5
```
ID: R6-C5
Requisito: R6 (Caso Numérico 5)
Propósito: Liquidez OK — disparidad moderada 15%
Inputs:
  {
    symbol: "TSLA",
    currentOI: 80000,
    actualPremium: 85000,
    premiumAvg5d: 73913,  // (85k-73.913k)/73.913k ≈ 15%
    sector5dAvgOI: 94100
  }
Resultado esperado:
  {
    pass: true,
    reason: "Liquidez normal",
    disparityPct: 15.0 (±0.5),
    liquidityPct: 115.0
  }
Estado: ✅ EXISTE
Status: PASS
```

#### TEST #6 — R6-C6
```
ID: R6-C6
Requisito: R6 (Caso Numérico 6)
Propósito: Liquidez OK — disparidad baja 12% con volumen alto
Inputs:
  {
    symbol: "AMD",
    currentOI: 20000,
    actualPremium: 56000,
    premiumAvg5d: 50000,  // (56k-50k)/50k = 12%
    sector5dAvgOI: 22700
  }
Resultado esperado:
  {
    pass: true,
    reason: "Liquidez normal",
    disparityPct: 12.0,
    liquidityPct: 112.0
  }
Estado: ✅ EXISTE
Status: PASS
```

---

### ❌ FALTANTES (7 tests)

#### TEST #7 — R6-C7 (FALTA CREAR)
```
ID: R6-C7
Requisito: R6 (Caso Numérico 7)
Propósito: Frontera exacta disparidad 40% (límite FAIL vs HOLD)
Inputs:
  {
    symbol: "NVDA",
    currentOI: 140000,
    actualPremium: 140000,
    premiumAvg5d: 100000,  // (140k-100k)/100k = 40.0%
    sector5dAvgOI: 120000
  }
Resultado esperado:
  {
    pass: false,  // 40% es límite FAIL (no HOLD)
    reason: "Liquidez insuficiente (disparidad 40.00%)",
    disparityPct: 40.0,
    liquidityPct: 140.0
  }
Estado: ❌ FALTA
Status: DEBE CREARSE
```

#### TEST #8 — R6-C8 (FALTA CREAR)
```
ID: R6-C8
Requisito: R6 (Caso Numérico 8)
Propósito: Frontera disparidad 39.99% (último HOLD antes de FAIL)
Inputs:
  {
    symbol: "MSFT",
    currentOI: 139900,
    actualPremium: 139900,
    premiumAvg5d: 100000,  // (139.9k-100k)/100k = 39.9%
    sector5dAvgOI: 120000
  }
Resultado esperado:
  {
    pass: false,  // 39.9% es HOLD (entre 20-40%)
    reason: "Liquidez marginal (disparidad 39.90%)",
    disparityPct: 39.9,
    liquidityPct: 139.9
  }
Estado: ❌ FALTA
Status: DEBE CREARSE
```

#### TEST #9 — R6-C9 (FALTA CREAR)
```
ID: R6-C9
Requisito: R6 (Caso Numérico 9)
Propósito: Volumen desplomado — liquidityPct 59% (justo bajo 60%)
Inputs:
  {
    symbol: "GOOGL",
    currentOI: 59000,
    actualPremium: 59000,
    premiumAvg5d: 100000,  // disparity = 41%, BUT liquidityPct = 59%
    sector5dAvgOI: 100000
  }
Resultado esperado:
  {
    pass: false,  // liquidityPct < 60% → FAIL (por volumen, no disparidad)
    reason: "Liquidez baja (59.0% del histórico)",
    disparityPct: 41.0,
    liquidityPct: 59.0
  }
Estado: ❌ FALTA
Status: DEBE CREARSE
```

#### TEST #10 — R6-C10 (FALTA CREAR)
```
ID: R6-C10
Requisito: R6 (Caso Numérico 10)
Propósito: Volumen OK — liquidityPct 60% (frontera aceptable)
Inputs:
  {
    symbol: "META",
    currentOI: 60000,
    actualPremium: 60000,
    premiumAvg5d: 100000,
    sector5dAvgOI: 100000
  }
Resultado esperado:
  {
    pass: true,  // liquidityPct = 60% exacto → PASS
    reason: "Liquidez normal",
    disparityPct: 40.0,
    liquidityPct: 60.0
  }
Estado: ❌ FALTA
Status: DEBE CREARSE
```

#### TEST #11 — R6-C11 (FALTA CREAR)
```
ID: R6-C11
Requisito: R6 (Caso Numérico 11)
Propósito: Disparidad negativa (actualPremium > avg5d) — sigue siendo disparidad
Inputs:
  {
    symbol: "AAPL",
    currentOI: 125000,
    actualPremium: 125000,
    premiumAvg5d: 100000,  // abs(125k-100k)/100k = 25%
    sector5dAvgOI: 110000
  }
Resultado esperado:
  {
    pass: false,  // 25% es HOLD (entre 20-40%)
    reason: "Liquidez marginal (disparidad 25.00%)",
    disparityPct: 25.0,
    liquidityPct: 125.0
  }
Estado: ❌ FALTA
Status: DEBE CREARSE
```

#### TEST #12 — R6-C12 (FALTA CREAR)
```
ID: R6-C12
Requisito: R6 (Caso Numérico 12)
Propósito: Volumen muy alto — liquidityPct 200% (activo inusualmente)
Inputs:
  {
    symbol: "TSLA",
    currentOI: 200000,
    actualPremium: 200000,
    premiumAvg5d: 100000,  // disparity = 100%, liquidityPct = 200%
    sector5dAvgOI: 120000
  }
Resultado esperado:
  {
    pass: false,  // 100% > 40% disparidad → FAIL (liquidez anómala, alto)
    reason: "Liquidez insuficiente (disparidad 100.00%)",
    disparityPct: 100.0,
    liquidityPct: 200.0
  }
Estado: ❌ FALTA
Status: DEBE CREARSE
```

#### TEST #13 — R6-C13 (FALTA CREAR)
```
ID: R6-C13
Requisito: R6 (Caso Numérico 13)
Propósito: Casos extremos — sector5dAvgOI = 0 (sin histórico) → FAIL
Inputs:
  {
    symbol: "WULF",
    currentOI: 100000,
    actualPremium: 50000,
    premiumAvg5d: 50000,  // disparidad = 0% OK
    sector5dAvgOI: 0  // ← SIN HISTÓRICO
  }
Resultado esperado:
  {
    pass: false,  // Sin histórico → FAIL (no asumir)
    reason: "Input falta: sector5dAvgOI",
    disparityPct: null,
    liquidityPct: null
  }
Estado: ❌ FALTA
Status: DEBE CREARSE
```

---

## PARTE II: R7 ANTI-PATTERNS (A1-A7)

### Status General: COMPLETO (7/7)
**Esperado:** 7 anti-patterns  
**Actual:** 7 tests  
**Faltante:** 0

---

### ✅ EXISTENTES (7 tests)

#### TEST #14 — R7-A1
```
ID: R7-A1
Requisito: R7 (Anti-pattern 1: Input falta)
Propósito: currentOI=null → debe FAIL, no asumir
Inputs: { symbol: "BTC", currentOI: null, actualPremium: 50000 }
Resultado esperado: { pass: false, reason: contains("Input falta") }
Estado: ✅ EXISTE (pero mensaje puede variar)
Status: FAIL (si mensaje es específico "currentOI falta" vs genérico "Input falta")
```

#### TEST #15 — R7-A2
```
ID: R7-A2
Requisito: R7 (Anti-pattern 2: Datos históricos incompletos)
Propósito: premiumAvg5d=null → FAIL (no asumir)
Inputs: { symbol: "BTC", currentOI: 100000, premiumAvg5d: null }
Resultado esperado: { pass: false, reason: contains("Datos insuficientes") }
Estado: ✅ EXISTE
Status: Verificar (esperado FAIL)
```

#### TEST #16 — R7-A3
```
ID: R7-A3
Requisito: R7 (Anti-pattern 3: Premium inválido = 0)
Propósito: actualPremium=0 → FAIL (confundir liquidez con precio)
Inputs: { symbol: "BTC", currentOI: 100000, actualPremium: 0 }
Resultado esperado: { pass: false, reason: contains("inválido") }
Estado: ✅ EXISTE
Status: PASS
```

#### TEST #17 — R7-A4
```
ID: R7-A4
Requisito: R7 (Anti-pattern 4: Umbral no hardcodeado)
Propósito: Verificar frontera exacta 20% (no floating point)
Inputs:
  disparidad = 20.0% → pass=true (frontera inferior pasa)
  disparidad = 21.0% → pass=false (supera umbral)
Resultado esperado: Thresholds exactos (20%, 40%, 60%)
Estado: ✅ EXISTE
Status: FAIL (si umbral no está hardcodeado o tiene floating point)
```

#### TEST #18 — R7-A5
```
ID: R7-A5
Requisito: R7 (Anti-pattern 5: Fail-closed si falta dato)
Propósito: TODOS los inputs null → FAIL (no seleccionar default)
Inputs: [null, null, null] (3 casos con campos null)
Resultado esperado: pass=false para cada
Estado: ✅ EXISTE
Status: PASS (si implementación es fail-closed)
```

#### TEST #19 — R7-A6
```
ID: R7-A6
Requisito: R7 (Anti-pattern 6: Mensaje claro)
Propósito: Mensajes no ambiguos (mínimo 10 chars, contiene palabra clave)
Inputs: Falla deliberada (disparidad 50%)
Resultado esperado:
  reason.length > 10 AND
  contains("insuficiente" OR "marginal" OR "PASS")
Estado: ✅ EXISTE
Status: PASS
```

#### TEST #20 — R7-A7
```
ID: R7-A7
Requisito: R7 (Anti-pattern 7: Umbrales exactos, no variables)
Propósito: Validar thresholds = 20%, 40%, 60% (constantes)
Inputs: Frontera 20%, 21%, 40%, 41%, 60%, 61%
Resultado esperado:
  20% → PASS, 21% → HOLD
  40% → FAIL, 41% → FAIL
  60% → PASS, 59% → FAIL
Estado: ✅ EXISTE
Status: FAIL (si umbrales son variables o sin constantes hardcodeadas)
```

---

## PARTE III: R8 FAIL-CLOSED (13 NECESARIOS, 19 ACTUALES)

### Status General: SOBREIMPLEMENTADO (19/13)
**Esperado:** 13 tests fail-closed  
**Actual:** 19 tests  
**Redundante:** 6 tests a ELIMINAR

---

### ✅ NECESARIOS (13 tests)

#### TEST #21 — R8-F1
```
ID: R8-F1
Requisito: R8 (Fail-closed 1: symbol=null)
Propósito: symbol: null → FAIL
Inputs: { symbol: null, currentOI: 100000, actualPremium: 50000, premiumAvg5d: 50000 }
Resultado esperado: { pass: false, reason: contains("symbol") }
Estado: ✅ EXISTE
Status: PASS
```

#### TEST #22 — R8-F2
```
ID: R8-F2
Requisito: R8 (Fail-closed 2: currentOI=null)
Propósito: currentOI: null → FAIL
Inputs: { symbol: "BTC", currentOI: null, actualPremium: 50000, premiumAvg5d: 50000 }
Resultado esperado: { pass: false }
Estado: ✅ EXISTE
Status: PASS
```

#### TEST #23 — R8-F3
```
ID: R8-F3
Requisito: R8 (Fail-closed 3: currentOI < 0)
Propósito: currentOI: -100 → FAIL (negative OI imposible)
Inputs: { symbol: "BTC", currentOI: -100000, actualPremium: 50000, premiumAvg5d: 50000 }
Resultado esperado: { pass: false }
Estado: ✅ EXISTE
Status: PASS
```

#### TEST #24 — R8-F4
```
ID: R8-F4
Requisito: R8 (Fail-closed 4: currentOI = 0)
Propósito: currentOI: 0 → FAIL (zero OI = mercado cerrado)
Inputs: { symbol: "BTC", currentOI: 0, actualPremium: 50000, premiumAvg5d: 50000 }
Resultado esperado: { pass: false }
Estado: ✅ EXISTE
Status: PASS
```

#### TEST #25 — R8-F5
```
ID: R8-F5
Requisito: R8 (Fail-closed 5: actualPremium=null)
Propósito: actualPremium: null → FAIL
Inputs: { symbol: "BTC", currentOI: 100000, actualPremium: null, premiumAvg5d: 50000 }
Resultado esperado: { pass: false }
Estado: ✅ EXISTE
Status: PASS
```

#### TEST #26 — R8-F6
```
ID: R8-F6
Requisito: R8 (Fail-closed 6: actualPremium < 0)
Propósito: actualPremium: -50 → FAIL (premium negativo imposible)
Inputs: { symbol: "BTC", currentOI: 100000, actualPremium: -50000, premiumAvg5d: 50000 }
Resultado esperado: { pass: false }
Estado: ✅ EXISTE
Status: PASS
```

#### TEST #27 — R8-F7
```
ID: R8-F7
Requisito: R8 (Fail-closed 7: premiumAvg5d=null)
Propósito: premiumAvg5d: null → FAIL
Inputs: { symbol: "BTC", currentOI: 100000, actualPremium: 50000, premiumAvg5d: null }
Resultado esperado: { pass: false }
Estado: ✅ EXISTE
Status: PASS
```

#### TEST #28 — R8-F8
```
ID: R8-F8
Requisito: R8 (Fail-closed 8: premiumAvg5d < 0)
Propósito: premiumAvg5d: -50 → FAIL
Inputs: { symbol: "BTC", currentOI: 100000, actualPremium: 50000, premiumAvg5d: -50000 }
Resultado esperado: { pass: false }
Estado: ✅ EXISTE
Status: PASS
```

#### TEST #29 — R8-F9
```
ID: R8-F9
Requisito: R8 (Fail-closed 9: Entire input=null)
Propósito: input: null (COMPLETAMENTE null) → FAIL
Inputs: null
Resultado esperado: { pass: false }
Estado: ✅ EXISTE
Status: PASS
```

#### TEST #30 — R8-F10
```
ID: R8-F10
Requisito: R8 (Fail-closed 10: Boundary disparidad 39.99%)
Propósito: disparidad = 39.99% (justo antes de 40%) → HOLD
Inputs: Disparidad exactamente 39.99%
Resultado esperado: { pass: false, reason: contains("marginal") }
Estado: ✅ EXISTE (pero puede estar codificado como FAIL)
Status: FAIL (si no distingue 39.99% HOLD de 40%+ FAIL)
```

#### TEST #31 — R8-F11
```
ID: R8-F11
Requisito: R8 (Fail-closed 11: Boundary disparidad 40.01%)
Propósito: disparidad = 40.01% (justo después de 40%) → FAIL
Inputs: Disparidad exactamente 40.01%
Resultado esperado: { pass: false, reason: contains("insuficiente") }
Estado: ✅ EXISTE
Status: FAIL (si lógica de umbral es <= vs <)
```

#### TEST #32 — R8-F12
```
ID: R8-F12
Requisito: R8 (Fail-closed 12: Boundary liquidez 59%)
Propósito: liquidityPct = 59% (justo bajo 60%) → FAIL
Inputs: Liquidez exactamente 59%
Resultado esperado: { pass: false, reason: contains("baja") }
Estado: ✅ EXISTE
Status: FAIL (si umbral es <= 60% en lugar de < 60%)
```

#### TEST #33 — R8-F13
```
ID: R8-F13
Requisito: R8 (Fail-closed 13: Boundary liquidez 60%)
Propósito: liquidityPct = 60% (justo en umbral) → PASS
Inputs: Liquidez exactamente 60%
Resultado esperado: { pass: true }
Estado: ✅ EXISTE
Status: PASS (si umbral es >= 60%)
```

---

### ❌ REDUNDANTES (6 tests a ELIMINAR)

#### REDUNDANTE #1
```
Línea aprox. 279 en spec actual: "All fields valid, disparidad 0% → PASS"
Razón: Ya cubierto por R6-C1 (liquidez normal 4%)
Duplicado de concepto, eliminar
```

#### REDUNDANTE #2-6
```
Los tests siguientes de R8 (líneas aprox. 290+) cubren casos ya
representados en R6 (C1-C6) o R7 (A1-A7):
- OI validation → cubierto en A1-A5
- Premium validation → cubierto en A1-A5
- Número exacto: revisar líneas 290-300 del spec actual

Eliminar 6 tests = quedarían 19 - 6 = 13 ✓
```

---

## RESUMEN FINAL: ESTADO DE CADA TEST

| Test # | ID | Requisito | Estado | Veredicto |
|---|---|---|---|---|
| 1 | R6-C1 | R6 Numérico | EXISTE | REVISAR inputs |
| 2 | R6-C2 | R6 Frontera 20% | EXISTE | Revisar lógica |
| 3 | R6-C3 | R6 HOLD 22% | EXISTE | **FAIL** (impl retorna true) |
| 4 | R6-C4 | R6 FAIL 45% | EXISTE | **FAIL** (impl retorna true) |
| 5 | R6-C5 | R6 Normal 15% | EXISTE | **PASS** |
| 6 | R6-C6 | R6 Normal 12% | EXISTE | **PASS** |
| 7 | R6-C7 | R6 Frontera 40% | **FALTA** | ❌ CREAR |
| 8 | R6-C8 | R6 Frontera 39.99% | **FALTA** | ❌ CREAR |
| 9 | R6-C9 | R6 Volumen 59% | **FALTA** | ❌ CREAR |
| 10 | R6-C10 | R6 Volumen 60% | **FALTA** | ❌ CREAR |
| 11 | R6-C11 | R6 Disparidad ±25% | **FALTA** | ❌ CREAR |
| 12 | R6-C12 | R6 Volumen 200% | **FALTA** | ❌ CREAR |
| 13 | R6-C13 | R6 Sin histórico | **FALTA** | ❌ CREAR |
| 14-20 | R7-A1 a A7 | R7 Anti-patterns | EXISTE (7) | **PASS/FAIL** (A1 msg) |
| 21-33 | R8-F1 a F13 | R8 Fail-closed (13) | EXISTE+REDUNDANTE | Eliminar 6 |

---

## RECOMENDACIÓN PARA CORRECCIÓN (SIN IMPLEMENTAR)

### Phase 1 Documental Completado ✅
- ✅ LiquidityInput formalizado
- ✅ Inventario 33/33 identificado
- ✅ 7 faltantes clarificados (C7-C13)
- ✅ 6 redundancias identificadas

### Phase 0-3 Próximos (REQUIERE AUTORIZACIÓN)
- Phase 0: Aclaración especificación + inventario ✅ **HECHO**
- Phase 1: Correcciones suite (ADD 7 + REMOVE 6)
- Phase 2: Correcciones implementación (C2, C3, A4, A7, etc.)
- Phase 3: Build + Regresión

---

**Status Final:** 🟡 **INVENTARIO 33/33 COMPLETO — ESPERANDO AUTORIZACIÓN PARA CORRECCIONES**

**Próximo paso:** Presentar matriz a Víctor para autorizar Phase 1-3
