# S70 CHECKPOINT 4: Paper Trading E2E Validation

**Timeline:** Days 8-14 (1 semana observación)  
**Depends on:** Checkpoints 1-3 PASS  
**Status:** 🟡 PENDING CHECKPOINT 3  
**Authorized by:** Víctor (operación, decisión final)  
**For decision:** Jay (GO to LIVE)  

---

## 📋 OBJETIVO

**Operación real en Alpaca PAPER:**
- SEATBELT_ENABLED = true (SOLO en PAPER)
- 10+ trades ejecutados con todos 5 gates activos
- Validar que:
  - Cada gate reporta resultado correcto
  - PreExecutionEvidence se pobla automáticamente
  - Tito sigue operativo (no stuck)
  - CERO anomalías sorpresa
  - CERO bypass attempts

**Líneas de código nuevas:** +0 (solo configuración + observación)

---

## 📋 PRE-CHECKPOINT 4 SETUP

### 1. Cambio de Configuración

**Archivo:** `.env.local` (Cambio manual, NO commit)

```bash
# ANTES (Checkpoints 1-3):
SEATBELT_ENABLED=false

# DESPUÉS (Checkpoint 4):
SEATBELT_ENABLED=true    ← Activar solo para Paper Trading
```

**Aplicar:**
```bash
# En máquina Víctor:
echo "SEATBELT_ENABLED=true" >> .env.local

npm run dev  # Reiniciar servidor con SEATBELT activo
```

---

### 2. Verificación Pre-Trading

**Checklist antes de ejecutar trades:**

```bash
# 1. Confirmar SEATBELT está habilitado:
curl http://localhost:3000/api/seatbelt/status
→ { "enabled": true, "version": "checkpoint-4" }

# 2. Confirmar PreExecutionEvidence tabla está vacia:
psql $DATABASE_URL -c "SELECT COUNT(*) FROM pre_execution_evidence;"
→ 0

# 3. Confirmar Alpaca PAPER está conectado:
curl http://localhost:3000/api/broker/status
→ { "connected": true, "paper": true, "balance": 100000.00 }

# 4. Confirmar 5 gates están operacionales:
curl http://localhost:3000/api/seatbelt/health
→ {
    "gate1_market_health": "ok",
    "gate2_risk_boundary": "ok",
    "gate3_decision_audit": "ok",
    "gate4_execution_engine": "ok",
    "gate5_broker_connectivity": "ok"
  }
```

---

## 📊 OPERACIÓN: 1 Semana de Observación

### Día 1-7: Trading Normal (Con SEATBELT)

**Tito ejecutará trades como siempre, PERO:**
- Cada trade pasa 5 gates ANTES de ejecutar
- PreExecutionEvidence se crea para cada trade autorizado
- Logs capturan resultado de cada gate
- Alertas si algún gate falla

### Monitoreo Continuo

**Cada 6 horas, Víctor revisa:**

```sql
-- Check 1: Trades ejecutados
SELECT COUNT(*) as total_trades,
       COUNT(CASE WHEN all_gates_pass THEN 1 END) as gates_pass,
       COUNT(CASE WHEN NOT all_gates_pass THEN 1 END) as gates_fail
FROM pre_execution_evidence;

-- Check 2: Cuál gate falló más
SELECT gate, COUNT(*) as failures
FROM pre_execution_evidence,
     jsonb_to_recordset(gates) AS t(gate text, valid boolean)
WHERE valid = false
GROUP BY gate
ORDER BY failures DESC;

-- Check 3: Posiciones abiertas
SELECT symbol, qty, entry_price, current_price, pnl
FROM positions
WHERE status = 'OPEN';

-- Check 4: Logs de SEATBELT
SELECT timestamp, level, message
FROM logs
WHERE component = 'seatbelt'
ORDER BY timestamp DESC
LIMIT 50;
```

---

### Criterios de "Anomalía"

**STOP TRADING SI:**

- ❌ Cualquier gate siempre rechaza (problema del gate, no del mercado)
- ❌ PreExecutionEvidence no se crea (BD falla)
- ❌ Bypass attempt detectado (alguien intentó saltarse SEATBELT)
- ❌ Tito queda "stuck" (envía propuesta pero ExecutionEngine no responde)
- ❌ Alpaca rechaza orden que SEATBELT aprobó (inconsistencia)

**CONTINUAR SI:**

- ✅ Ocasional gate falla (mercado cerrado, quote stale, etc.) — normal
- ✅ PreExecutionEvidence se pobla correctamente
- ✅ CERO bypass attempts
- ✅ Tito sigue operativo
- ✅ Trades ejecutados como esperado

---

## ✅ PASS/FAIL CRITERIA

### ✅ CHECKPOINT 4 PASSES IF:

```
After 7 days:
  ✅ 10+ trades ejecutados
  ✅ 10+ PreExecutionEvidence records creados
  ✅ CERO bypass attempts
  ✅ CERO "stuck" incidents
  ✅ CERO sorpresas (gates funcionan como esperado)
  ✅ Tito sigue operativo (balance tracked, posiciones OK)
  ✅ Logs son informativos (gate results claros)
```

### ❌ CHECKPOINT 4 FAILS IF:

```
  ❌ Gate siempre rechaza sin justificación
  ❌ PreExecutionEvidence no se crea
  ❌ Bypass attempt detectado
  ❌ Tito "stuck" (command-line hang, timeout, etc.)
  ❌ Alpaca rechaza orden aprobado por SEATBELT
  ❌ Anomalía no explicada (crash, data corruption, etc.)
```

---

## 📊 OBSERVACIÓN DIARIA

### Template Reporte Diario (Víctor)

```
📅 CHECKPOINT 4 — Day 1 (2026-09-13)

TRADES TODAY:
  ✅ 2 trades ejecutados
  ✅ 2 PreExecutionEvidence creados
  
GATES STATUS:
  Gate 1 (Market Health):      ✅ 2/2 PASS
  Gate 2 (Risk Boundary):      ✅ 2/2 PASS
  Gate 3 (Decision Audit):     ✅ 2/2 PASS
  Gate 4 (Execution Engine):   ✅ 2/2 PASS
  Gate 5 (Broker Connectivity):✅ 2/2 PASS

ALERTS:
  🟢 NONE

BALANCE:
  Starting: $100,000
  Current:  $100,842
  PnL:      +$842 (+ 0.84%)

LOGBOOK:
  09:30 - ETHUSD buy 0.5, all gates PASS
  14:15 - BTCUSD sell 0.1, all gates PASS
  [No anomalies]

DECISION: ✅ CONTINUE TRADING
```

---

## 🎯 FINAL APPROVAL CRITERIA

### After 7 Days, Jay Reviews:

1. **7 daily reports** (Víctor's observations)
2. **PreExecutionEvidence data** (database queries)
3. **Trade logs** (gate results, audit trail)
4. **No anomalies** (no bypass, no stuck, no crashes)

### Jay's Final Decision:

- **✅ GO:** "All 7 days clean, SEATBELT is ready for LIVE"
  - `SEATBELT_ENABLED = true` en PROD
  - Tito comienza trading en vivo
  
- **🟡 HOLD:** "Need more data" o "Small anomaly needs investigation"
  - Extender observación 7 días más
  - Fijar issue, re-test
  
- **❌ NO-GO:** "Critical anomaly found"
  - Revertir S70: `SEATBELT_ENABLED = false`
  - Investigar root cause
  - Plan B

---

## 🔄 ROLLBACK STRATEGY (Si Falla)

If anomaly discovered:

```bash
# Pasos inmediatos:
1. Set SEATBELT_ENABLED = false (Tito desbloqueado)
2. STOP trading (kill Tito loop manually)
3. Revert S70: git revert [s70-commits]
4. app.restart()

# Investigación:
5. Query pre_execution_evidence para anomalia
6. Check logs para "SEATBELT exception"
7. Identify root cause
8. Fix + re-test desde Checkpoint 1

# Timeline: 5-10 minutos max (Tito desbloqueado)
```

---

## 📋 PRE-FLIGHT CONTROL (Checkpoint 4 Specific)

- [ ] **Paper Balance:** $100,000 confirmed in Alpaca account
- [ ] **SEATBELT Config:** Reviewed + enabled for Paper only
- [ ] **Health Checks:** All 5 gates reporting "ok"
- [ ] **Database:** pre_execution_evidence table empty, indices present
- [ ] **Logging:** All gate decisions being logged
- [ ] **Daily Reports:** Process for Víctor (manual or automated)
- [ ] **Alert System:** Notify if anomaly detected
- [ ] **Rollback Plan:** Git revert strategy documented

---

## 📚 EVIDENCE JAY MUST REVIEW (Post-Paper-Trading)

1. **7 Daily Reports:** No critical anomalies over week
2. **Database Records:** 10+ PreExecutionEvidence rows, correctly populated
3. **Trade Logs:** Each trade has associated gate results
4. **Performance:** No timeout, no stuck trades, normal latency
5. **Security:** CERO bypass attempts, consumed flag working
6. **Audit Trail:** Complete traceability from decision → execution → result

---

## 🎯 TRANSITION: Paper → Live

**IF Checkpoint 4 PASSES:**

```bash
# Day 15: Go Live

# 1. Confirm production environment
npm run build  # Production build
npm run test   # All tests still pass

# 2. Apply PreExecutionEvidence migration to PROD
npm run db:migrate -- --env production

# 3. Enable SEATBELT for production
echo "SEATBELT_ENABLED=true" >> .env.prod

# 4. Deploy to production
npm run deploy

# 5. Start monitoring (like Paper Trading, but for real $)
# Víctor still checks daily
# Alerts for any anomaly

# 6. After 30 days in PROD clean: Call it "Stable"
```

---

## ⏹️ STATE AFTER CHECKPOINT 4 (IF PASS)

- ✅ SEATBELT validated in Paper Trading (7 days)
- ✅ CERO anomalies discovered
- ✅ All 5 gates working as designed
- ✅ PreExecutionEvidence populating correctly
- ✅ Ready for LIVE trading
- ✅ Audit trail complete and queryable
- ✅ Tito now operates with SEATBELT protection

---

## ❌ FAILURE SCENARIO

**IF Checkpoint 4 FAILS:**

```
Day X: Anomaly detected (Gate always rejects, or Bypass attempt)

IMMEDIATE:
  1. SEATBELT_ENABLED = false
  2. Tito unblocked (back to normal)
  3. Investigate root cause

INVESTIGATION:
  - What gate failed?
  - Why did it reject valid trades?
  - Is it a gate bug or market condition?

RESOLUTION OPTIONS:
  A) Fix gate logic → re-test Checkpoint 1 for that gate
  B) Adjust threshold → update config, re-test
  C) Accept limitation → document it, proceed with caution

RE-TEST:
  - Same 7-day observation in Paper Trading
  - Confirm fix worked
  - Then proceed to LIVE (if approved)
```

---

## 📞 FINAL CHECKPOINT 4 SUMMARY

| Element | Status |
|---------|--------|
| **Code ready** | ✅ Checkpoints 1-3 PASS |
| **Migration applied** | ✅ Table + indices exist |
| **SEATBELT enabled** | ✅ Paper Trading activated |
| **7-day observation** | 🟡 IN PROGRESS |
| **Anomalies found** | 🔴 TO BE DETERMINED |
| **Jay's GO decision** | 🔴 PENDING |
| **Live deployment** | ⏹️ WAITING FOR GO |

---

**Checkpoint 4 is the proof. All or nothing.**

**Status: HOLD — Awaiting Checkpoint 3 PASS to begin observation.**

---

*Once this checkpoint passes, S70 is complete and Tito has SEATBELT protection in production.*
