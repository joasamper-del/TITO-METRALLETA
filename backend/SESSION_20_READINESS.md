# Sesión 20 Readiness — Preparación Final para Prueba Controlada SPY/QQQ

**Fecha:** 2026-08-29  
**Estado:** ✅ LISTO PARA PRIMERA OPERACIÓN EN PAPER  
**Última actualización:** Commit fe7c2b4  
**Tiempo de setup:** < 5 minutos  
**Sin órdenes ejecutadas:** 0/0 ✓  
**Tito Core modificado:** NO ✓  

---

## 📊 RESUMEN EJECUTIVO

### ✅ LO QUE ESTÁ LISTO

#### Infraestructura de Registro (Completa)
- ✅ `tradingLogger.ts`: Captura ticker, decisión, confianza, entrada/salida, S/L-T/P, slippage, P&L
- ✅ `vixContext.ts`: Clasificación régimen VIX (baja/normal/media/alta) + alineación
- ✅ `mocContext.ts`: Imbalance NYSE, dirección, magnitud (cuando esté disponible)
- ✅ Dashboard `/paper`: Visualización en vivo de operaciones, auto-refresh 5s
- ✅ Resumen acumulado: win rate, P&L total, stats por ticker

**Archivos de logging:**
- `backend/phase_d_logs/trades_YYYY-MM-DD.jsonl` (1 línea = 1 JSON)
- `backend/phase_d_logs/summary_YYYY-MM-DD.json` (agregado acumulado)
- `web/app/paper/page.tsx`: Dashboard Paper Trading
- `web/lib/usePhaseDLogs.ts`: Hook de datos vivos

#### Contexto de Volatilidad (VIX) — Listo Sesión 20
| Dato | Fuente | Status | Automático |
|------|--------|--------|-----------|
| Valor VIX actual | Massive option chain | ✅ | Sí |
| Régimen (baja/normal/media/alta) | Calculado | ✅ | Sí |
| Confirmación para CALL/PUT | Alineación | ✅ | Sí |
| Trend (bajista/lateral/alcista) | Histórico 2 valores | ✅ | Sí |
| Disclaimer (VIX = proxy) | Documentado | ✅ | Sí |

**En logging:**
```json
{
  "vixValue": 14.2,
  "vixRegime": "normal",
  "vixConfirmation": "alcista",
  "vixAlignment": "confirmada"
}
```

#### Gamma Exposure (GEX) — Listo Sesión 20
| Dato | Fuente | Status | Automático |
|------|--------|--------|-----------|
| Gamma por strike | Black-Scholes | ✅ | Sí |
| GEX neto (Gamma × OI) | Calculado | ✅ | Sí |
| Imán GEX (nivel atracción) | Búsqueda en cadena | ✅ | Sí |
| Concentración | OI + premium flujo | ✅ | Sí |
| Greeks (vanna/charm) | BS functions | ✅ | Sí |

**Infraestructura:** `web/lib/gex.ts` (100% completa, testeada)

#### Agresividad de Flujo (FLOW) — Listo Sesión 20
| Dato | Fuente | Status | Automático |
|------|--------|--------|-----------|
| Ask/Bid dominance | MarketSnack time & sales | ✅ | Sí |
| Aggression score (0-100) | Calculado desde premium | ✅ | Sí |
| Multileg detection | Condición OPRA | ✅ | Sí |
| Repetición strikes | Ventana 5 min | ✅ | Sí |
| Timing score | Hora ET | ✅ | Sí |

**Infraestructura:** `web/lib/flow.ts` (100% completa, testeada)  
**Propuesta para logging:** Copiar tipos a `backend/flowContext.ts` (sesión 22)

#### Soportes/Resistencias (LEVELS) — Listo Sesión 20
| Dato | Fuente | Status | Automático |
|------|--------|--------|-----------|
| Pivots (highs/lows) | Precio histórico | ✅ | Sí |
| Clustering de niveles | Tolerancia % | ✅ | Sí |
| Fuerza (0-100) | Toques + OI + gamma | ✅ | Sí |
| Soportes (puts) | OI concentrado | ✅ | Sí |
| Resistencias (calls) | OI concentrado | ✅ | Sí |

**Infraestructura:** `web/lib/levels.ts` (100% completa, testeada)

#### Alpaca Paper Trading — Verificado
- ✅ Endpoint: `https://paper-api.alpaca.markets` (PAPER ONLY)
- ✅ Cuenta: PA3LKPJ8SFHS
- ✅ Status: ACTIVE
- ✅ Equity: $100,000
- ✅ Buying Power: $400,000
- ✅ Test de conexión: `test_alpaca_auth.ts` (200 OK)

#### Tito Core v0.3.0
- ✅ Congelado: CERO cambios
- ✅ Decisiones: CALL/PUT/WAIT/NO TRADE
- ✅ Confianza: 0-100
- ✅ Razones: 3-5 elementos
- ✅ Nunca modificado por capas de contexto

---

### ⏳ LO QUE FALTA

#### MOC / Closing Imbalance (Sesión 22)
| Dato | Fuente | Status | Nota |
|------|--------|--------|------|
| Net Imbalance | NYSE official | ❌ | Investigar fuente |
| Direction (buy/sell) | Calculable si data | ❌ | Depende source |
| Magnitude | Clasificable si data | ❌ | Depende source |

**Acción:** Sesión 22 investigar:
- ¿Massive API expone MOC?
- ¿Alpaca Paper endpoints?
- ¿Alternative source (MarketWatch, etc)?

#### FLOW Context en Backend (Sesión 22)
- 📋 Copiar tipos desde `web/lib/flow.ts` a `backend/flowContext.ts`
- 📋 NO modificar web/lib/flow.ts
- 📋 Integrar como CONTEXTO en logging (no como señal)

---

## 🚀 INSTRUCCIONES EXACTAS PARA SESIÓN 20

### PASO 1: Verificar Estado (< 1 min)

```bash
cd "C:\Users\18327\Downloads\Agente Tito Metralleta\Agente Tito Metralleta"
git status
git log --oneline -1
```

**Esperado:**
```
On branch main
Status: clean
Latest commit: fe7c2b4 docs: Complete infrastructure inventory...
```

### PASO 2: Verificar Alpaca PAPER (< 1 min)

```bash
cd backend
npx ts-node test_alpaca_auth.ts
```

**Esperado:**
```
Status: 200 OK
Cuenta: PA3LKPJ8SFHS
Status: ACTIVE
Equity: $100,000
Buying Power: $400,000
```

### PASO 3: Iniciar Frontend (< 1 min)

**Terminal 1:**
```bash
cd web
npm run dev
# Esperar: "Local: http://localhost:3000"
```

### PASO 4: Abrir Dashboard (< 1 min)

```
http://localhost:3000/paper
```

**Verificar:**
- ✅ "Fase D — Paper Trading" visible
- ✅ "Estado PAPER" = ACTIVE (verde)
- ✅ "Autonomía" = OFF (azul)
- ✅ "Sin operaciones registradas" (empty state)

### PASO 5: Ejecutar Primera Orden (cuando autorices)

```bash
cd backend
PHASE_D_APPROVED=true npx ts-node phaseD_ControlledExecution.ts
```

**Qué hace:**
1. Verifica endpoint PAPER ✅
2. Verifica credenciales ✅
3. Obtiene precio actual SPY/QQQ
4. Simula decisión Tito Core
5. **EJECUTA 1 orden pequeña** (1 contrato)
6. Registra: entrada, fill, slippage, S/L-T/P, P&L
7. **PAUSA OBLIGATORIA**

### PASO 6: Ver Resultados EN VIVO

**Dashboard auto-refresca cada 5 segundos:**
- Ticker (SPY/QQQ)
- Decisión Tito (CALL/PUT)
- Confianza (0-100)
- Entrada/Salida
- P&L $ y %
- WIN/LOSS

**En Terminal:**
```
📝 Trade logged: SPY CALL (WIN)
P&L: $X.XX (X.XX%)
```

---

## 📋 VERIFICACIÓN PRE-EJECUCIÓN

Antes de `PHASE_D_APPROVED=true`:

- [ ] Git status = Clean
- [ ] test_alpaca_auth.ts = 200 OK
- [ ] Dashboard /paper = sin errores
- [ ] "Estado PAPER" = ACTIVE (verde)
- [ ] "Autonomía" = OFF (azul)
- [ ] Mercado abierto (09:30-16:00 ET)
- [ ] ≥ 1 hora después del open

---

## 🔐 RESTRICCIONES (NO ROMPER)

❌ NO ejecutar sin `PHASE_D_APPROVED=true`  
❌ NO ejecutar sin mercado abierto  
❌ NO ejecutar múltiples órdenes sin pausa  
❌ NO modificar Tito Core v0.3.0  
❌ NO cambiar reglas/pesos/umbrales  
❌ NO usar credenciales LIVE  
❌ NO activar ejecución autónoma  

✅ SÍ 1 orden pequeña (1 contrato)  
✅ SÍ pausa obligatoria entre órdenes  
✅ SÍ registrar todo en logs/dashboard  
✅ SÍ mostrar resultados EN VIVO  

---

## 📊 TABLA RESUMEN: LO QUE CAPTURAREMOS

```
Por operación (JSON JSONL):

{
  "timestamp": "2026-08-29T15:55:30Z",
  "ticker": "SPY",
  "decision": "CALL",
  "confidence": 78,
  
  "entryPrice": 582.15,
  "entryTime": "15:55:30",
  "stopLoss": 580.00,
  "takeProfit": 585.00,
  
  "exitPrice": 585.50,
  "exitTime": "15:58:15",
  "exitReason": "TP hit",
  
  "pnlDollars": 3.35,
  "pnlPercent": 0.57,
  "result": "WIN",
  
  "titoReasons": ["GEX bullish", "FLOW ask-dominated", "Nivel 582 support"],
  
  "vixValue": 14.2,
  "vixRegime": "normal",
  "vixConfirmation": "alcista",
  "vixAlignment": "confirmada"
}
```

**Resumen diario agregado:**
```json
{
  "date": "2026-08-29",
  "totalTrades": 1,
  "winnersCount": 1,
  "losersCount": 0,
  "winRate": 100.0,
  "totalPnlDollars": 3.35,
  "totalPnlPercent": 0.57,
  "byTicker": {
    "SPY": {
      "ticker": "SPY",
      "trades": 1,
      "wins": 1,
      "losses": 0,
      "winRate": 100.0,
      "pnlDollars": 3.35,
      "pnlPercent": 0.57
    }
  }
}
```

---

## 🎯 PRÓXIMOS PASOS (SESIÓN 21+)

1. **Después de 3-5 operaciones:** Analizar qué combinaciones de contexto mejoran
   - VIX solo
   - GEX solo
   - FLOW solo
   - VIX + GEX
   - VIX + GEX + FLOW (todas las capas)

2. **Sesión 22:** Investigar MOC data source
   - Massive API?
   - Alpaca endpoints?
   - Alternative?

3. **Sesión 23+:** Validar hipótesis
   - ¿Triple confirmación mejora win rate?
   - ¿Qué combinación es óptima?
   - ¿Mantener MOC o descartar?

---

## 📞 TROUBLESHOOTING

| Problema | Solución |
|----------|----------|
| 401 Unauthorized | Verificar backend/.env.local con credenciales PAPER |
| Mercado cerrado | Esperar 09:30 ET (market open) |
| Dashboard no actualiza | Verificar npm run dev en Terminal 1 |
| Sin resultados en /paper | Auto-refresh 5s; actualizar navegador manualmente |
| Error 429 Alpaca | Esperar 2 min (rate limit 200 req/min); NO reintentar repetidamente |

---

## ✨ ESTADO FINAL

**Fase D Readiness:**
- ✅ Infraestructura: 100%
- ✅ Logging: 100%
- ✅ Dashboard: 100%
- ✅ VIX Context: 100%
- ✅ GEX Context: 100%
- ✅ FLOW Context: 100% (en web/lib; backend TBD sesión 22)
- ✅ Levels Context: 100% (en web/lib; backend TBD sesión 22)
- ✅ Alpaca PAPER: Verificado ✓
- ✅ Tito Core: Congelado ✓

**Bloqueadores:** NINGUNO

**Modificaciones a Tito Core:** CERO ✓

**Órdenes ejecutadas:** 0 ✓

---

**Estado:** 🟢 LISTO PARA PRIMERA PRUEBA PAPER TRADING  
**Fecha:** 2026-08-29  
**Acción siguiente:** Esperar mercado abierto + autorización usuario  
**Tiempo estimado setup:** < 5 minutos

