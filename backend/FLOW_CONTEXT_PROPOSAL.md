# FLOW/Order Flow Context — Propuesta para Sesión 22

**Versión:** 1.0  
**Fecha:** 2026-08-29  
**Estado:** Investigación + Propuesta (NO integrado aún)  
**Implementación:** Sesión 22+, SOLO como contexto/confirmación  

---

## 📊 Hallazgos: Infrastructure Existente

El proyecto YA tiene un sistema completo de FLOW:

```
web/lib/flow.ts
├─ RawTrade: trades crudos de MarketSnack
├─ Aggression: clasificación ("ask", "bid", "mid", "unknown")
├─ FlowRow: fila procesada con todas las métricas
├─ FlowFlags: big, convDelta, aboveAsk, belowBid, leap, repeated, multileg, simultaneous, exceededOI
├─ TradeScores: volume (0-10), timing (0-10), repetition (0-10)
└─ aggressionScore(): calcula dominancia ask/bid por premium
```

**Datos ya disponibles:**
- ✅ Ask/Bid/Mid aggression
- ✅ Premium ponderado (ask vs bid)
- ✅ Flags de multileg, repetición, simultáneos
- ✅ Score de agresividad
- ✅ Timestamp preciso

**Reutilización segura:**
- NO modificar web/lib/flow.ts (ya funciona perfectamente)
- COPIAR tipos y funciones a backend/flowContext.ts
- USAR para crear contexto de confirmación
- NO integrar en decisiones de Tito Core

---

## 🎯 Propuesta: FLOW Context (Sesión 22+)

### Concepto

FLOW (orden agresividad) como **contexto de confirmación** similar a VIX/MOC:

```
Tito Core Decision: CALL
├─ Confianza: 78%
├─ VIX: 14.2 (bajo) → Alcista ✅
├─ MOC: +125K (compra) → Alcista ✅
└─ FLOW: Ask-dominated → Compras agresivas ✅
  
Resultado: Triple confirmación, muy confiable
```

### Datos a Capturar

**Por ventana de tiempo (últimos N minutos antes de operación):**

```json
{
  "timeWindow": "últimos 5 min antes de entrada",
  "askVolume": 2500000,      // $ premium en trades ask
  "bidVolume": 850000,       // $ premium en trades bid
  "askVsTotal": 0.75,        // Ask como % del total
  "dominance": "ask",        // Dirección dominante
  "multilegCount": 2,        // Cuántos spreads/multileg
  "repetitionCount": 3,      // Cuántas repeticiones del mismo strike
  "simultaneousCount": 1,    // Ejecutiones simultáneas en mismo timestamp
  "averageSize": 45000,      // Promedio de premium por trade
  "timeBeforeMarketClose": 240,  // Minutos al cierre
  
  "confirmation": "alcista",  // Para CALL
  "alignment": "confirmada"   // Con decisión de Tito
}
```

### Clasificación FLOW

| Ask % | Dominance | Interpretación | Para CALL |
|-------|-----------|----------------|-----------|
| > 75% | Ask | Compras muy agresivas | ✅ Confirmada |
| 60-75% | Ask | Compras agresivas | ✅ Confirmada |
| 40-60% | Balance | Equilibrio | ⚪ Neutral |
| 25-40% | Bid | Ventas agresivas | ⚠️ Contradice |
| < 25% | Bid | Ventas muy agresivas | ❌ Contradice |

### Validación con Tito

```typescript
// Pseudocódigo para Sesión 22+

function validateFlowWithTito(
  titoDecision: "CALL" | "PUT" | "WAIT" | "NO TRADE",
  flowDominance: "ask" | "bid" | "balance"
): {
  aligned: boolean;
  alignment: "confirmada" | "neutral" | "contradice";
  reason: string;
} {
  if (flowDominance === "balance") {
    return {
      aligned: true,
      alignment: "neutral",
      reason: "FLOW neutral: Tito Core toma decisión sin restricción"
    };
  }
  
  if (flowDominance === "ask" && titoDecision === "CALL") {
    return {
      aligned: true,
      alignment: "confirmada",
      reason: "✅ FLOW ask CONFIRMA CALL: compras agresivas"
    };
  }
  
  if (flowDominance === "bid" && (titoDecision === "PUT" || titoDecision === "NO TRADE")) {
    return {
      aligned: true,
      alignment: "confirmada",
      reason: "✅ FLOW bid CONFIRMA PUT/defensiva: ventas agresivas"
    };
  }
  
  // Si contradice...
  return { aligned: false, alignment: "contradice", reason: "..." };
}
```

---

## 🔐 Restricciones (CONGELADAS)

**Tito Core NO se modifica:**
- ❌ FLOW no afecta decisiones de Tito
- ❌ FLOW no bloquea órdenes
- ❌ FLOW no cambia pesos/umbrales
- ✅ FLOW es CONTEXTO ADICIONAL, nada más

**Reutilización segura:**
- ✅ Copiar tipos de web/lib/flow.ts
- ✅ Usar aggressionScore() existente
- ❌ NO modificar web/lib/flow.ts
- ❌ NO integrar en Tito Core

---

## 📊 Arquitectura Final (Sesión 22+)

```
DECISIÓN TITO CORE (CONGELADO)
    ↓
├─ Confianza: 0-100
├─ Decisión: CALL/PUT/WAIT/NO TRADE
└─ Razones: 3-5 elementos

    ↓ CONFIRMACIONES (NO GENERAN ÓRDENES)
    
├─ VIX Context (Sesión 20)
│  ├─ Régimen volatilidad (baja/normal/media/alta)
│  └─ Alineación: ✅/⚠️/❌
│
├─ MOC Context (Sesión 20)
│  ├─ Closing imbalance (15:50-16:00 ET)
│  └─ Alineación: ✅/⚠️/❌
│
└─ FLOW Context (Sesión 22)
   ├─ Agresividad ask/bid (últimos N min)
   └─ Alineación: ✅/⚠️/❌

    ↓ RESULTADO
    
DECISIÓN EJECUTADA + TRIPLE CONTEXTO REGISTRADO
(Sin modificar lógica congelada)
```

---

## 🔍 Plan Sesión 22

### Capas a Investigar

**Capa 4A: FLOW/Order Flow Aggressiveness**
- Ask/Bid dominance en últimos N minutos
- Premium ponderado por aggression
- Multileg vs single-leg
- Repetición de strikes

**Capa 4B: Options Levels / Concentraciones Institucionales**
- Concentración por strike (call/put walls)
- GEX imán (nivel con mayor gamma positivo)
- Posibles zonas imán (atracción de precio)
- Grandes movimientos de prima (institucionales)
- Cambios de dirección en flujo

### Paso 1: Investigación de Datos Disponibles
**FLOW:**
- ¿Alpaca Paper expone order flow?
- ¿MarketSnack time & sales en vivo?
- ¿Qué lag tiene?

**Options Levels:**
- ¿Massive expone open interest por strike?
- ¿GEX levels accesibles?
- ¿Historial de concentraciones?
- SPX vs SPY vs QQQ: ¿cuál tiene mejor data?

### Paso 2: Propuesta para Revisión
- Crear backend/flowContext.ts (FLOW + Levels)
- Documentar qué reutilizar de web/lib/
- Mostrar a usuario ANTES de integrar

### Paso 3: Normalización de Datos
```
Raw data → Normalized metrics:
├─ FLOW: ask%, bid%, dominance
├─ Levels: strike_concentration, wall_strength, iman_zone
├─ GEX: gamma_regime, imán_level
└─ Agregado: índice_de_presión (0-100)
```

### Paso 4: Validación Retrospectiva (Sesión 23+)
**Objetivo: Medir qué combinaciones mejoran decisiones de Tito**

```
Matriz de Validación:

Escenario 1: CALL de Tito
├─ VIX: Alcista ✅
├─ MOC: Alcista ✅
├─ FLOW: Ask-dominated ✅
└─ Levels: En zona imán ✅
Resultado: WIN → Triple confirmación validada

Escenario 2: CALL de Tito
├─ VIX: Alcista ✅
├─ MOC: Neutral ⚪
├─ FLOW: Bid-dominated ❌
└─ Levels: Lejos de imán ❌
Resultado: LOSS → Contradicción de FLOW/Levels

Pregunta: ¿Escenarios con 4/4 confirmaciones tienen mejor win rate?
```

### Paso 5: Captura de Datos (Sesión 20+)
**Ya está registrándose:**
- VIX ✅
- MOC (si disponible) ✅
- FLOW (propuesto) 📋
- Levels (propuesto) 📋

**En logging:**
```json
{
  "ticker": "SPY",
  "titoDecision": "CALL",
  "vixContext": { ... },
  "mocContext": { ... },
  "flowContext": { ... },      // Sesión 22
  "levelsContext": { ... }     // Sesión 22
}
```

---

## ⚠️ Consideraciones

1. **Data Availability:**
   - MarketSnack proporciona flow time & sales
   - Alpaca Paper puede no exponer flow en vivo
   - Necesitará investigación en Sesión 22

2. **Latency:**
   - FLOW es más reciente que VIX/MOC
   - Puede capturar movimientos última hora
   - Útil para confirmar cerca del cierre

3. **Congelación Intacta:**
   - Tito Core v0.3.0 NUNCA se modifica
   - FLOW = solo medición, nunca señal
   - Reutilizar código existente sin cambios

---

## ✅ Roadmap Confirmación Multidimensional

| Sesión | Capa | Status | Datos |
|--------|------|--------|-------|
| 20 | VIX | ✅ Implementado | Volatilidad/régimen |
| 20 | MOC | ✅ Implementado | Closing imbalance |
| 22 | FLOW | 📋 Propuesto | Order flow aggression |
| 23+ | Análisis | ⏳ Futuro | ¿Mejora triple? |

---

**Estado:** Propuesta lista para Sesión 22  
**Modificaciones a Tito Core:** CERO  
**Reutilización de código existente:** Sí (segura)  
**Órdenes FLOW directas:** NINGUNA
