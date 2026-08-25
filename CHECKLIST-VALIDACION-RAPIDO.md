# ✅ Checklist Rápido: Validación 0DTE Crypto 24/7

**Copia esto, marcar conforme valides. NO tocar código a menos que error crítico.**

---

## 🚀 Setup (Ahora — 10 min)

```bash
cd "Agente Tito Metralleta"
cd web

# Terminal 1: Servidor
npm run dev
# Esperar: "Ready in Xs" + "GET / 200"

# Terminal 2: Script de validación
chmod +x scripts/validate-0dte.sh
bash scripts/validate-0dte.sh BTC
bash scripts/validate-0dte.sh ETH
```

- [ ] Servidor corre sin 500
- [ ] Script genera JSON en `data/validation-runs/`
- [ ] Abrir http://localhost:3000/0dte en navegador

---

## 🔍 Fase 1: UI Check (15 min)

Visitar `http://localhost:3000/0dte`

- [ ] Página carga (no error 500)
- [ ] Selector de ticker visible (dropdown BTC/ETH/SPX)
- [ ] Tabla ChainLine visible (headers: Strike, Call Vol, Put Vol, etc.)
- [ ] Gráfica SVG renderiza (velas + cono gris)
- [ ] "Conclusión Ejecutiva" card con texto
- [ ] Tabs: "Flujo", "Descubridor", "Evaluación"

**Si falla algo:** 🔴 Error crítico → revisar console (F12, pestana Console)

---

## 📊 Fase 2: API Check (30 min × 2 = una vez ahora, otra en 4h)

**Ahora:**

```bash
# Terminal 3: curl manual
curl -s http://localhost:3000/api/0dte?ticker=BTC | jq '.' | head -50
curl -s http://localhost:3000/api/0dte/flow?ticker=BTC | jq '.'
curl -s http://localhost:3000/api/0dte/eval?ticker=BTC | jq '.'
curl -s http://localhost:3000/api/0dte/discover | jq '.candidates | length'
```

Para **cada respuesta**, revisar:

- [ ] HTTP 200 (no error)
- [ ] JSON válido (no `null`)
- [ ] Campos esperados presentes

**Tabla esperada:**
```
{
  "ticker": "BTC",
  "date": "2026-08-22",
  "table": [
    {
      "strike": 67000,
      "call": { "volume": ..., "delta": ..., ... },
      "put": { "volume": ..., ... },
      ...
    },
    ...
  ],
  "scenarios": {...},
  ...
}
```

**Flow esperado:**
```
{
  "ticker": "BTC",
  "cycles": 1,
  "contracts": 5,
  "reads": {
    "BTC250829C67000": { "buy": 2, "sell": 0, ... },
    ...
  }
}
```

---

## 📈 Fase 3: Monitoreo Continuo (Sábado + Domingo)

**Correr cada 4 horas:**

```bash
bash scripts/validate-0dte.sh BTC
bash scripts/validate-0dte.sh ETH
# Los JSON se acumulan en data/validation-runs/
```

Después de cada run, revisar:

- [ ] HTTP 200 en todas las APIs
- [ ] `table.rows` > 10 (cadena tiene strikes)
- [ ] `flow.cycles` incrementa (no se resetea)
- [ ] `flow.contracts` > 0 si hay volumen en tabla
- [ ] `eval.meanAbsErrorPct` es número o null (ok ambos)
- [ ] `discover.candidates` >= 0

**Tracker (copiar y rellenar):**

| Hora | BTC Rows | BTC Cycles | ETH Rows | ETH Cycles | Latencia | Notas |
|---|---|---|---|---|---|---|
| Vie 20:00 | 15 | 1 | 12 | 1 | <1s | Setup OK |
| Vie 23:00 | 18 | 5 | 14 | 4 | 850ms | Normal |
| Sab 08:00 | 20 | 42 | 19 | 38 | 920ms | Good |
| ... | | | | | | |

---

## 🟢 Si Todo Funciona (Esperado)

- ✅ Tabla poblada de strikes
- ✅ APIs responden <2s
- ✅ Gráfica renderiza sin lag
- ✅ Uptime 100%
- ✅ Flujo acumula

**Entonces:** Documentar en `VALIDATION-REPORT-2026-08-25.json` (plantilla en PLAN-VALIDACION-CRYPTO-24-7.md) y proceder.

---

## 🟡 Si Hay Advertencias (Esperado también)

Estos SON normales, NO arreglar:

- ⚠️ `flow.reads` vacío (si es primer ciclo o pocas operaciones)
- ⚠️ `eval.empty: true` (si no hay histórico aún)
- ⚠️ Latencia ocasional >3s (carga de datos)
- ⚠️ `error: "MarketSnack error"` (cookie próxima a caducar, conocido)

**Entonces:** Notar en informe bajo "WARNINGS" y seguir.

---

## 🔴 Si Hay Error Crítico (Raro, pero si pasa)

**Síntomas críticos:**
- HTTP 500 persistente
- Tabla completamente vacía (0 rows) después de 3 intentos
- `NaN` en delta/gamma/theta (valores sin sentido)
- Gamma negativo (debería ser +)
- Servidor crashea

**Entonces:** 
1. Revisar `console` en terminal 1 (npm run dev)
2. Copiar el error exacto
3. Revisar en `web/app/api/0dte/route.ts` ¿hay `console.error` ese message?
4. Si es claro: arreglarlo, correr `npm test` para verificar
5. Documentar en informe bajo "CRITICAL ERRORS"

---

## 📋 Domingo Final (14:00 ET)

Copiar este resumen y guardar en **`VALIDATION-REPORT-2026-08-25.md`**:

```markdown
# Validación 0DTE Crypto 24/7 — Resultado Final

**Periodo:** 2026-08-22 20:00Z — 2026-08-25 18:00Z  
**Tickers:** BTC, ETH  
**Runs:** [número de veces que corriste el script]

## Estado General
- Uptime: 100% / >99% / <99% ← tachar
- Hit Rate APIs: [X]%
- Promedio Latencia: [X]ms
- Errors críticos: 0 / [N] ← tachar

## ✅ Funcionando
- [ ] APIs responden
- [ ] Tabla poblada
- [ ] Gráfica renderiza
- [ ] Flujo acumula
- [ ] Uptime OK

## ⚠️ Advertencias
- Cookie MarketSnack (conocido)
- Cobertura Schwab 47% (conocido)
- [si hay más]

## 🔴 Errores
- [si hay alguno]

## Conclusión
Sistema está READY para validación lunes con mercado real. ✅
```

---

## 📅 Timeline Recomendado

| Día/Hora | Acción |
|---|---|
| Viernes 20:00 | Setup + UI check |
| Viernes 23:00 | Primer script run |
| Sábado 08:00 | Review 12h, segundo script run |
| Sábado 14:00 | Tercer script run |
| Sábado 20:00 | Cuarto script run |
| Domingo 08:00 | Quinto script run + review |
| Domingo 14:00 | Sexto script run + informe final |
| Lunes 09:00 | Validación real SPX + scheduler |

**Cada script run = 2-3 min. Es fácil.**

---

## 🎯 Objetivo Final

Al terminar domingo:
- [ ] Archivo `VALIDATION-REPORT-2026-08-25.md` (hallazgos)
- [ ] Carpeta `data/validation-runs/` llena de JSON runs
- [ ] Documentar qué funciona / qué falta / qué se debe hacer lunes
- [ ] **Código intacto** (solo fix si error crítico)
- [ ] **GitHub push diferido** (después del informe)

---

**¿Listo? Abre Terminal y corre:**

```bash
cd "Agente Tito Metralleta/web"
npm run dev
```

Luego en otra terminal:
```bash
bash scripts/validate-0dte.sh BTC
```

**Marcar primer check en la lista arriba y reportar hallazgos** ✅

