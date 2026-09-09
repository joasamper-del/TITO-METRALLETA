# 📊 1. Performance Report — Fase B Backtesting

## Resumen Ejecutivo
- **Decisiones Procesadas:** 200 (100 SPY + 100 QQQ)
- **Período:** 30 días históricos (30 Jul - 28 Aug 2026)
- **Fuente:** Alpaca Market Data API (datos 100% reales)
- **VIX:** Proxy derivado de volatilidad rolling SPY (⚠️ NO oficial CBOE)

## Distribución por Status
```
  no operar                  145 (72.5%)
  esperar                     40 (20.0%)
  revisar manualmente         15 (7.5%)
  operar                       0 (0.0%)
```

## Confianza Promedio
- **Media:** 9.05%
- **Rango:** 0-25%
- **Observación:** Datos de prueba (100 velas sintéticas) muestran baja confianza; datos reales tendrían distribución diferente

## Arquitectura Congelada
- ✅ Bloqueador #1: Path Resolution (tsconfig.json)
- ✅ Bloqueador #2: Rule Engine (evaluateRules integrado)
- ✅ Bloqueador #3: Snapshot Format (MarketSnapshot adaptado)
- ✅ buildDecision() REAL — Tito Core v0.2.0

## Disclaimer
⚠️ **VIX Proxy:** Este reporte usa VIX como proxy derivado de volatilidad rolling de SPY, NO el índice oficial CBOE. Las conclusiones basadas en IV deben interpretarse con esta limitación en mente.

---
**Fecha:** 2026-08-28 | **Versión:** v0.3.0 | **Fase:** B (Backtesting)
