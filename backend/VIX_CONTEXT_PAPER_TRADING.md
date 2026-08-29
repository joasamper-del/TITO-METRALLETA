# VIX Context en Paper Trading — Fase D

**Versión:** 1.0  
**Fecha:** 2026-08-29  
**Estado:** Documentación (sin implementación aún, sin órdenes ejecutadas)

---

## 🎯 Propósito

VIX se agrega como **contexto de confirmación** para decisiones de SPY/QQQ en Paper Trading.

**¿QUÉ ES?**
- Indicador de volatilidad (proxy de SPY vol, NO índice oficial CBOE)
- Confirmación para decisiones de Tito Core
- Documento de régimen de mercado

**¿QUÉ NO ES?**
- ❌ Señal principal de orden
- ❌ Criterio de exclusión (no bloquea órdenes de Tito)
- ❌ Modificación a Tito Core v0.3.0 (congelación intacta)
- ❌ Base para órdenes directas en VIX

---

## 📊 Cómo Aparece en Reportes

### En Cada Trade (Trading Log)

```json
{
  "ticker": "SPY",
  "decision": "CALL",
  "confidence": 78,
  "titoReasons": ["Gamma positivo", "TAPE fuerte"],
  
  "vixValue": 14.5,
  "vixRegime": "normal",
  "vixConfirmation": "alcista",
  "vixAlignment": "confirmada"
}
```

**Qué significa:**
- `vixValue`: 14.5 → Volatilidad en rango normal
- `vixRegime`: "normal" → Entorno neutral/estable
- `vixConfirmation`: "alcista" → VIX bajo favorece movimientos alcistas
- `vixAlignment`: "confirmada" → La decisión CALL de Tito está confirmada por VIX bajo

### En Resumen Diario

```json
{
  "totalTrades": 5,
  "vixContext": {
    "average": 15.2,
    "regime": "normal",
    "highestVIX": 18.5,
    "lowestVIX": 12.1,
    "alignedTrades": 4,
    "contradictedTrades": 1
  }
}
```

---

## 🔄 Clasificación VIX

| VIX | Régimen | Interpretación | Para SPY/QQQ |
|-----|---------|----------------|--------------|
| < 12 | Baja | Mercado tranquilo | ✅ Favorece CALL, confirma alcistas |
| 12-16 | Normal | Volatilidad normal | ⚪ Neutral, decisión por Tito Core |
| 16-25 | Media | Volatilidad moderada | ⚪ Neutral/cauteloso, confirmación adicional |
| > 25 | Alta | Mercado estresado | ⚠️ Favorece defensivo (PUT, WAIT, NO TRADE) |

---

## ✅ Validación: Tito vs VIX

### Escenario 1: CALL con VIX bajo (CONFIRMADA)
```
Tito Core: "CALL" (confianza 82%)
VIX:       14.2 (baja) → favorece alcistas
Resultado: ✅ CONFIRMADA

En reporte: "Decisión CALL respaldada por baja volatilidad"
```

### Escenario 2: CALL con VIX alto (CONTRADICE)
```
Tito Core: "CALL" (confianza 75%)
VIX:       28.3 (alta) → favorece defensivo
Resultado: ⚠️ CONTRADICE

En reporte: "Decisión CALL ejecutada; nota: VIX alto típicamente favorece puts"
```

### Escenario 3: PUT con VIX alto (CONFIRMADA)
```
Tito Core: "PUT" (confianza 68%)
VIX:       26.1 (alta) → favorece defensivo
Resultado: ✅ CONFIRMADA

En reporte: "Decisión PUT respaldada por alta volatilidad"
```

---

## 📋 En Dashboard /paper

Información agregada **sin modificar panel principal:**

### Tarjeta Adicional (opcional)
```
📊 VIX Context
─────────────
Valor:      14.2
Régimen:    Normal
Tendencia:  Lateral
Confirmación: Alcista
```

### En Detalles de Cada Trade
```
Decisión:     SPY CALL
Confianza:    78%
P&L:          $3.50 WIN

VIX Context:
├─ Valor:         14.5
├─ Régimen:       Normal
├─ Confirmación:  Alcista
└─ Alineación:    ✅ Confirmada
```

---

## 🔐 Restricciones (CONGELADAS)

**Tito Core NO se modifica:**
- ❌ VIX no afecta decisiones de Tito
- ❌ VIX no bloquea órdenes
- ❌ VIX no cambia pesos/umbrales
- ✅ VIX es CONTEXTO ADICIONAL, nada más

**En Paper Trading:**
- ✅ Registra VIX en cada operación
- ✅ Documenta alineación (confirmada/contradice)
- ✅ Reporta en resumen
- ❌ NO ejecuta órdenes basadas en VIX

---

## 📝 Ejemplo: Reporte Completo

```
PAPER TRADING REPORT — 2026-08-29

Trade #1: SPY CALL
├─ Tito Core Decision: CALL (78%)
├─ Entry: $582.15 | Exit: $585.50 | P&L: $3.35 WIN
├─ Razones Tito: Gamma+, TAPE fuerte
└─ VIX Context:
   ├─ Valor: 14.5 (normal)
   ├─ Confirmación: Alcista ✅
   └─ Alineación: Confirmada
   
   → Análisis: Decisión CALL de Tito confirmada por
     volatilidad baja (VIX 14.5). Entorno favorable
     para movimientos alcistas. Ejecución exitosa.

Trade #2: QQQ PUT
├─ Tito Core Decision: PUT (62%)
├─ Entry: $385.25 | Exit: $382.10 | P&L: $3.15 WIN
├─ Razones Tito: Patrón divergencia
└─ VIX Context:
   ├─ Valor: 16.2 (normal→media)
   ├─ Confirmación: Neutral
   └─ Alineación: Neutral (sin contradicción)
   
   → Análisis: Decisión PUT de Tito sin confirmación
     de VIX, pero tampoco contradice. Volatilidad
     normal/media. Ejecución correcta.

═════════════════════════════════════════
RESUMEN:
├─ Trades: 2 | Win Rate: 100%
├─ VIX Promedio: 15.4 (normal)
├─ Trades Confirmados: 1
├─ Trades Neutrales: 1
└─ P&L Total: $6.50

DISCLAIMER: VIX es proxy de volatilidad de SPY,
NO índice oficial CBOE. Usado solo como contexto
de confirmación, nunca como señal principal.
```

---

## 🚀 Cómo Se Usará en Fase D

### Sesión 20+ (Cuando Ejecutemos)

1. **Durante ejecución:**
   - Traer VIX actual
   - Clasificar régimen
   - Evaluar alineación con decisión Tito
   - Registrar en trade log

2. **En dashboard:**
   - Mostrar VIX actual como indicador
   - Color: Verde (baja), Amarillo (normal), Rojo (alta)
   - Nota: "Contexto, no decisión"

3. **En reporte:**
   - Listar VIX para cada trade
   - Marcar alineación (✅ confirmada / ⚠️ contradice / ⚪ neutral)
   - Análisis: "¿confirmó o contradijo el regime?"

4. **Sin modificar:**
   - Tito Core v0.3.0 (congelado)
   - Reglas/pesos/umbrales
   - Lógica de decisión

---

## 📌 Regla de Oro

```
VIX es CONFIRMACIÓN, NO DECISIÓN

Si Tito dice: CALL
Y VIX dice:   Baja volatilidad
Entonces:     ✅ Confirmada (pero Tito manda)

Si Tito dice: CALL
Y VIX dice:   Alta volatilidad
Entonces:     ⚠️ Contradice (pero ejecutamos porque Tito manda)
```

---

**Estado:** Documentación lista para implementación  
**Implementación:** Sesión 20+, cuando ejecutemos órdenes  
**Modificaciones a Tito Core:** CERO  
**Órdenes VIX directas:** NINGUNA  
