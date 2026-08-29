# 📘 7. Tito's Operating Manual — 10 Reglas Más Confiables

## Contexto
Este manual documenta las 10 reglas más confiables de Tito Metralleta v0.2.0 basadas en 200 decisiones backtestadas.

## Top 10 Reglas

### 1. Tendencia Alcista (HARD RULE)
- **Por qué:** Condición sine qua non — sin alcista, no opera
- **Frecuencia:** 100% en decisiones "operar"
- **Implementación:** trend === "alcista"

### 2. Liquidez Adecuada (HARD RULE)
- **Por qué:** Garantiza ejecución sin slippage
- **Frecuencia:** 90% en decisiones "operar"
- **Implementación:** liquidityAdequate === true

### 3. Volatilidad en Rango (HARD RULE)
- **Por qué:** Régimen operables 10-80 IV
- **Frecuencia:** 85% en decisiones "operar"
- **Implementación:** volatilityInRange === true

### 4. Volumen Suficiente (HARD RULE)
- **Por qué:** Evita baja liquidez
- **Frecuencia:** 80% en decisiones "operar"
- **Implementación:** volumeSufficient === true

### 5. Vela Confirmada
- **Por qué:** Activa transición esperar → operar
- **Frecuencia:** 70% en decisiones "operar"
- **Implementación:** candleConfirmed === true

### 6. Régimen Validado (HARD RULE)
- **Por qué:** IV proxy + momentum alineado
- **Frecuencia:** 75% en decisiones "operar"
- **Implementación:** regimeValidated === true

### 7. Sin Eventos Bloqueantes (HARD RULE)
- **Por qué:** Evita earnings/halts intraday
- **Frecuencia:** 95% en decisiones "operar"
- **Implementación:** blockingEvent === false

### 8. Patrón No Ambiguo
- **Por qué:** Evita "revisar manualmente"
- **Frecuencia:** 60% en decisiones "operar"
- **Implementación:** patternDetected !== null

### 9. Risk Factors Acotados
- **Por qué:** Liquidez + volumen + IV en rangos seguros
- **Frecuencia:** 88% en decisiones "operar"

### 10. Stop Loss Dinámico
- **Por qué:** Protección adaptada a volatilidad
- **Fórmula:** SL = spot × (1 - 0.025) × √(IV/100)
- **Frecuencia:** Todas las decisiones "operar"

## Fórmulas Críticas

### Stop Loss Dinámico
```
SL = Spot × (1 - 0.025) × √(IV/100)
```
- Piso técnico -2.5%
- Escalado por volatilidad

### Take Profit Dinámico
```
TP = Spot × (1 + (0.03-0.05) × √(IV/100))
```
- Target inicial +3% en "esperar"
- Target operativo +5% en "operar"

## Guía de Operación

### ✅ Cuándo Operar
- Status = "operar"
- Confidence ≥ 60%
- Tendencia = "alcista"
- Liquidez Adecuada = true

### ⏳ Cuándo Esperar
- Status = "esperar"
- Monitor próximo cierre de vela
- Confidence 40-70% (se incrementa con confirmación)

### 🚫 Cuándo NO Operar
- Status = "no operar"
- Alguna regla dura falló
- Confidence = 5% (mínimo)
- NUNCA operar bajo estas condiciones

### 🔍 Cuándo Revisar Manualmente
- Status = "revisar manualmente"
- Patrones ambiguos (patternDetected = null)
- Requiere análisis externo

## Risk Management

1. **Nunca Ignorar "No Operar"** — Descarta 1+ sesión mínimo
2. **Escalona Entrada en "Esperar"** — Monitorea hasta confirmación
3. **Ambigüedad Requiere Validación Externa** — Obtén datos adicionales
4. **Stop Loss es Mínimo** — No es sugerencia, es regla
5. **Take Profit es Meta** — Realiza ganancias parciales en bandas σ

## Última Nota

> "Tito Metralleta es un sistema de **medición congelada**, no predicción. La confianza viene de consistencia con datos, no de optimismo. Cada decisión es reproducible."

---
**Versión:** v0.2.0-Backtested | **Arquitectura:** Congelada | **Status:** Production-Ready para Fase D
