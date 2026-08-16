# Mapa de brechas — Tito Core vs. repositorio real

**Fecha:** 2026-08-16 · **Fuente:** `Tito_Metralleta_ClaudeCode_Bundle_2026-08-16/handoff/ARCHITECTURE.md`
**Propósito:** cumplir el paso que el bundle pide *antes* de escribir código
(`CLAUDE_CODE_START_PROMPT.md`: *"Empieza únicamente por inspección y mapa de
brechas"*) y que el commit 1 (`web/lib/tito-core/`) se saltó. Este documento no
cambia ningún comportamiento — solo registra el estado real para informar los
próximos commits.

## 1. Las 5 capas de Reference Architecture v1 contra el repo real

| Capa (bundle) | Qué hay hoy en el repo real | Qué hay en `tito-core` (commit 1) |
|---|---|---|
| **Interface** | 6 vistas Next.js (Ticker, 0DTE, Ideas, Wheel, Time&Sales, Alertas) que leen de rutas API respaldadas por `lib/*.ts` | Nada — `tito-core` no está cableado a ninguna página todavía (a propósito, ver §3) |
| **Knowledge** | `predictionStore.ts` (sesgo/error histórico), `zerodteEval.ts` (auto-evaluación 0DTE) — formas parciales de "Learning" | No implementado (marcado DISEÑADO en `PROJECT_STATE.md`, no construido en ningún lado todavía) |
| **Logic** | Puntajes dispersos en `flow.ts`, `ivcontext.ts`, `structure.ts`, `validation.ts`, `gex.ts`, `prediction.ts`, `wheel.ts`, `zerodte.ts`, `risk.ts`; decisión final en `verdict.ts`/`zerodteVerdict.ts` | Workflow/Rule/Metrics/Decision/Explanation Engine completos, pero **solo sobre datos mock**, desconectados de la lógica real de arriba |
| **Data** | `data/` con una carpeta por módulo (`0dte`, `bars`, `chain`, `iv`, `predictions`, `trades`, etc.), cada una con su propio store ad hoc | `data/tito-core/history/{SYMBOL}.json` — un histórico aislado, no compartido con los stores existentes |
| **Infrastructure** | `schwab.ts` (OAuth2 + auto-retry 401), `massive.ts`, `marketsnack.ts` (cookie de sesión), webhook TradingView | Nada — `get_data` en `tito-core` es 100% sintético (`mockDataSource.ts`), sin tocar ninguna API |

## 2. El conflicto concreto que encontré (sin resolver, solo documentado)

**`web/lib/verdict.ts`** ya define un veredicto unificado que usa TODO el dashboard hoy:

```ts
export type TradeAction = "COMPRAR" | "ESPERAR" | "NO_OPERAR";
```

**3 estados.** El contrato oficial de `tito-core` (`sdk/tito-internal-sdk/src/contracts/opportunity.ts`) define:

```ts
export type OpportunityStatus = "operar" | "esperar" | "no operar" | "revisar manualmente";
```

**4 estados.** No es un simple renombrado 1:1 — el propio comentario de `verdict.ts` dice:
*"sesgo neutral o datos no fiables → NO OPERAR"*, es decir, el `verdict.ts` real **colapsa**
en `NO_OPERAR` dos cosas que `tito-core` separa a propósito: una oportunidad que rompe una
regla dura (`no operar`) y una señal ambigua/mixta que requiere ojo humano (`revisar
manualmente`). Migrar `verdict.ts` al contrato de 4 estados es una decisión de producto (no
solo técnica) que **no tomo aquí** — queda para un commit futuro, con tu aprobación explícita,
porque tocaría las 6 vistas del dashboard.

## 3. Por qué `tito-core` sigue aislado (decisión ya tomada contigo en el commit 1)

Elegiste explícitamente "carpeta nueva aislada" para el commit 1. Consecuencia directa: hoy
existen **dos sistemas de decisión en paralelo** sin comunicarse — el real (`verdict.ts` +
lib de scoring) sirviendo la UI en producción, y `tito-core` corriendo solo en tests contra
datos simulados. Eso es intencional en esta fase, no un descuido.

## 4. Piezas del diseño de referencia que faltan en AMBOS lados

Ni el repo real ni `tito-core` tienen todavía (todas marcadas DISEÑADO, no construido, en
`PROJECT_STATE.md`):

- Strategy Manager (versiones de estrategia con estados producción/experimental/pausada/archivada)
- Tito Lab / Backtester
- Configuration Engine (hoy la config vive en constantes hardcoded por módulo, ej.
  `CALIBRATION`, `THETA_BUDGET_PCT` en `prediction.ts`/`risk.ts` — no hay `configVersion`
  real en ningún lado del repo, solo en el mock de `tito-core`)
- Governance / Deployment Engine
- Monitoring / Resilience Engine (más allá del retry ad hoc de `schwab.ts`)
- Knowledge / Recommendation Engine, Continuous Improvement / Roadmap Engine
- Extension Framework + Compatibility Contract
- **Internal API v1** (`EXTENSIONS_AND_INTERNAL_API.md`) — envelope versionado con
  `requestId`/`timestamp`/`source`/`systemVersion`/`apiVersion`/errores tipados. Las rutas
  API reales hoy son REST/SSE simples sin ese envelope. Es "el siguiente gran contrato
  transversal pendiente" según el propio `README_CLAUDE_CODE.md`.

## 5. Algo que NO auditué a fondo (fuera de alcance de este documento)

La ley #10 de `ARCHITECTURE.md` ("technical failures never become trading decisions") debería
verificarse módulo por módulo en el código real — por ejemplo, si un fallo de `marketsnack.ts`
(cookie caducada) puede degradar silenciosamente un score en vez de marcar el dato como no
disponible. No revisé esto línea por línea; queda como pregunta abierta para cuando se decida
tocar esos módulos, no algo que deba resolverse en un commit de solo documentación.

## 6. Recomendación de orden (no ejecutada, solo propuesta)

Siguiendo el orden del propio bundle, después de este mapa lo que sigue — **cada uno como
commit separado, con tu aprobación previa**:

1. Internal API v1 (contrato de envelope, sin tocar rutas existentes todavía).
2. Decisión explícita sobre `verdict.ts` vs `OpportunityStatus` (migrar, convivir, o adaptar).
3. Solo después: conectar una fuente de datos real de solo lectura para 1-2 símbolos,
   manteniendo broker y ejecución real bloqueados (`NEXT_STEPS.md`).
