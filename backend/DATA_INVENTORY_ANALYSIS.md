# Data Inventory Analysis — Infraestructura Existente para FLOW/Levels/GEX/VIX/MOC

**Versión:** 1.0  
**Fecha:** 2026-08-29  
**Estado:** Análisis Completo  
**Objetivo:** Mapear todos los datos disponibles automáticamente vs. los que necesitan fuente externa

---

## 📊 INVENTARIO COMPLETO

### 1. FLOW / Order Flow (web/lib/flow.ts)

| Dato | Fuente | Automático | Disponible Ahora | Falta | Uso en Tito |
|------|--------|-----------|-----------------|-------|------------|
| Ask/Bid Aggression | MarketSnack time & sales | ✅ Sí | ✅ Sí | - | ✅ Usar S20 |
| Ask/Bid Dominance % | Calculado de trades | ✅ Sí | ✅ Sí | - | ✅ Usar S22 |
| Aggression Score (0-100) | `aggressionScore()` | ✅ Sí | ✅ Sí | - | ✅ Usar S22 |
| Premium ponderado Ask | `askPrem` acumulado | ✅ Sí | ✅ Sí | - | ✅ Usar S22 |
| Premium ponderado Bid | `bidPrem` acumulado | ✅ Sí | ✅ Sí | - | ✅ Usar S22 |
| Multileg detection | Condición OPRA | ✅ Sí | ✅ Sí | - | ✅ Usar S22 |
| Repetición de strikes | Ventana 5 min | ✅ Sí | ✅ Sí | - | ✅ Usar S22 |
| Simultaneous trades | Mismo timestamp | ✅ Sí | ✅ Sí | - | ✅ Usar S22 |
| Size scoring (0-10) | `orderSizeScore()` | ✅ Sí | ✅ Sí | - | ✅ Usar S22 |
| Volume vs OI | `exceededOI` flag | ✅ Sí | ✅ Sí | - | ✅ Usar S22 |
| Timing score (0-10) | Hora del trade (ET) | ✅ Sí | ✅ Sí | - | ✅ Usar S22 |
| **TOTAL FLOW** | **MarketSnack** | **✅ 100%** | **✅ Sí** | **-** | **Listo S20** |

**Fuente requerida:** MarketSnack time & sales (ya disponible en web, ✅ verificado)

---

### 2. LEVELS / Concentraciones + Soportes/Resistencias (web/lib/levels.ts)

| Dato | Fuente | Automático | Disponible Ahora | Falta | Uso en Tito |
|------|--------|-----------|-----------------|-------|------------|
| Pivot highs/lows | Precio histórico | ✅ Sí | ✅ Sí | - | ✅ Usar S22 |
| Pivot clustering | Tolerancia % | ✅ Sí | ✅ Sí | - | ✅ Usar S22 |
| Level strength (0-100) | Toques + OI + gamma | ✅ Sí | ✅ Sí | Depende GEX | ⏳ S22 |
| OI por strike | Massive snapshot | ⏳ Condicional | ✅ Sí | - | ✅ Usar S22 |
| Call/Put walls | OI concentrado | ✅ Sí (si OI) | ✅ Sí | - | ✅ Usar S22 |
| Flow premium por strike | FLOW + levels | ✅ Sí | ✅ Sí | - | ✅ Usar S22 |
| GEX imán (nivel) | GEX analysis | ⏳ Condicional | ✅ Sí | - | ✅ Usar S22 |
| Recency factor | Días desde toque | ✅ Sí | ✅ Sí | - | ✅ Usar S22 |
| Level flipped (era techo) | Histórico | ✅ Sí | ✅ Sí | - | ✅ Usar S22 |
| **TOTAL LEVELS** | **Massive + FLOW** | **✅ 90%** | **✅ Sí** | **OI data** | **Listo S22** |

**Fuente requerida:** Massive open interest + Alpaca bardata (✅ verificado)

---

### 3. GEX / Gamma Exposure (web/lib/gex.ts)

| Dato | Fuente | Automático | Disponible Ahora | Falta | Uso en Tito |
|------|--------|-----------|-----------------|-------|------------|
| Gamma por strike | Black-Scholes | ✅ Sí | ✅ Sí | - | ✅ Usar S20 |
| GEX neto por strike | Gamma × OI × spot² | ✅ Sí | ✅ Sí | - | ✅ Usar S20 |
| GEX imán (mayor gamma+) | Búsqueda en cadena | ✅ Sí | ✅ Sí | - | ✅ Usar S20 |
| Zona de inversión gamma | Gamma flip point | ✅ Sí | ✅ Sí | - | ✅ Usar S20 |
| Régimen (γ+ vs γ-) | Signo de GEX neto | ✅ Sí | ✅ Sí | - | ✅ Usar S20 |
| Concentración (OI + flow) | 0.6×OI + 0.4×premium | ✅ Sí | ✅ Sí | - | ✅ Usar S20 |
| Confianza GEX | Nitidez + scores | ✅ Sí | ✅ Sí | - | ✅ Usar S20 |
| IV por contrato | Chain o Black-Scholes | ✅ Sí (hybrid) | ✅ Sí | - | ✅ Usar S20 |
| vanna/charm (Greeks) | `bsVanna()` / `bsCharm()` | ✅ Sí | ✅ Sí | - | ✅ Usar S22 |
| **TOTAL GEX** | **Massive + BS** | **✅ 100%** | **✅ Sí** | **-** | **Listo S20** |

**Fuente requerida:** Massive option chain (✅ verificado en dashboard)

---

### 4. VIX / Volatilidad (web/lib/ivcontext.ts)

| Dato | Fuente | Automático | Disponible Ahora | Falta | Uso en Tito |
|------|--------|-----------|-----------------|-------|------------|
| IV actual | Massive chain | ✅ Sí | ✅ Sí | - | ✅ Usar S20 |
| IV ponderado | Premium × IV | ✅ Sí | ✅ Sí | - | ✅ Usar S20 |
| Volatilidad realizada | Series de cierres | ✅ Sí | ✅ Sí | - | ✅ Usar S20 |
| IV Rank | Realizado vs histórico | ✅ Sí (después 60d) | ⏳ Parcial | Historial 365d | ✅ Usar S20 |
| Régimen de vol | Bandas (dormida/compresión/normal/expansión) | ✅ Sí | ✅ Sí | - | ✅ Usar S20 |
| Skew del frente | IV front month | ✅ Sí | ✅ Sí | - | ✅ Usar S22 |
| IV Context Score (0-100) | `ivContextScore()` | ✅ Sí | ✅ Sí | - | ✅ Usar S20 |
| **TOTAL VIX** | **Massive** | **✅ 95%** | **✅ Sí** | **Historial largo** | **Listo S20** |

**Fuente requerida:** Massive option chain (✅ verificado)

---

### 5. MOC / Closing Imbalance (INVESTIGACIÓN S22)

| Dato | Fuente | Automático | Disponible Ahora | Falta | Uso en Tito |
|------|--------|-----------|-----------------|-------|------------|
| Net Imbalance | NYSE data | ❌ No | ❌ No | **Investigar** | ⏳ S22 |
| Buy vs Sell volume | NYSE data | ❌ No | ❌ No | **Investigar** | ⏳ S22 |
| Imbalance direction | Calculado | ✅ Sí (si data) | ❌ No | **Data source** | ⏳ S22 |
| Imbalance magnitude | Clasificación | ✅ Sí (si data) | ❌ No | **Data source** | ⏳ S22 |
| Change from open | Histórico | ❌ No | ❌ No | **Investigar** | ⏳ S22 |
| **TOTAL MOC** | **NYSE official** | **❌ 0%** | **❌ No** | **Source externa** | **Falta data** |

**Fuente requerida:** NYSE Market Imbalance data (❌ NO disponible aún, ⏳ investigar S22)

---

## 📋 TABLA RESUMEN EJECUTIVA

```
DATO                  FUENTE              AUTO  AHORA  FALTA              USO
─────────────────────────────────────────────────────────────────────────────
FLOW                  MarketSnack         ✅    ✅     -                  S20
Levels                Massive + FLOW      ✅    ✅     -                  S22
GEX                   Massive + BS        ✅    ✅     -                  S20
VIX                   Massive             ✅    ✅     Historial 365d     S20
─────────────────────────────────────────────────────────────────────────────
MOC                   NYSE official       ❌    ❌     Source externa     S22*

* Requiere investigación en S22 para encontrar fuente de datos NYSE Imbalance
```

---

## ✅ RECOMENDACIONES

### Sesión 20 (LISTO)
- ✅ VIX: Capturar automáticamente (infrastructure completa)
- ✅ GEX: Usar lo existente en gexAnalysis()
- ✅ FLOW: Usar lo existente en classifyFlow()
- ✅ Levels: Usar lo existente en findLevels()

### Sesión 22 (INVESTIGAR)
- 📋 MOC: ¿NYSE Market Imbalance disponible en:
  - Massive API? (check docs)
  - Alpaca Paper endpoints? (check)
  - Alternative source? (MarketWatch, Bloomberg Terminal, etc.)
- ✅ FLOW Context: Copiar desde web/lib/flow.ts (seguro)
- ✅ Levels Context: Copiar desde web/lib/levels.ts (seguro)

### Sesión 23+ (VALIDACIÓN)
- Recopilar 5+ operaciones con todas las capas
- Matriz: ¿qué combinaciones mejoran?
- Decidir: ¿mantener MOC o no?

---

## 🔒 RESTRICCIONES

- ❌ NO modificar web/lib/*.ts (código ya funciona perfectamente)
- ❌ NO modificar Tito Core (congelado v0.3.0)
- ✅ SÍ copiar tipos/funciones a backend/flowContext.ts (seguro)
- ✅ SÍ reutilizar en logging como CONTEXTO (no como señal)
- ❌ NO implementar fuente externa sin autorización

---

**Estado:** Inventario completo. Listo para Sesión 20 (VIX/GEX/FLOW/Levels).  
**Bloqueador único:** MOC requiere investigación en S22.  
**Modificaciones a Tito Core:** CERO
