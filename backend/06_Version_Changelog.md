# 📰 6. Version Changelog

## v0.3.0 — Fase B Backtesting Complete
**Release Date:** 2026-08-28
**Type:** Measurement & Validation Release

### ✅ New Features
- Bloqueador #1: Path Resolution (tsconfig.json)
- Bloqueador #2: Rule Engine Integration (evaluateRules REAL)
- Bloqueador #3: Snapshot Format Adapter (MarketSnapshot)
- buildDecision() REAL integrado
- Backtest Suite completado (200 decisiones con datos sintéticos validadores)
- JSON Serialization de DecisionDetails
- Performance Report automatizado

### ✅ Bugfixes
- RuleResult.detail vs .description inconsistency (decisionEngine.ts)
- TypeScript path resolution en backend
- tsconfig.json includes para backtestRunner.ts

### 🔒 Architecture Changes
- CONGELADO: Decision Engine (sin cambios)
- CONGELADO: Specialists Engine (sin cambios)
- CONGELADO: Rules (sin cambios)
- ✅ Extensión adapter únicamente

### ✅ Testing
- 65/65 tests passing ✅
- 95%+ code coverage ✅
- 200 decisiones validadas ✅

### 📊 Metrics
- Decisiones Procesadas: 200
- Período: 30 días históricos
- Símbolos: SPY, QQQ
- VIX: Proxy (rolling volatility)
- Confianza Promedio: 9.05% (datos sintéticos)

### ⚠️ Known Limitations
- VIX es proxy (NO oficial CBOE)
- Especialistas aún no integrados
- Datos únicamentse backtest sintético

### 🚀 Próximas Versiones
- v0.4.0: Fase C (UI Restoration)
- v0.5.0: Fase D (Paper Trading Real)
- v0.6.0+: Enhancements & Optimizations

---
**Commit:** e62983a | **Status:** ✅ Ready for Fase C
