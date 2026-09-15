---
name: cp3_3_phase_0_liquidityinput_formal
description: "Phase 0 Documental — Formalización de LiquidityInput con actualPremium vs premiumAvg5d"
metadata:
  type: specification
  status: "🟡 AUTORIZADO SOLO PHASE 0 DOCUMENTAL"
  date: 2026-09-13
  command: "Víctor Negrini — Formaliza aclaración de LiquidityInput"
---

# PHASE 0 DOCUMENTAL: FORMALIZACIÓN DE LiquidityInput

**Autoridad:** Víctor Negrini  
**Fecha:** 2026-09-13 15:58 ET  
**Scope:** Aclaración definitiva de inputs LiquidityInput (actualPremium vs premiumAvg5d)  
**Status:** 🟡 AUTORIZADO (SOLO este documento, CERO código)

---

## I. ESPECIFICACIÓN OFICIAL (CLAUSURADA)

### Definición Formal de LiquidityInput

```typescript
/**
 * DEFINICIÓN CANÓNICA — R2 (Tarea 6: Evaluación de Liquidez)
 * 
 * Formaliza completamente los inputs para evaluateLiquidity() según:
 * - Autorización Fase 2 (AUTORIZACIÓN_FASE2_FORMAL.md)
 * - Especificación Fase 1 (FASE_1_ESPECIFICACION_FORMAL.md)
 */

export interface LiquidityInput {
  /**
   * Símbolo del subyacente (ej: "SPY", "QQQ", "BTC")
   * Requerido: SÍ
   * Tipo: string
   * Validación: No null, no empty, uppercase
   */
  symbol: string;

  /**
   * Open Interest ACTUAL de la cadena (número de contratos abiertos HOY)
   * Requerido: SÍ
   * Tipo: number (entero positivo)
   * Unidad: Contratos
   * Ejemplo: 100000 = 100k contratos abiertos
   * Validación: > 0
   */
  currentOI: number;

  /**
   * PREMIUM ACTUAL (bid price) del strike hoy
   * Requerido: SÍ (CLAVE: diferente de premiumAvg5d)
   * Tipo: number (positivo)
   * Unidad: $ por acción
   * Ejemplo: 50000 = $50k total si OI=100k (bid=$0.50/acción × 100 shares)
   * 
   * CLARIFICACIÓN CRÍTICA:
   * - actualPremium = bid price del strike AHORA
   * - Representa capital actual comprometido en posiciones abiertas
   * - Calculado como: OI × bid_price_per_share × 100_shares_per_contract
   * - Entrada al usuario: bid price (en $) del contrato
   * 
   * Validación: > 0
   */
  actualPremium: number;

  /**
   * PREMIUM PROMEDIO 5 DÍAS (referencia histórica)
   * Requerido: SÍ (CLAVE: diferente de actualPremium)
   * Tipo: number (positivo)
   * Unidad: $ por acción (consistente con actualPremium)
   * Ejemplo: 48000 = promedio de últimos 5 días de trading
   * 
   * CLARIFICACIÓN CRÍTICA:
   * - premiumAvg5d = promedio de bid prices últimos 5 días
   * - Representación histórica para detectar anomalías
   * - Calculado como: sum(daily_bid_prices[5 días]) / 5
   * - Entrada al usuario: promedio histórico (no individual)
   * 
   * Validación: > 0
   */
  premiumAvg5d: number;

  /**
   * OPEN INTEREST PROMEDIO DEL SECTOR (5 días)
   * Requerido: NO (opcional, contexto sector)
   * Tipo: number (positivo)
   * Unidad: Contratos
   * Ejemplo: 100000 = promedio OI de los "7 Magníficos" últimos 5 días
   * 
   * Uso: Contextualizar si currentOI es normal o anómalo para el sector
   * Validación: > 0 o null
   */
  sector5dAvgOI?: number;
}
```

---

## II. FÓRMULA OFICIAL DE DISPARIDAD

### Definición
```
disparityPct = abs(actualPremium - premiumAvg5d) / premiumAvg5d × 100
```

### Interpretación
- **Qué mide:** Desviación % del premium ACTUAL vs promedio histórico 5d
- **Unidad:** Porcentaje (0-100+)
- **Rango normal:** 0-20% (liquidez ok)
- **Rango crítico:** 20-40% (liquidez marginal, HOLD)
- **Rango falla:** > 40% (liquidez insuficiente, FAIL)

### Ejemplos

#### Ejemplo 1: C1 (Liquidez OK)
```
actualPremium = $50,000
premiumAvg5d = $48,000

disparityPct = abs(50k - 48k) / 48k × 100
            = 2k / 48k × 100
            = 4.17%
            
Resultado: ✅ 4.17% < 40% → PASS
Liquidez normal
```

#### Ejemplo 2: C2 (Liquidez HOLD — Crítica)
```
actualPremium = $30,000
premiumAvg5d = $50,000

disparityPct = abs(30k - 50k) / 50k × 100
            = 20k / 50k × 100
            = 40%
            
Resultado: 🟡 40% = límite crítico → HOLD (pass=false)
Liquidez marginal — "datos podrían no ser fiables"
```

#### Ejemplo 3: C3 (Liquidez FAIL — Insuficiente)
```
actualPremium = $15,000
premiumAvg5d = $50,000

disparityPct = abs(15k - 50k) / 50k × 100
            = 35k / 50k × 100
            = 70%
            
Resultado: ❌ 70% > 40% → FAIL (pass=false)
Liquidez insuficiente — "datos no fiables, NO OPERAR"
```

---

## III. FÓRMULA OFICIAL DE LIQUIDEZ %

### Definición
```
liquidityPct = actualPremium / premiumAvg5d × 100
```

### Interpretación
- **Qué mide:** Razón de volumen ACTUAL vs histórico
- **Unidad:** Porcentaje (50-150 típico; extremos posibles)
- **Umbral:**
  - < 60% → FAIL (volumen desplomado, ilíquido)
  - ≥ 60% → OK (volumen normal o alto)

### Relación con Disparidad
- Si `liquidityPct = 100%` → volumen normal → disparidad = 0%
- Si `liquidityPct = 50%` → volumen a la mitad → disparidad = 50%
- **Nota:** No es lo mismo que disparidad; liquidityPct ignora dirección

### Ejemplos

#### Ejemplo: Liquidez Baja
```
actualPremium = $30,000
premiumAvg5d = $50,000

liquidityPct = 30k / 50k × 100 = 60%

Resultado: ✓ 60% = umbral exacto → PASS (mínimo aceptable)
Si fuera 59% → FAIL
```

---

## IV. LÓGICA DE EVALUACIÓN OFICIAL

```typescript
function evaluateLiquidity(input: LiquidityInput): LiquidityGate {
  // VALIDACIONES DE ENTRADA (FAIL-CLOSED)
  if (!input || !input.symbol || input.symbol.length === 0)
    return { pass: false, reason: "Input falta: symbol", ... };
  
  if (input.currentOI == null || input.currentOI <= 0)
    return { pass: false, reason: "Input falta: currentOI", ... };
  
  if (input.actualPremium == null || input.actualPremium <= 0)
    return { pass: false, reason: "Input falta: actualPremium", ... };
  
  if (input.premiumAvg5d == null || input.premiumAvg5d <= 0)
    return { pass: false, reason: "Input falta: premiumAvg5d", ... };
  
  // CÁLCULOS
  const disparityPct = Math.abs(input.actualPremium - input.premiumAvg5d) 
                     / input.premiumAvg5d * 100;
  
  const liquidityPct = input.actualPremium / input.premiumAvg5d * 100;
  
  // LÓGICA DE PUERTAS (THRESHOLDS DUROS)
  const THRESHOLD_HOLD = 20;   // % — limite marginal
  const THRESHOLD_FAIL = 40;   // % — limite inaceptable
  const THRESHOLD_LIQUIDITY = 60; // % — limite volumen
  
  // Puerta 1: Disparidad extrema
  if (disparityPct > THRESHOLD_FAIL) {
    return {
      pass: false,
      reason: `Liquidez insuficiente (disparidad ${disparityPct.toFixed(2)}%)`,
      disparityPct,
      liquidityPct,
    };
  }
  
  // Puerta 2: Disparidad marginal
  if (disparityPct > THRESHOLD_HOLD) {
    return {
      pass: false,
      reason: `Liquidez marginal (disparidad ${disparityPct.toFixed(2)}%)`,
      disparityPct,
      liquidityPct,
    };
  }
  
  // Puerta 3: Volumen desplomado
  if (liquidityPct < THRESHOLD_LIQUIDITY) {
    return {
      pass: false,
      reason: `Liquidez baja (${liquidityPct.toFixed(1)}% del histórico)`,
      disparityPct,
      liquidityPct,
    };
  }
  
  // TODO OK
  return {
    pass: true,
    reason: "Liquidez normal",
    disparityPct,
    liquidityPct,
  };
}
```

---

## V. CORRECCIÓN RETROACTIVA A CASOS

### Caso C1 (Revisión)
**Entrada CORRECTA (según especificación formalizada):**
```typescript
{
  symbol: "SPY",
  currentOI: 100000,
  actualPremium: 50000,      // ← Premium HOY (bid)
  premiumAvg5d: 48000,       // ← Promedio 5d
  sector5dAvgOI: 100000,
}
```

**Cálculo:**
- disparityPct = (50k - 48k) / 48k × 100 = 4.17% ✓
- liquidityPct = 50k / 48k × 100 = 104% ✓
- Resultado: PASS ✓

**Problema en suite actual:** Test usa inputs confusos (no define actualPremium por separado)

---

## VI. VALIDACIÓN FAIL-CLOSED

| Input | Valor | Resultado |
|-------|-------|-----------|
| symbol = null | — | FAIL |
| currentOI = null | — | FAIL |
| currentOI = 0 | — | FAIL |
| currentOI = -100 | — | FAIL |
| actualPremium = null | — | FAIL |
| actualPremium = 0 | — | FAIL |
| actualPremium = -50 | — | FAIL |
| premiumAvg5d = null | — | FAIL |
| premiumAvg5d = 0 | — | FAIL |
| premiumAvg5d = -50 | — | FAIL |

**Principio:** Si falta cualquier input requerido → FAIL (no asumir)

---

## VII. ESTADO FINAL

✅ **LiquidityInput formalizado completamente**
✅ **Disparidad % fórmula oficial: `abs(actual - avg5d) / avg5d × 100`**
✅ **Liquidez % fórmula oficial: `actual / avg5d × 100`**
✅ **Thresholds duros: 20% (HOLD), 40% (FAIL), 60% (LIQUIDITY)**
✅ **Lógica fail-closed documentada**

**Listo para:** Identificar inventario canónico 33 tests en documento siguiente

**Próximo paso:** Matriz 33/33 con cada test mapeado a esta especificación
