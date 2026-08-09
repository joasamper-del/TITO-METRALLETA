# Estado del Proyecto — Agente Tito Metralleta

**Fecha de revisión:** 2026-08-08 · **Rama:** `main` @ `c7142e4` · **Sin push:** 19 commits por delante de `origin`

> Revisión completa del estado actual y los próximos pasos. Sistema multi-agente de
> análisis de flujo de opciones (options flow) con dos motores: análisis de **días**
> (dashboard Ticker) y análisis **intradía 0DTE** (SPX mismo día).

---

## 1. Resumen ejecutivo

El proyecto está **funcional y verificado** en su núcleo. En esta última fase se **unificó el
módulo 0DTE** (que vivía en una copia aparte) dentro del repo principal, se **verificaron las
credenciales de Schwab** (autentican y traen datos reales) y se **endureció la renovación de
token** (auto-retry ante 401).

- **Stack:** Next.js 15 · React 19 · TypeScript · CSS plano · vitest.
- **Calidad:** `tsc` limpio · **577 tests** en 25 archivos, todos en verde.
- **6 vistas:** 📈 Ticker · 🎯 0DTE · 💡 Ideas · 🎡 Wheel · ⚡ Time & Sales · 🔔 Alertas.
- **Pendiente inmediato:** `git push origin main` (19 commits sin subir) y ver `/0dte`
  poblado en un día hábil de mercado.

---

## 2. Arquitectura

```
web/  (Next.js App Router)
├── app/
│   ├── page.tsx            Dashboard Ticker (análisis de días)
│   ├── 0dte/               Agente 0DTE (SPX intradía)
│   ├── ideas/              Screener de mercado + panel de riesgo
│   ├── wheel/              Screener de cash-secured puts
│   ├── flow/               Time & Sales (agresividad)
│   ├── alertas/            Buzón de webhooks de TradingView
│   ├── api/                13 rutas (ver §4)
│   └── components/         38 componentes de UI
└── lib/                    39 módulos de lógica pura + clientes de datos (con tests)
```

**Principio de diseño:** la lógica vive en `lib/*.ts` (funciones **puras**, testeadas); las
rutas API son puentes finos; los clientes de datos (`massive`, `marketsnack`, `schwab`) solo
en servidor. Cálculos financieros en Black-Scholes propio (`blackScholes.ts`, `gex.ts`).

---

## 3. Módulos y estado

| Módulo | Qué hace | Estado |
|---|---|---|
| **Dashboard Ticker** (`page.tsx`) | Scorecard de 6 sub-agentes, GEX + heatmap, Prediction Pro (bull/base/bear), niveles S/R, memoria/auto-eval, noticias. Vistas Estudiante/Pro. | ✅ Operativo |
| **Prediction Pro** (`prediction.ts`) | 3 escenarios con σ; horizontes **Hoy(0DTE)/10/20/30**; auto-corrección por sesgo histórico. | ✅ Operativo |
| **GEX** (`gex.ts`, `gexHeatmap.ts`) | Nodos de concentración, imán, flip, régimen, confianza; heatmap strike×vencimiento. | ✅ Operativo |
| **Agente 0DTE** (`zerodte.ts`, `zerodteFlow.ts`, `zerodteEval.ts`, `/0dte`) | SPX mismo día: ranking por volumen (Schwab) + agresor acumulado (MarketSnack), escenarios al cierre, GEX del día, auto-evaluación. | ⚠️ Auth y datos verificados; **falta ciclo automático** y verlo poblado en día hábil |
| **Wheel** (`wheel*.ts`, `/wheel`) | Screener de cash-secured puts, sizing, asequibilidad en cliente. | ✅ Operativo |
| **Ideas + Riesgo** (`risk.ts`, `/ideas`) | Escaneo de mercado, cascada de calidad, sizing por prima/theta. | ✅ Operativo |
| **Watchlist + broker** (`watchlist.ts`, `/api/watchlist`) | ⭐ marca contratos, cola de salida, sync con Robinhood por MCP. | ✅ Operativo |
| **Alertas TradingView** (`alert.ts`, `/api/tradingview`, `/alertas`) | Webhook (buzón pasivo) con secreto compartido; UI con auto-refresh. | ✅ Operativo |

**Scorecard (6 sub-agentes):** Agresividad, Convicción, Inusualidad, Estructura, Contexto IV,
y Confirmación de Precio/Validación. Todos con lógica y panel; alimentan Prediction Pro.

---

## 4. Fuentes de datos y credenciales

| Fuente | Uso | Auth | Estado |
|---|---|---|---|
| **Schwab** | Option chain 0DTE (volumen, OI, griegos), quote SPX, barras intradía | OAuth2 `client_credentials` (`SCHWAB_CLIENT_ID/SECRET`) | ✅ **Verificado** (token 200, SPX 7757.64). Token se renueva solo + **auto-retry ante 401** |
| **Massive** (ex-Polygon) | Chain de días, referencia, barras, noticias | `MASSIVE_API_KEY` | ✅ Operativo |
| **MarketSnack** | Time & Sales, agresor (bid/ask) | Cookie de sesión (`MARKETSNACK_COOKIE`) | ⚠️ Operativo, pero **la cookie caduca** (fragilidad) |
| **FRED** | Macro | `FRED_API_KEY` | Configurado |
| **TradingView** | Webhook de alertas → `/api/tradingview` | Secreto en el cuerpo (`TRADINGVIEW_WEBHOOK_SECRET`) | ✅ Operativo |

Todas las claves viven en `web/.env.local` (gitignored — **nunca se suben**).

---

## 5. Rutas API

`0dte` · `bars` · `chain` · `flow` · `history` · `ideas` · `logo` · `news` · `prediction` ·
`tradingview` · `validation` · `watchlist` · `wheel`

---

## 6. Verificación (esta revisión)

- `npx tsc --noEmit` → **limpio**.
- `npx vitest run` → **577 tests / 25 archivos, todos verdes**.
- Rutas `/`, `/0dte`, `/alertas`, `/ideas`, `/wheel`, `/flow` → **HTTP 200**.
- Análisis real de SPY en el dashboard → sin errores (chain + flow + GEX + predicción).
- Credenciales Schwab → **válidas** (token 200 + quote SPX real).
- `/0dte` → vacío por ser fin de semana (no hay 0DTE); comportamiento correcto.

---

## 7. Riesgos y deuda técnica

1. **`/0dte` sin verificar poblado en vivo** — solo probado auth + datos sueltos; falta una
   sesión de mercado real (lunes) para confirmar la tabla completa.
2. **Cookie de MarketSnack caduca** — es la fragilidad operativa más probable para un agente
   desatendido. El fallo es visible, pero requiere renovación manual.
3. **Cobertura de gamma real de Schwab ~47%** — el resto de contratos se omite del GEX del día
   (entender por qué; ver Proceso 0DTE §10).
4. **19 commits sin push** — el trabajo está solo en local.
5. **Rama `feat/wheel-strategy` redundante** — es ancestro de `main`; conviene borrarla.
6. **Cambios pre-existentes sin commitear** — `massive.ts` tiene `console.log` de debug y
   `change: null`; `HeaderBar.tsx`, `README.md` y `.pages` con ediciones sueltas. Revisar y
   commitear o descartar.

---

## 8. Próximos pasos (priorizados)

### Ahora
1. **`git push origin main`** — subir los 19 commits (credenciales quedan fuera por `.gitignore`).
2. **Verificar `/0dte` en vivo** el próximo día hábil (lunes) en horario de mercado (9:30–16:00 ET).
3. **Borrar rama redundante:** `git branch -d feat/wheel-strategy`.

### Corto plazo (del Proceso 0DTE §10)
4. **Scheduler automático 0DTE** — ciclo cada 5 min de 9:00 a 16:00 ET que acumule el agresor
   y avise claramente cuando caduque la cookie de MarketSnack.
5. **Cerrar la auto-evaluación 0DTE** — `zerodteEval.ts` ya existe; falta guardar el pronóstico
   diario y contrastarlo con el cierre real (como `predictionStore` en el de días).
6. **Decidir alcance del selector 0DTE** — la página ofrece SPY/QQQ además de SPX; la spec es
   solo SPX. Retirar o documentar.
7. **Documentar Schwab en `.env.example`** — confirmar que están todas las variables (`CLIENT_ID`,
   `CLIENT_SECRET`, y opcionales `TOKEN_URL`/`API_BASE`/`MAX_DTE`).

### Higiene / robustez
8. **Limpiar `massive.ts`** (quitar `console.log` de debug; revisar `change: null`).
9. **Resiliencia de MarketSnack** — aviso proactivo antes de que la cookie caduque.
10. **Entender la cobertura de gamma de Schwab** (por qué solo ~47% trae gamma real).

---

## 9. Cómo correr / probar

```bash
cd "C:\Users\18327\Downloads\Agente Tito Metralleta\Agente Tito Metralleta\web"
npm run dev            # http://localhost:3000
npx vitest run         # tests
npx tsc --noEmit       # typecheck
```

O doble clic en el acceso directo **TITO METRALLETA** del escritorio (arranca el servidor y
abre el dashboard).

---

*Referencias: [CLAUDE.md](CLAUDE.md) · [web/SPEC.md](web/SPEC.md) · [Agente Principal/Proceso 0DTE.md](Agente%20Principal/Proceso%200DTE.md) · [Guia GEX y Prediccion](Guia%20GEX%20y%20Prediccion%20-%20Tito%20Metralleta.pdf)*
