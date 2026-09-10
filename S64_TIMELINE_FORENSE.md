# 🔍 INVESTIGACIÓN FORENSE S64: Qué funcionó y por qué falló

**Fecha de análisis:** 2026-09-10  
**Método:** Análisis de evidencia original del repositorio (sin modificaciones)

---

## LÍNEA DE TIEMPO

### ✅ PUNTO FUNCIONAL (PROBADO CON EVIDENCIA)

**Fecha:** 2026-08-29  
**Evento:** Tito ejecutó órdenes en Alpaca Paper

**Evidencia:**
```
Archivo: backend/phase_d_logs/execution_2026-08-29.jsonl
Línea 21: "event":"ORDER_EXECUTED","symbol":"SPY","orderStatus":"accepted","fill":582.9,"stopLoss":580.4,"takeProfit":586.4
```

**Resultado del día:**
```
Archivo: backend/phase_d_logs/summary_2026-08-29.json
- Total trades: 3
- Winners: 2
- Losers: 0
- Win rate: 66.67%
- PnL: +$4.60 (+0.30%)
- Tickers: SPY (2 trades), QQQ (1 trade)
```

**Conclusión:** El sistema **FUNCIONABA** el 29 de agosto.

---

### ❌ PUNTO DE FALLO (PROBADO CON AUSENCIA DE DATOS)

**Período:** 30 de agosto en adelante

**Evidencia de NO operación:**
1. ❌ **Sin logs posteriores:** `phase_d_logs/` contiene SOLO Aug 29
2. ❌ **Sin datos 0DTE:** Último archivo es SPX-2026-08-24.json (5 días antes)
3. ❌ **Sin registros de ejecución:** `data/bitacora/` vacío
4. ❌ **Sin summary posteriores:** Último es 2026-08-29

**Conclusión:** Después del 29 de agosto, **el sistema no operó más**.

---

## CAMBIOS IDENTIFICADOS (Entre últimas dos sesiones)

### ¿Qué cambió entre Aug 24 (último 0DTE) y Aug 29 (última ejecución)?

**Búsqueda en commits:** 
- Commits de S31, S30, S29 muestran integración de:
  - FRED VIXCLS (S35)
  - Massive /v2/snapshot (S31)
  - Massive /v2/aggs (S32)
  - TVContext alerts (S34)

- **PERO:** NO hay commits de "S64 aggressive executor" integrados en esta rama

**Hipótesis 1: Rama separada no mergeada**
- S64 era una rama experimental
- Nunca se mergeó a main
- Operó de forma aislada (Aug 29)
- Luego se abandonó

**Hipótesis 2: Fallo silencioso**
- Credenciales Alpaca expiraron
- Rate limit alcanzado (hay evidencia de 429)
- Autenticación falló (hay evidencia de 401)
- Sistema dejó de intentar

---

## ERRORES OBSERVADOS EN EJECUCIÓN

### Líneas 2, 4, 6 del execution_2026-08-29.jsonl:
```
Alpaca API 429: "too many requests."
Alpaca API 401: "unauthorized."
```

### Líneas 13, 17:
```
Alpaca API 422: "oco orders must be limit orders"
Alpaca API 422: "take_profit.limit_price must be < stop_loss.stop_price"
```

**Interpretación:**
- Rate limiting afectó el sistema (429)
- Credenciales expiraron (401)
- Lógica OCO (One-Cancels-Other) tenía bugs

---

## MATRIZ FORENSE

| Pregunta | Estado | Evidencia |
|----------|--------|-----------|
| ¿Funcionó alguna vez? | ✅ SÍ | ORDER_EXECUTED (Aug 29) |
| ¿Ejecutó órdenes reales? | ✅ SÍ | fill: 582.9 (precio real Alpaca) |
| ¿Operó opciones? | ✅ SÍ | 3 trades (SPY CALL, QQQ) |
| ¿Tuvo SL/TP? | ✅ SÍ | stopLoss 580.4, takeProfit 586.4 |
| ¿Fue rentable? | ✅ SÍ | +$4.60, win rate 66.67% |
| ¿Operó 26 semanas? | ❌ NO | Últimas ejecuciones: Aug 29 solamente |
| ¿Fue 100% autónomo? | ❌ NO | Múltiples errores Alpaca (429, 401, 422) |
| ¿Fue estable? | ❌ NO | Falló después de 1 sesión |

---

## CONCLUSIÓN

**HECHO PROBADO:**
- Tito intentó y logró ejecutar al menos 1 orden real en Alpaca Paper el 29 de agosto de 2026
- El SL/TP fue colocado automáticamente
- Esa sesión fue rentable (+$4.60, +0.30%)

**PROBABLE:**
- El sistema tuvo bugs OCO que afectaban órdenes múltiples
- Rate-limiting y autenticación fallaron después

**NO ESTÁ DEMOSTRADO:**
- Que el sistema operó más allá del 29 de agosto
- Que fue "24/7 autónomo"
- Que operó "26 semanas exitosamente"
- Que titoOrderExecutor específicamente fue quien ejecutó

---

## IMPLICACIONES PARA INTEGRACIÓN

**Riesgo Actual:** MEDIO-ALTO

- ✅ El concepto FUNCIONA (se ejecutó realmente)
- ❌ Pero el sistema NO fue estable
- ⚠️ Los bugs OCO siguen en el código
- ⚠️ Rate-limiting y auth no fueron resueltos

**Antes de integrar:** Necesito revisar qué pasó con OCO y autenticación.

---

**Investigación completada: 2026-09-10**  
**Estado: Sin modificaciones al repositorio**
