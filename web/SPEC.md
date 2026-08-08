# Spec — Lector web "Tito Metralleta" (v1)

Fecha: 2026-07-22 · Estado: aprobado, en implementación

## Objetivo

Primer incremento de la web interactiva que lee los datos del **Agente Principal (de Opciones)**.
Un input recibe un **ticker**; la app descarga la option chain desde **Massive**, muestra los
**pasos del proceso en vivo** durante la carga, y presenta una **tabla de detalle** con los
cálculos base del agente (Open Premium y Notional Value).

Cubre las Tareas 1, 2 y 5 del [Proceso Principal](../Agente%20Principal/Proceso%20Principal.md).

## Stack

- **Next.js** (App Router, TypeScript), en `Agente Tito Metralleta/web/`.
- API key en `.env.local` como `MASSIVE_API_KEY` — **solo servidor**, nunca `NEXT_PUBLIC`. En `.gitignore`.
- Progreso en vivo vía **SSE** (Server-Sent Events) desde un route handler.

## Proveedor de datos: Massive

- Base URL: `https://api.massive.com` · Auth: header `Authorization: Bearer <MASSIVE_API_KEY>`.
- Endpoint: `GET /v3/snapshot/options/{ticker}?limit=250`, paginado por `next_url` (cursor).
- Campos usados por contrato: `open_interest`, `day.volume`, `details.strike_price`,
  `details.expiration_date`, `details.contract_type`, `last_trade.price`, `day.close`,
  `underlying_asset.price`.

### Limitación conocida del plan actual
La respuesta **no incluye `last_quote` (bid/ask)** ni greeks (datos DELAYED). La fórmula del
agente pide **Bid** para Open Premium. Como fallback usamos el **precio del contrato**:
`last_trade.price ?? day.close ?? day.vwap`. La UI etiqueta la columna como "Open Premium (px)"
y muestra la fuente del precio. Al contratar un plan con quotes, se sustituye en `lib/compute.ts`
(función `contractPrice`) sin tocar el resto.

## Flujo de datos

1. Usuario escribe ticker → submit.
2. Frontend abre `EventSource` a `GET /api/chain?ticker=XXX`.
3. Servidor emite eventos `step` / `company` mientras:
   1. `Buscando información de {TICKER}…` → fetch de detalles + snapshot → emite evento `company`
      (logo, nombre, exchange, sector, Stock Price, % cambio, market cap, volumen, rango, cierre previo, empleados, descripción).
   2. `Conectando con Massive…`
   3. `Descargando option chain de {TICKER} — página N…` (avanza con `next_url`)
   4. `Consolidando C contratos en E vencimientos…`
   5. `Calculando Open Premium por strike…`
   6. `Calculando Valor Nocional…`
   7. `Ordenando por Open Interest (mayor → menor)…`
4. Servidor emite `done` con `{ rows, meta }`.
5. Frontend: el panel de empresa (logo + info + stats) se pinta en cuanto llega `company`
   (antes que la tabla); la tabla se pinta con `done`. La tabla incluye una fila TOTAL
   con la sumatoria de Open Interest, Volumen, Open Premium y **Notional Value**.

### Endpoints Massive usados
- Option chain: `GET /v3/snapshot/options/{ticker}` (paginado).
- Detalles empresa: `GET /v3/reference/tickers/{ticker}` (nombre, market_cap, exchange, branding/logo, etc.).
- Snapshot acción: `GET /v2/snapshot/locale/us/markets/stocks/tickers/{ticker}` (precio, % cambio, día).
- Logo: se sirve por proxy propio `GET /api/logo?ticker=XXX` para no exponer la API key en el cliente.

## Gráfica Top 5 por Notional (TradingView Lightweight Charts)

- Tras `done`, el frontend pide `GET /api/history?ticker=XXX` (barras diarias del subyacente, ~1 año)
  y calcula el **top 5 contratos por Notional Value**.
- Se renderiza un candlestick del precio con **TradingView Lightweight Charts** (`lightweight-charts`, open source)
  y una **línea horizontal (price line) por cada uno de los top 5 strikes**, con color y etiqueta
  (`#N · tipo strike · notional`). Debajo, una leyenda con contrato, vencimiento, OI, Open Premium y Notional.
- El logo/gráfica se muestran **antes** de la tabla. Endpoint de barras: `GET /v2/aggs/ticker/{ticker}/range/1/day/...`.

## Componentes

| Archivo | Responsabilidad | Depende de |
|---------|-----------------|------------|
| `lib/types.ts` | Tipos `RawContract`, `Row`, eventos SSE | — |
| `lib/compute.ts` | Funciones **puras**: `contractPrice`, `openPremium`, `notionalValue`, `toRow`, `sortByOpenInterestDesc` | — |
| `lib/massive.ts` | Cliente Massive: descarga paginada con callback de progreso | env key, `fetch` |
| `app/api/chain/route.ts` | Orquesta y transmite pasos por SSE | massive, compute |
| `app/page.tsx` | UI: input, lista de pasos en vivo, tabla | — |

## Modelo `Row`

```
{
  ticker, contractType ('call'|'put'), expiration, strike,
  openInterest, volume, price (contractPrice), priceSource,
  openPremium (OI × price), notionalValue (OI × 100 × strike)
}
```

## Tabla de resultados

Columnas: `Vencimiento · Tipo · Strike · Open Interest · Volumen · Precio · Open Premium · Notional Value`.
Orden por Open Interest de mayor a menor. Encabezados ordenables.

## Fórmulas

```
price          = last_trade.price ?? day.close ?? day.vwap
openPremium    = openInterest × price
notionalValue  = openInterest × 100 × strike
```

## Errores

- Ticker vacío/inválido o sin datos → evento `error` + mensaje en UI.
- 401/403 (auth) → "Revisa la API key".
- 429 (rate limit) → "Límite de tasa de Massive, reintenta en unos segundos".
- Contrato sin precio → `openPremium = null`, se muestra `n/a`.
- Tope de seguridad de paginación: `MAX_PAGES` (default 40 ≈ 10k contratos); si se alcanza, la meta lo indica.

## Pruebas

- Unit (vitest) sobre `lib/compute.ts` (funciones puras): cálculos, fallbacks de precio, orden.

## Fuera de alcance (incrementos siguientes)

Tarea 3 (comparación sectorial), Tarea 4 (interpretación muros Buy/Sell), Tarea 6 (liquidez vs "7 Magníficas"),
Tarea 7 (noticias RSS), histórico de 5 días, filtros por vencimiento/strike, greeks/GEX.

---

# Webhook de alertas de TradingView (`/api/tradingview`)

Fecha: 2026-08-08 · Estado: implementado

## Objetivo

**Buzón de entrada** de señales de TradingView. TradingView dispara una alerta y hace `POST`
al endpoint; el servidor **valida y persiste** (no procesa ni ejecuta nada). Tito consume las
alertas después leyéndolas por `GET`, igual que el agente lee `pending` en `/api/watchlist`.
Las rutas son puentes finos; la orquestación la hace el agente, no el servidor.

## Por qué el diseño es así (restricciones de TradingView)

- **No manda headers personalizados** → imposible firmar la petición (HMAC/`Authorization`).
  La única autenticación posible es un **secreto compartido dentro del cuerpo** (`passphrase`).
- **`Content-Type` suele llegar como `text/plain`** aunque el cuerpo sea JSON → el servidor lee
  `request.text()` y prueba **JSON** y luego **`clave=valor`**, en vez de confiar en `request.json()`.
- Endpoint **público** → secreto obligatorio, límite de tamaño de cuerpo (16 KB) y tope de
  alertas guardadas (500, se descartan las viejas) para que nadie llene el disco.

## Configuración

En `web/.env.local` (gitignored, **nunca** commitear el valor):

```
TRADINGVIEW_WEBHOOK_SECRET=<un secreto largo y aleatorio>
```

Sin esta variable el endpoint responde `503` y rechaza todo.

## Cómo configurar la alerta en TradingView

- **Webhook URL:** `https://TU_HOST/api/tradingview`
- **Message** (JSON recomendado; el `passphrase` debe ser idéntico al `.env.local`):

```json
{
  "passphrase": "EL_MISMO_SECRETO",
  "ticker": "{{ticker}}",
  "action": "{{strategy.order.action}}",
  "close": "{{close}}",
  "interval": "{{interval}}",
  "strategy": "mi-estrategia-0DTE",
  "message": "texto libre opcional"
}
```

También se acepta formato `clave=valor` (una por línea) para alertas simples.

## Contrato del endpoint

```
POST /api/tradingview
  body: JSON o clave=valor con el passphrase dentro
  200 → { ok: true, id, stored }
  400 → cuerpo ilegible o falta 'ticker'
  401 → passphrase incorrecto o ausente
  413 → cuerpo > 16 KB
  503 → TRADINGVIEW_WEBHOOK_SECRET no configurado en el servidor

GET /api/tradingview?ticker=&since=&limit=
  200 → { count, alerts: TradingViewAlert[] }   (más recientes primero)
```

## Normalización (payload → `TradingViewAlert`)

El parser tolera nombres alternativos porque cada estrategia rotula distinto:

- `ticker` ← `ticker | symbol | tick` (se quita el `$` y se pasa a mayúsculas)
- `action` ← `action | side | signal`, mapeado a **buy** (`buy/long/bull/call`),
  **sell** (`sell/short/bear/put/exit/close`) o **neutral** (default)
- `price` ← `price | close | last` · `timeframe` ← `timeframe | interval | tf`
- `strategy` ← `strategy | alert | name` · `message` ← `message | comment | text`
- `raw` guarda el payload original **sin el secreto** (auditoría)

## Componentes

| Archivo | Responsabilidad | Depende de |
|---------|-----------------|------------|
| `lib/alert.ts` | **Puro**: `parseAlertBody`, `verifySecret`, `toAlert`, `filterAlerts` | — |
| `lib/alertStore.ts` | Persistencia `data/alerts.json`, tope 500 (solo servidor) | `fs`, `alert.ts` |
| `app/api/tradingview/route.ts` | `POST` (valida+guarda) y `GET` (sirve) | alert, alertStore, env |
| `app/components/AlertsCard.tsx` | Tabla que lee `GET`, auto-refresca cada 15s | — |
| `app/alertas/page.tsx` | Página `/alertas` con filtro por ticker (pestaña 🔔) | AlertsCard, NavTabs |

## Seguridad

- El secreto viaja en el cuerpo (limitación de TradingView); se compara en tiempo casi
  constante y **nunca** se persiste ni se registra.
- Buzón acotado (500) + límite de cuerpo (16 KB) contra abuso de un endpoint público.
- Opcional (defensa en profundidad): restringir por las IPs publicadas de TradingView a nivel
  de proxy/hosting.

## Pruebas

- Unit (vitest) en `lib/alert.test.ts`: parseo JSON/`clave=valor`, verificación del secreto,
  normalización de acción/precio/ticker, que el secreto no cae en `raw`, y filtrado/orden.
