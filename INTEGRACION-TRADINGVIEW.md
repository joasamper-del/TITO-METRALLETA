# Integración de indicadores de TradingView — Tito Metralleta

**Fecha:** 2026-08-08 · **Fuente:** 4 capturas de tu lista *Favorite Indicators* (gráfico CELOUSDT).

> Este documento identifica cada indicador, marca **qué ya cubre Tito**, **qué falta por
> integrar** y propone un **orden recomendado**. **No se ha modificado código.**

---

## 0. Lo primero: 3 advertencias que cambian el enfoque

1. **Es tu librería de *favoritos*, no tu setup activo.** Las capturas son la lista "Favorite
   Indicators" (~58 estudios que marcaste como favoritos), no los que tienes puestos en el
   gráfico ni necesariamente con los que operas. Integrar 58 sería ruido: hay 8 variantes de
   RSI, 4 de ADX, 7 de perfil/volumen… Lo útil es un **shortlist** de los que de verdad usas.

2. **El gráfico es CELOUSDT (Celo, cripto).** Tito analiza **opciones de EE.UU.** (SPX / SPY /
   acciones) vía **Schwab + Massive + MarketSnack**. **No tiene fuente de datos de cripto.** Toda
   la suite **CriptoBuzz VIP** y el uso en pares cripto quedan **fuera de alcance** salvo que
   decidas añadir otra fuente de datos (otro proyecto).

3. **Tito no es un motor de indicadores TA de precio.** Su capa es **flujo de opciones + GEX +
   IV + niveles**. Por eso aquí *"cubierto"* significa **"Tito ya produce algo equivalente en SU
   capa"**, no que replique el indicador de TradingView. Y **"integrar"** no significa
   reprogramar el indicador: significa **recibir su señal por el webhook** `/api/tradingview`
   (que ya existe) y **usarla** como contexto/confirmación.

---

## 1. Inventario identificado (agrupado por familia)

| Familia | Indicadores de tu lista |
|---|---|
| **RSI / momentum** | Relative Strength Index · RSI & ADX [APIDEVs] · RSI Bands [APIDEVs] (×2) · RSI overlay with levels · RSI PRO+ [APIDEVS] · RSI Reversals · [_ParkF]RSI Divergence_overlay · Larry Connors RSI-2 Scalping (strategy) |
| **ADX / fuerza de tendencia** | ADX DEF [APIDEVS] · ADX MULTICOLOR · ADX_Oscillator [APIDEVs] (×2) |
| **Otros osciladores** | CM Stochastic Multi-TimeFrame · Power Oscillator MTF · True Strength Index · Squeeze Momentum [LazyBear] · Trend Reversal Predictor |
| **Medias / tendencia** | Multiple EMA 20/50/100/200 · Moving Average Cross Alert MTF · Hull Suite · Trend Regularity Adaptive MA [LuxAlgo] · SuperTrend · Volatility Stop · Nadaraya-Watson Envelope [LuxAlgo] · Linear Regression Fan [LuxAlgo] · A Useful MA Weighting Function |
| **Bandas / volatilidad** | Bollinger Bands · SuperJump Turn Back Bollinger Band · Fibonacci Bands · Fibonacci Progression with Breaks [LuxAlgo] · Fibonacci Zone |
| **Niveles / líneas** | Camarilla Fibonacci Breakout · Trend Lines · Trendlines with Breaks [LuxAlgo] |
| **Volumen / perfil de volumen** | Volume · Up/Down Volume · VSA Volume · Volume Footprint [LuxAlgo] · Fixed Range Volume Profile · Session Volume Profile HD · Visible Range Volume Profile |
| **Smart Money / estructura** | Market Structure BOS/CHOCH/MSB/FVG/OB · Smart Money Concepts (SMC) [LuxAlgo] · BB Order Blocks · Imbalance zones · Inside Bar v2 |
| **Patrones de gráfico** | Double Bottom · Double Top · Elliott Wave |
| **Estrategias (backtest)** | Larry Connors RSI-2 · TL_Strategy [APIDEVs] · Volty Expan Close Strategy |
| **Suite CriptoBuzz VIP (cripto — fuera de alcance)** | SmartBuzz Screener [CRIPTOBUZZ] · Smart Buzz CriptoBuzz VIP · Dominancia VP CriptoBuzz VIP · Volumen Buy/Sell + Diferencia CriptoBuzz VIP · Zonas + ratio CriptoBuzz VIP · 2 Year MA Multiplier (macro BTC) |

---

## 2. Qué YA cubre Tito (en su capa de opciones/flujo)

No son los mismos indicadores, pero **responden a la misma pregunta** con datos de opciones:

| Concepto del indicador | Equivalente que Tito ya calcula |
|---|---|
| **Perfil de volumen** (Session/Visible/Fixed Range VP, Volume Footprint) | Volumen y **Open Interest por strike**, Open Premium, Notional, **GEX heatmap** (dónde está el dinero en opciones) |
| **Soportes/Resistencias, Trend Lines, Camarilla** | `levels.ts`: pivotes de precio **+ muros de opciones** (venta de calls = resistencia, venta de puts = soporte) con score de confluencia |
| **Bandas / volatilidad** (Bollinger, Squeeze, Fibonacci Bands) | **Contexto IV** (`ivcontext.ts`) + **Expected Move / cono σ** (bandas 1σ/2σ) |
| **Up/Down Volume, VSA, Buy/Sell Volume** | **Agresividad** (ejecución al bid/ask del flujo de opciones) + Convicción |
| **Smart Money / Order Blocks / Imbalance (parcial)** | **Estructura** (`structure.ts`) + niveles/muros; el "dinero institucional" lo ve por **premium y flujo inusual**, no por price-action |
| **Dirección/objetivo del precio** | **GEX**: nodo imán, zona flip, régimen (γ+ revierte / γ− amplifica) + **Prediction Pro** (escenarios) |

**Conclusión:** el "dónde está el dinero / niveles / volatilidad" ya lo tienes, pero **desde las
opciones**, no desde el precio del subyacente.

---

## 3. Qué FALTA por integrar (la capa que Tito no tiene)

Tito **no calcula indicadores de precio del subyacente**. Esta es la capa complementaria real:

| Falta | Por qué aporta a Tito |
|---|---|
| **Momentum del precio** (RSI, Stochastic, TSI, Power Oscillator) | Confirma si el precio **acompaña** lo que apuesta el flujo/GEX. Encaja con el sub-agente 6 "Confirmación de Precio". |
| **Fuerza/dirección de tendencia** (ADX, SuperTrend, EMAs, Hull) | Distingue tendencia vs rango — clave para leer si el GEX imanta (γ+) o amplifica (γ−). |
| **Compresión/expansión de volatilidad** (Squeeze Momentum) | Anticipa el "estallido" — **muy relevante para 0DTE**. Complementa el IV context. |
| **Estructura de price-action** (BOS/CHOCH, SMC, Order Blocks, Imbalance) | Contexto de estructura si operas smart money; hoy Tito solo lo infiere del flujo. |
| **Patrones** (Double Top/Bottom, Elliott) | Señales discretas de reversión; valor menor y más ruidoso. |
| **Señales de estrategias** (Connors RSI-2, TL_Strategy, Volty) | Disparadores accionables listos, si quieres alertas que Tito registre y cruce. |

**Cómo se integran (mecanismo):** configuras una **alerta en TradingView** sobre el indicador →
manda el payload al **webhook `/api/tradingview`** (ya existe) → Tito lo **parsea y lo cruza** con
su análisis de opciones. **Hoy el webhook solo archiva** las alertas; falta la capa que las
**interpreta y las muestra/pondera**. No hay que reprogramar el indicador — TradingView lo calcula.

---

## 4. Orden recomendado de integración

Priorizado por **valor para la tesis de opciones × bajo esfuerzo**. Todo vía webhook.

### Fase 0 — Prerrequisito (decisión, no código)
- **Elige tu shortlist real** (3–6 indicadores que de verdad usas para señales), no los 58.
- **Confirma el alcance:** ¿solo EE.UU. (SPX/SPY/acciones)? La suite CriptoBuzz y el uso en
  cripto necesitarían otra fuente de datos.

### Fase 1 — Confirmación de dirección (lo que más le falta a Tito)
1. **RSI** (elige UNA variante) + **ADX** — o **SuperTrend**. Cruza "el dinero apuesta X" (flujo/GEX)
   con "el precio confirma X" (momentum/tendencia). Alimenta directamente el sub-agente 6.
2. **Squeeze Momentum [LazyBear]** — compresión→expansión de volatilidad. Alto valor para 0DTE.

### Fase 2 — Niveles y confluencia
3. **Camarilla Fibonacci Breakout** y/o **Trendlines with Breaks** — cruzar sus niveles con los
   **muros GEX** de Tito (confluencia = señal más fuerte).
4. **Session / Visible Range Volume Profile** — cruzar POC/value area con los strikes de mayor OI/GEX.

### Fase 3 — Estructura y estrategias (opcional)
5. **Market Structure BOS/CHOCH / SMC** — contexto de estructura si operas price-action.
6. **Estrategias** (Connors RSI-2, TL_Strategy, Volty) — solo si quieres alertas accionables que
   Tito registre y contraste con su histórico.

### Fase 4 — Baja prioridad
7. **Patrones** (Double Top/Bottom, Elliott) — señales discretas, ruidosas; integrarlas al final.

---

## 5. Trabajo de plataforma que habilita todo lo anterior

Independiente de qué indicadores elijas, para "integrar de verdad" (que Tito **use** las señales,
no solo las archive) hace falta:

1. **Enriquecer el parseo del webhook** — reconocer el nombre del indicador (`strategy`) y sus
   valores (`raw`: `rsi`, `adx`, `signal`, `level`…), no solo ticker/action/price.
2. **Cruce con el ticker analizado** — mostrar en el dashboard las alertas TradingView del ticker
   junto al scorecard/GEX (confluencia visible).
3. **Rol de cada señal** — decidir si es solo **contexto**, **confirmación**, o **pesa en un score**
   (respetando la regla del sistema: sin evidencia/fórmula, no hay score).

---

## 6. Decisiones que necesito de ti (antes de crear nada)

1. **Shortlist:** ¿cuáles 3–6 indicadores usas de verdad para señales? (de la lista de arriba).
2. **Alcance:** ¿solo EE.UU. (opciones), o quieres también cripto? (cripto = otra fuente de datos).
3. **Rol:** ¿las señales de TradingView entran como **contexto/confirmación** (recomendado) o
   quieres que **pesen en un score**?

Con eso, armo el plan de implementación concreto (archivos, parseo, UI) y, si apruebas, empezamos.

---

## 7. Decisión final (2026-08-08) y plan de implementación

**Decisiones confirmadas por Victor:**
- **Alcance:** solo **acciones y opciones de EE.UU.** (SPX / SPY / acciones). La suite CriptoBuzz
  y cualquier uso en cripto quedan **descartados**.
- **Rol:** los indicadores entran como **CONTEXTO / confirmación**, **nunca como señal principal**
  y **no alteran el score 0-100** del scorecard (se respeta la regla "sin evidencia/fórmula, no
  hay score"). Solo indican **acuerdo o desacuerdo** con la tesis de flujo/GEX.

### Shortlist final (5 indicadores — cada uno llena un hueco de Tito)

| # | Indicador | Hueco que llena | Cómo se cruza con Tito (contexto) |
|---|---|---|---|
| 1 | **RSI** (Relative Strength Index) | Momentum del subyacente | ¿El precio acompaña lo que apuesta el flujo? Sobrecompra/sobreventa + divergencia vs la dirección del GEX |
| 2 | **ADX** | Fuerza de tendencia (tendencia vs rango) | Confirma el **régimen** GEX: γ+ (rango) casa con ADX bajo; γ− (tendencia) con ADX alto |
| 3 | **SuperTrend** | Dirección de tendencia (limpia) | Bandera direccional alcista/bajista para contrastar con el nodo imán (arriba/abajo del spot) |
| 4 | **Squeeze Momentum [LazyBear]** | Compresión→expansión de volatilidad | Timing de estallido — **alto valor 0DTE**; complementa el Contexto IV |
| 5 | **Session Volume Profile HD** (POC / value area) | Volumen negociado del **subyacente** | Cruza el POC/value area del precio con los strikes de mayor OI/GEX (confluencia de niveles) |

*(1–4 son las prioritarias; la #5 es la "extra" de nivel. Si quieres bajar a 3–4, se quitan #5 y una de {2,3}.)*

### Cómo se recibe cada señal (webhook, ya existente)

Cada indicador se configura como **alerta en TradingView** apuntando a `/api/tradingview`, con un
Message JSON que incluye el `passphrase` y un campo `source` con el nombre del indicador. Ejemplo:

```json
{"passphrase":"<secreto>","ticker":"{{ticker}}","source":"RSI","value":{{plot_0}},"signal":"{{plot_0}}","interval":"{{interval}}"}
```

`source` ∈ { `RSI`, `ADX`, `SuperTrend`, `Squeeze`, `VolumeProfile` }. Los valores viajan en el
`raw` del payload; no hace falta reprogramar el indicador — TradingView lo calcula.

### Plan de implementación (para aprobar — NADA de esto está hecho aún)

1. **`web/lib/tvContext.ts`** (PURO, con tests) — normaliza las señales de estos 5 `source` desde
   el `raw` del alert, las clasifica en **alcista / bajista / neutro**, y calcula una etiqueta de
   **acuerdo/desacuerdo** contra la dirección de la tesis de opciones (flujo/GEX). **No produce
   score**; solo contexto.
2. **Parseo** — extender `alert.ts` (o leer desde `raw` en `tvContext`) para reconocer `source` +
   `value`/`signal`. Retrocompatible con el webhook actual.
3. **UI — "Cinta de contexto TradingView"** en el dashboard del ticker (y opcional en `/0dte`):
   muestra las últimas señales de esos 5 indicadores para el ticker analizado, con banderas de
   **confluencia** (✅ acompaña / ⚠️ contradice la tesis). **Aislada del scorecard 0-100.**
4. **Tests** puros para `tvContext.ts` (clasificación y acuerdo/desacuerdo).
5. **Doc** — sección en `web/SPEC.md` y viñeta en `CLAUDE.md` con el contrato de cada `source`.

**Fuera de alcance de esta fase:** que las señales pesen en el score, patrones de gráfico,
estrategias de backtest, Smart Money/estructura, y todo lo de cripto.

---

*Relacionado: [web/SPEC.md — Webhook de alertas](web/SPEC.md) · [ESTADO-DEL-PROYECTO.md](ESTADO-DEL-PROYECTO.md) · [CLAUDE.md](CLAUDE.md)*
