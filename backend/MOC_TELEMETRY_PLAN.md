# MOC Telemetry Plan — Contexto Adicional para Futuras Pruebas

**Versión:** 1.0  
**Fecha:** 2026-08-29  
**Estado:** Documentación + Integración (sin órdenes ejecutadas)  
**Implementación:** Sesión 20+, cuando ejecutemos pruebas

---

## 🎯 Propósito

MOC (Market on Close) / Closing Imbalance se registra como **contexto de confirmación** para decisiones de SPY/QQQ, especialmente en últimos 10 minutos de trading.

**¿QUÉ ES?**
- Data de NYSE sobre órdenes acumuladas al cierre (buy/sell imbalance)
- Medida de presión de compra vs venta en última hora
- Confirmación para decisiones cercanas al cierre (15:50-16:00 ET)

**¿QUÉ NO ES?**
- ❌ Señal principal de orden
- ❌ Criterio de exclusión (no bloquea órdenes de Tito)
- ❌ Modificación a Tito Core v0.3.0 (congelación intacta)
- ❌ Base para órdenes directas en MOC

---

## 📊 Qué Se Registrará

### En Cada Trade (si es cercano al cierre: 15:50-16:00 ET)

```json
{
  "ticker": "SPY",
  "time": "15:55:00",
  "decision": "CALL",
  
  "mocNetImbalance": 125000,
  "mocDirection": "compra",
  "mocMagnitude": "alta",
  "mocConfirmation": "alcista",
  "mocAlignment": "confirmada",
  "mocChangeFromOpen": 45000
}
```

**Interpretación:**
- `mocNetImbalance`: 125,000 → Más órdenes de COMPRA acumuladas
- `mocDirection`: "compra" → Presión alcista
- `mocMagnitude`: "alta" → Imbalance significativo
- `mocConfirmation`: "alcista" → Favorece movimientos alcistas
- `mocAlignment`: "confirmada" → La decisión CALL de Tito está confirmada
- `mocChangeFromOpen`: 45,000 → El imbalance de compra aumentó 45K desde open del cierre

### En Resumen Diario

```json
{
  "totalTrades": 5,
  "closingHourTrades": 2,
  "mocContext": {
    "tradesNearClose": 2,
    "averageImbalance": 85000,
    "imbalanceDirection": "compra",
    "alignedTrades": 2,
    "contradictedTrades": 0,
    "averageChangeFromOpen": 30000
  }
}
```

---

## 🔄 Clasificación MOC

| Net Imbalance | Dirección | Magnitud | Interpretación |
|--------------|-----------|----------|----------------|
| > +200K | Compra | Muy Alta | Fuerte presión de compra |
| +50K a +200K | Compra | Alta | Presión de compra |
| +20K a +50K | Compra | Media | Ligera presión de compra |
| -20K a +20K | Balance | Baja | Equilibrio |
| -50K a -20K | Venta | Media | Ligera presión de venta |
| -200K a -50K | Venta | Alta | Presión de venta |
| < -200K | Venta | Muy Alta | Fuerte presión de venta |

---

## 📈 Uso Futuro: Medición de Mejora

**Hipótesis a validar:**
> "¿Las confirmaciones de VIX + MOC mejoran la confianza y los resultados de SPY/QQQ en Paper Trading?"

### Métricas a Recopilar (Sesión 20+)

```
Para cada operación cercana al cierre (15:50-16:00 ET):

1. Decisión de Tito + Confianza
2. VIX Regime + Confirmación
3. MOC Imbalance + Dirección
4. Alineación combinada (VIX + MOC)
5. Resultado real (WIN/LOSS/BREAK_EVEN)

Después de N pruebas:
├─ Win rate SIN contexto (línea base)
├─ Win rate CON VIX
├─ Win rate CON MOC
├─ Win rate CON VIX + MOC
└─ Mejora % (si existe)
```

### Análisis Posterior (Sesión 21+)

```
Ejemplo de hallazgo:

Escenario: SPY CALL
├─ Tito Core: 75% confianza
├─ VIX: 14.2 (bajo) → Confirmada
├─ MOC: +150K (compra) → Confirmada
└─ Resultado: WIN ($3.50)

vs

Escenario: SPY CALL
├─ Tito Core: 75% confianza
├─ VIX: 28.5 (alto) → Contradice
├─ MOC: -120K (venta) → Contradice
└─ Resultado: LOSS (-$2.20)

Conclusión: Contexto múltiple mejora predicción
```

---

## 🔐 Restricciones (CONGELADAS)

**Tito Core NO se modifica:**
- ❌ MOC no afecta decisiones de Tito
- ❌ MOC no bloquea órdenes
- ❌ MOC no cambia pesos/umbrales
- ✅ MOC es CONTEXTO ADICIONAL, nada más

**En Paper Trading:**
- ✅ Registra MOC en cada operación (si datos disponibles)
- ✅ Documenta alineación (confirmada/contradice)
- ✅ Reporta en resumen
- ❌ NO ejecuta órdenes basadas en MOC

---

## 📋 Telemetría: Campos a Capturar

### Por Operación

```python
# Si operamos entre 15:50-16:00 ET
trade_log = {
    "timestamp": "2026-08-29T15:55:30Z",
    "ticker": "SPY",
    "titoDecision": "CALL",
    "titoConfidence": 78,
    
    # VIX Context
    "vixValue": 14.2,
    "vixConfirmation": "alcista",
    "vixAlignment": "confirmada",
    
    # MOC Context
    "mocNetImbalance": 125000,
    "mocDirection": "compra",
    "mocConfirmation": "alcista",
    "mocAlignment": "confirmada",
    "mocChangeFromOpen": 45000,
    
    # Resultado
    "entryPrice": 582.15,
    "exitPrice": 585.50,
    "pnlDollars": 3.35,
    "result": "WIN"
}
```

### Agregación Diaria

```python
summary = {
    "date": "2026-08-29",
    "closingHourStats": {
        "totalTradesNearClose": 2,
        "tradesWithMOCData": 2,
        "mocConfirmedTrades": 2,
        "mocContradictedTrades": 0,
        "averageImbalance": 125000,
        "winRateNearClose": "100%",
        "winRateAllDay": "75%"
    }
}
```

---

## 🚀 Implementación Roadmap

### Sesión 20 (Primera Prueba)
- ✅ Registrar VIX
- ⏳ Registrar MOC si disponible (data source TBD)
- ⏳ Documentar alineación

### Sesión 21+ (Después de 5+ pruebas)
- Recopilar métricas de mejora
- Comparar win rates (con/sin contexto)
- Análisis: ¿VIX + MOC mejoran confianza?

### Sesión 22+ (Si hay mejora comprobada)
- Considerar integración más profunda
- NUNCA modificar Tito Core
- Solo agregar capas de confirmación

---

## 📌 Regla de Oro

```
MOC es CONFIRMACIÓN, NO DECISIÓN

Si Tito dice: CALL
Y MOC dice:   Imbalance de compra (compra)
Entonces:     ✅ Confirmada (pero Tito manda)

Si Tito dice: CALL
Y MOC dice:   Imbalance de venta (venta)
Entonces:     ⚠️ Contradice (pero ejecutamos porque Tito manda)

MOC NO genera operación por sí solo
```

---

## 🔍 Data Source Considerations

**Opciones para obtener MOC:**
1. **NYSE Official** (mejor, pero puede requerir suscripción)
   - Datos en tiempo real: $
   - Datos históricos: ✓ (accesible)

2. **Alpaca Paper Trading** (verificar disponibilidad)
   - Puede exponer MOC en snapshot
   - Necesita investigación en Sesión 20

3. **Alternative Data** (si no está disponible)
   - Usar proxy: order flow intensity
   - Documentar limitación

**Acción:** Sesión 20 investigará dónde obtener MOC en vivo

---

## ✅ Checklist Implementación

- [ ] Sesión 20: Obtener fuente de MOC data
- [ ] Sesión 20: Registrar MOC en primeras operaciones
- [ ] Sesión 20: Documentar alineación VIX + MOC
- [ ] Sesión 21: Recopilar 5+ operaciones con contexto
- [ ] Sesión 21: Análisis: ¿mejora confianza?
- [ ] Sesión 22: Decidir si continuar registrando MOC

---

**Estado:** Telemetría lista para implementación  
**Implementación:** Sesión 20+, cuando ejecutemos órdenes  
**Modificaciones a Tito Core:** CERO  
**Órdenes MOC directas:** NINGUNA
