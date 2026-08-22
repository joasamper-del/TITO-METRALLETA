# Scorecard de Rotación Discount ⇄ Premium — formato oficial Tito Metralleta

> Estándar para los análisis de **screening de rotación** (swing/posición), en el mismo
> formato del Options Flow Scorecard: cada categoría recibe un **AI Score 0–10**, se multiplica
> por su **peso**, y la suma da el **Puntaje Total /100**. Bandas Débil / Moderada / Fuerte.
>
> **El agente decide, no el gráfico. Sin evidencia, no hay número.**
> *"No es consejo financiero. Solo análisis inteligente."*

---

## Dos modos (declarar SIEMPRE el modo activo al inicio)

- 🟢 **Modo 1 — Descuento→Prima** (rotación alcista): sale de descuento hacia premium.
- 🔴 **Modo 2 — Prima→Descuento** (ruptura bajista): pierde premium hacia descuento.

### Filtros de scanner (Robinhood)
| Criterio | Filtro | Modo 1 | Modo 2 |
|---|---|---|---|
| Movimiento del día | `PERCENT_CHANGE_FROM_CLOSE` (ratio!) | `0.015`…`0.08` | `-0.06`…`-0.015` |
| Volumen | `RELATIVE_VOLUME` (1d, 30) | `> 1.3` | `> 1.3` |
| Tendencia | `MACD` (1d) | `> 0` | `< 0` |
| Momentum | `RSI` (1d, 14) | `50`…`68` | `40`…`55` |
| Liquidez / precio | `MARKET_CAP` · `LAST` | `>3B` · `>15` | `>3B` · `>15` |

> Notas: `% Change` es **ratio decimal** (0.015 = +1.5%). Los campos de margen del scanner vienen
> **vacíos** → verificar caja/razón a mano. `relvol` es intradía acumulado (más fiable tras el mediodía ET).

---

## Scorecard (rúbrica) — AI Score 0–10 × peso = /100

| # | Categoría | Pregunta | Peso |
|---|-----------|----------|------|
| 1 | **Volumen** | ¿El volumen sobre el promedio confirma el movimiento? | 20% |
| 2 | **Confirmación técnica** | ¿Ruptura/breakout limpio? (MACD alineado + nivel roto) | 25% |
| 3 | **Momentum** | ¿RSI en la zona de transición ideal, sin extenderse? | 15% |
| 4 | **Razón / Fundamental** | ¿Hay catalizador o razón real? (fundamental > macro) | 25% |
| 5 | **Riesgo / Timing** | ¿Sin evento binario, sin estar ya extendido, con liquidez? | 15% |

**Puntos por categoría** = (AI Score / 10) × (peso × 100). Ej.: Volumen 9.5/10 × 20 = **19/20**.

### Bandas (veredicto)
| Rango | Veredicto | Acción |
|-------|-----------|--------|
| 0 – 49 | **Oportunidad Débil** | descartar |
| 50 – 74 | **Oportunidad Moderada** | esperar / vigilar |
| 75 – 100 | **Oportunidad Fuerte** | candidato a trade (con niveles) |

> **Score y confianza son separados.** Score alto + evento binario o razón floja → confianza baja
> → puede anular el trade.

### Cuándo NO operar (Modo 2)
RSI < 38 · caída del día > 7–8% · earnings hoy/mañana · relvol < 1 · ya en mínimo 52s sin rebote ·
fundamentales fuertes cayendo solo por macro (snap-back).

### Regla general
> Si ningún ticker alcanza banda Fuerte (o Moderada con confianza alta) → **`HOY NO HAY TRADE`**
> con el motivo concreto. No bajar filtros para forzar un nombre.

---

## Recuadro de resumen (10 campos)
```
─────────────────────────
RESUMEN
Modo:             <1 Descuento→Prima | 2 Prima→Descuento>
Ticker:           <símbolo | ninguno>
Puntuación:       <n>/100 · <Débil|Moderada|Fuerte>  (Vol X/20 · Téc X/25 · Mom X/15 · Razón X/25 · Riesgo X/15)
Confianza:        <Alta | Media | Baja>
Zona de entrada:  <rango | n/a>
Stop:             <nivel | n/a>
Objetivo:         <rango | n/a>
Riesgo/Beneficio: <ratio | n/a>
Catalizador:      <evento + fecha | ninguno>
Decisión final:   <TRADE … | ESPERAR (motivo) | HOY NO HAY TRADE — motivo>
─────────────────────────
```
Mostrar SIEMPRE el desglose del puntaje por categoría. Capa visual: histórico sólido · objetivo
punteado (rango) · zona de entrada verde · zona de stop roja · invalidación · recuadro de métricas.

**Convención de colores** (categoría sobre su máximo · y banda): 🟢 alto (≥75% / banda Fuerte) ·
🟡 precaución (40–74% / banda Moderada / advertencias) · 🔴 **solo** criterio fallido o problema real
(<40% / invalidación / decisión bloqueada). No usar rojo para precaución. NOT_SCORABLE → ⚪.

*"No es consejo financiero. Solo análisis inteligente."*
