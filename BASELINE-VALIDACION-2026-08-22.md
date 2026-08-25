# 📊 BASELINE: Validación Inicial 0DTE — 2026-08-22

**Status:** ✅ **BASELINE EXITOSO**

---

## ✅ Estado Base Confirmado

| Componente | Estado | Observación |
|---|---|---|
| **App loads** | ✅ | http://localhost:3000/0dte carga sin error 500 |
| **UI renders** | ✅ | Selector, tabla, gráfica, conclusión visible |
| **Selector ticker** | ✅ | BTC, ETH, SPX disponibles |
| **Tabla ChainLine** | ✅ | Headers: Strike, Vol Call, Vol Put, Delta, Gamma |
| **Datos poblados** | ✅ | Tabla tiene >10 filas (18 en BTC) |
| **Gráfica SVG** | ✅ | Velas + cono + líneas de escenarios renderizan |
| **Conclusión Ejecutiva** | ✅ | Card con resumen en lenguaje llano |
| **Tabs** | ✅ | Flujo, Descubridor, Evaluación visibles |

---

## 📡 APIs Verificadas

| API | HTTP | Response | Status |
|---|---|---|---|
| `/api/0dte?ticker=BTC` | 200 | JSON con table, scenarios, gex | ✅ |
| `/api/0dte/flow?ticker=BTC` | 200 | JSON con cycles, contracts, reads | ✅ |
| `/api/0dte/eval?ticker=BTC` | 200 | JSON con métricas o empty | ✅ |
| `/api/0dte/discover` | 200 | JSON con candidates | ✅ |

---

## 📈 Métricas Baseline

```
Timestamp: 2026-08-22T23:15:00Z

BTC Metrics:
  - Chain rows: 18
  - Flow cycles: 1
  - Flow contracts: 5
  - Eval MAE: null (esperado, primer ciclo)
  - Latency: <1s

ETH Metrics:
  - Chain rows: 14
  - Flow cycles: 1
  - Flow contracts: 3
  - Eval MAE: null (esperado)
  - Latency: <1s
```

---

## 🎯 Referencia para Comparación (Ciclos Siguientes)

**Usar este baseline para detectar anomalías:**

- ✅ Rows deben mantenerse >10
- ✅ Cycles deben incrementar (1, 2, 3...)
- ✅ Latency debe seguir <2s
- ✅ Eval se llenará después del primer cierre

**Anomalía = diferencia significativa de este baseline.**

---

## 📋 Próximo Paso

**Sábado 08:00 ET: Primer ciclo automático**

```bash
bash scripts/validate-0dte.sh BTC 2026-08-23
bash scripts/validate-0dte.sh ETH 2026-08-23
```

Comparar resultados contra este baseline.

---

**BASELINE ESTABLECIDO.** Proceder con ciclos automáticos del fin de semana.

