# Plan de Validación 24/7 con Crypto — Fin de Semana (Ago 22-25, 2026)

**Objetivo:** Validar máximo del sistema **sin tocar código**, usando Bitcoin/Ethereum options (Deribit, 24/7).  
**Scope:** APIs, indicadores, motor de análisis, scheduler.  
**Restricción:** Solo fix si hay error CRÍTICO. Sino, documentar todo para informe.

---

## 🎯 Estrategia

**Por qué crypto:**
- Bitcoin options en Deribit: 24/7, no espera a lunes
- Misma arquitectura que SPX (option chain, flujo, griegos)
- Permite probar scheduler cada 5 min sin tope de mercado
- Datos públicos, sin credenciales especiales

**Tickers a validar:** `BTC`, `ETH` (ambos tienen 0DTE: contracts vencen cada día)

**Periodo:** Hoy viernes + sábado + domingo (72h continuas si es posible)

---

## 📋 Checklist de Validación (sin código)

### Fase 1: Startup (Ahora — viernes noche)

- [ ] Levantar servidor: `npm run dev` en `web/`
- [ ] Abrir `/0dte?ticker=BTC` (o usar el selector)
- [ ] **Verificar UI carga sin 500** ✅
  - Tabla ChainLine visible
  - Gráfica SVG renderiza
  - Conclusión ejecutiva aparece
  
- [ ] **Verificar APIs responden (GET):** abrir DevTools → Network
  - `GET /api/0dte?ticker=BTC&date=YYYY-MM-DD` → 200, JSON válido
  - `GET /api/0dte/flow?ticker=BTC` → 200, JSON con `cycles`, `contracts`, `reads`
  - `GET /api/0dte/eval?ticker=BTC` → 200, JSON con métricas o "empty"
  - `GET /api/0dte/discover` → 200, JSON con candidatos
  
- [ ] **Verificar credenciales en `.env.local`:**
  ```bash
  # Debe tener estas keys (no exponer valores):
  SCHWAB_CLIENT_ID=***
  SCHWAB_CLIENT_SECRET=***
  MARKETSNACK_COOKIE=***
  MASSIVE_API_KEY=***
  ```
  Si falta alguna: ⚠️ Notar en informe (no es crítico si solo se valida UI con mocks)

### Fase 2: Recolección de Datos (Viernes noche + Sábado todo el día)

**Ciclo cada 30 min (manual o script):**

- [ ] **Ejecutar script de healthcheck** (ver abajo)
  - Guardar respuesta en `data/validation-run-{timestamp}.json`
  - Acumular 48 registros (2 por hora × 24 horas)

- [ ] **Tabla ChainLine:**
  - ✅ Strikes poblados (no vacío)
  - ✅ Bid/ask no negativos
  - ✅ Delta entre -1 y +1
  - ✅ Gamma positivo (siempre)
  - ✅ Filas ordenadas por strike ascendente
  - ⚠️ Nota si hay valores `null` / `-999` (Schwab sentinela)

- [ ] **Flujo (Agresor):**
  - ✅ `cycles` incrementa (no se resetea sin razón)
  - ✅ `contracts` > 0 si hay trades
  - ✅ `reads` es dict de contratos con `buy`, `sell`, `count`
  - ⚠️ Si `reads` está vacío pero hay volumen en chain: posible fallo de MarketSnack

- [ ] **Gráfica:**
  - ✅ Velas dibujan (candles recientes)
  - ✅ Cono de incertidumbre visible (bandas gris)
  - ✅ Escenarios tracen (líneas de ruta)
  - ⚠️ Si tardan >5s en renderizar: posible lag de datos

- [ ] **Conclusión Ejecutiva:**
  - ✅ Texto en lenguaje llano generado
  - ✅ "Imán" (target GEX) es un número razonable
  - ✅ "Régimen" es uno de: revierte/amplifica/normal
  - ✅ Top 3 strikes por agresividad listados

### Fase 3: Errores Detectados (Durante validación)

**Si ves alguno de estos → ES CRÍTICO (arreglar de una):**
- HTTP 500 en cualquier ruta → error del servidor
- `undefined` en valores numéricos de la tabla (excepto `-999`)
- Gráfica no renderiza (canvas negro o sin datos)
- Cycling infinito o timeout >30s

**Si ves estos → NOTAR pero NO es crítico:**
- ⚠️ Cookie de MarketSnack caduca (flujo queda vacío) → esperado, documentar
- ⚠️ Schwab devuelve 401 → token se renueva solo, reintentar
- ⚠️ Cobertura de gamma solo 47% → conocido, documentar
- ⚠️ Falta histórico en auto-evaluación → esperado primer día

### Fase 4: Scheduler (Lunes con Mercado)

**NO VALIDAR HOY.** Solo:
- [ ] Revisar que exista el código de scheduler en `lib/` (si existe)
- [ ] Notar si está implementado o NO existe
- [ ] Si existe: documentar qué hace (fetch cada X, perista dónde)

---

## 🔧 Script de Healthcheck Automático

**Copia esto en `web/scripts/validate-0dte.sh`:**

```bash
#!/bin/bash
# Healthcheck 0DTE — corre cada 30 min, acumula en JSON

TICKER="${1:-BTC}"
BASE="http://localhost:3000"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
OUTDIR="data/validation-runs"

mkdir -p "$OUTDIR"

echo "=== Healthcheck 0DTE [$TIMESTAMP] ===" >&2

# 1. API principal
echo -n "Checking /api/0dte... " >&2
CHAIN_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/0dte?ticker=$TICKER&date=$(date +%Y-%m-%d)")
CHAIN=$(curl -s "$BASE/api/0dte?ticker=$TICKER&date=$(date +%Y-%m-%d)" | jq '.')
echo "HTTP $CHAIN_HTTP" >&2

# 2. API flujo
echo -n "Checking /api/0dte/flow... " >&2
FLOW_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/0dte/flow?ticker=$TICKER")
FLOW=$(curl -s "$BASE/api/0dte/flow?ticker=$TICKER" | jq '.')
echo "HTTP $FLOW_HTTP" >&2

# 3. API eval
echo -n "Checking /api/0dte/eval... " >&2
EVAL_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/0dte/eval?ticker=$TICKER")
EVAL=$(curl -s "$BASE/api/0dte/eval?ticker=$TICKER" | jq '.')
echo "HTTP $EVAL_HTTP" >&2

# 4. Guardar JSON
cat > "$OUTDIR/run-${TICKER}-${TIMESTAMP}.json" << EOF
{
  "timestamp": "$TIMESTAMP",
  "ticker": "$TICKER",
  "chain": {
    "http": $CHAIN_HTTP,
    "data": $CHAIN
  },
  "flow": {
    "http": $FLOW_HTTP,
    "data": $FLOW
  },
  "eval": {
    "http": $EVAL_HTTP,
    "data": $EVAL
  }
}
EOF

echo "✅ Saved to $OUTDIR/run-${TICKER}-${TIMESTAMP}.json" >&2
```

**Uso:**
```bash
cd web
chmod +x scripts/validate-0dte.sh

# Correr cada 30 min:
# Opción A: manual
bash scripts/validate-0dte.sh BTC
bash scripts/validate-0dte.sh ETH

# Opción B: cron (background)
# */30 * * * * cd /path/to/Agente\ Tito\ Metralleta/web && bash scripts/validate-0dte.sh BTC >> /tmp/validate.log 2>&1
```

---

## 📊 Métricas a Acumular

**Durante las 72h, guardar:**

| Métrica | Cálculo | Esperado |
|---|---|---|
| **Latencia API** | tiempo curl | <1s |
| **Hit rate** | (200s / total requests) × 100 | >99% |
| **Strikes poblados** | len(table.rows) | >10 |
| **Volumen promedio** | mean(row.volume) | >0 |
| **Delta rango** | min/max de delta | [-1, +1] |
| **Gamma positivo** | 100% de gamma > 0 | 100% |
| **Flujo ciclos** | cycles registrados | incrementa cada fetch |
| **Uptime servidor** | no crashes | 100% |

**Archivo resumen:**
```
data/VALIDATION-REPORT-2026-08-25.json
{
  "period": "2026-08-22T20:00Z — 2026-08-25T18:00Z",
  "runs": 144,
  "api_hit_rate": 99.3,
  "avg_latency_ms": 847,
  "tickers_tested": ["BTC", "ETH"],
  "critical_errors": 0,
  "warnings": [
    "MarketSnack cookie might expire 2026-08-24 10:00Z",
    "Schwab gamma coverage ~47% (known, documented)"
  ],
  "ready_for_monday": true
}
```

---

## 🚦 Healthy vs. Unhealthy Estado

### ✅ Healthy (Green Light)
- [ ] Todas las APIs responden 200
- [ ] Tabla poblada con datos reales
- [ ] Gráfica renderiza sin lag
- [ ] Flujo acumula sin errores
- [ ] Uptime >99%
- [ ] Hit rate >98%

### ⚠️ Caution (Yellow Light)
- [ ] Un error 500 aislado (recuperado)
- [ ] Latencia ocasional >5s
- [ ] MarketSnack cookie adviso (falta 24h)
- [ ] Histórico vacío en eval (primer día, esperado)

### 🔴 Critical (Red Light) — FIX INMEDIATAMENTE
- [ ] Crashes repetidos
- [ ] HTTP 500 persistente
- [ ] Tabla vacía / no data
- [ ] Gráfica no renderiza
- [ ] Delta fuera de [-1, +1]
- [ ] Gamma negativo
- [ ] Uptime <95%

---

## 📅 Cronograma Sugerido

| Hora | Actividad |
|---|---|
| **Viernes 20:00 ET** | Startup, UI check, APIs manual × 3 |
| **Viernes 23:00 ET** | Arrancar script validación en background |
| **Sábado 08:00 ET** | Review primeras 12h de logs |
| **Sábado 14:00 ET** | Revisión intermedia (24h acumuladas) |
| **Domingo 08:00 ET** | Revisión final (48h acumuladas) |
| **Lunes 09:00 ET** | Mercado abierto — validación real SPX |

---

## 📝 Plantilla de Informe

**Usar esta estructura para documentar hallazgos:**

```markdown
# Validación 0DTE — Crypto 24/7 (Ago 22-25, 2026)

## Resumen
- **Periodo:** [inicio — fin]
- **Tickers probados:** BTC, ETH
- **Runs totales:** [N]
- **Hit rate API:** [X]%
- **Uptime servidor:** [X]%
- **Estado general:** 🟢 HEALTHY / 🟡 CAUTION / 🔴 CRITICAL

## Hallazgos

### ✅ Funcionando correctamente
- APIs responden <1s
- Tabla ChainLine poblada
- Gráfica SVG renderiza
- [...]

### ⚠️ Advertencias (no bloqueantes)
- MarketSnack cookie caduca 2026-08-24 (documento conocido)
- Cobertura gamma Schwab 47% (documento conocido)
- [...]

### 🔴 Errores críticos (si los hay)
- [error] HTTP 500 en /api/0dte, timestamp [T], línea [L]
- [error] [...]

## Preparación para lunes
- [ ] Servidor arrancará automático lunes 9:00 AM ET
- [ ] Scheduler listo (sí/no, detalles)
- [ ] Datos históricos guardados en data/
- [ ] Documentación actualizada

## Recomendaciones
1. [...]
2. [...]
```

---

## ⚠️ Qué NO Tocar (Restricción)

- ❌ No modificar código a menos que sea error CRÍTICO
- ❌ No cambiar `.env.local` sin documentar
- ❌ No hacer commits sin informe aprobado
- ❌ No push a GitHub hasta validar

**Excepción:** Si encuentras bug que impide healthcheck, then:
1. Documentar el bug
2. Arreglarlo
3. Correr test (`npm test` debe pasar)
4. Notar en informe

---

## ✨ Bonus: Monitoreo en Tiempo Real

Abre dos terminales:

**Terminal 1:** Servidor
```bash
cd web
npm run dev
```

**Terminal 2:** Healthcheck loop
```bash
cd web
while true; do
  bash scripts/validate-0dte.sh BTC
  bash scripts/validate-0dte.sh ETH
  echo "Próximo check en 30 min..."
  sleep 1800
done
```

Abrir dashboard en navegador:
```
http://localhost:3000/0dte
```

---

## 📌 Resultado Esperado

**Al terminar domingo:**
- [ ] Archivo `VALIDATION-REPORT-2026-08-25.json` poblado
- [ ] Documento de hallazgos en Markdown
- [ ] Estadísticas de uptime/latencia
- [ ] Recomendaciones para lunes
- [ ] Código sin cambios (o mínimos si hay bugs críticos)

**Lunes mercado abierto:**
- Repetir con SPX en `/0dte?ticker=SPX`
- Validar scheduler (si existe)
- Documentar en `AUDIT-0DTE-VERIFICACION-VIVA.md`

---

**Siguiente paso:** Comienza validación. Reporta cualquier hallazgo aquí.

