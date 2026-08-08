# Proceso 0DTE — Agente 0DTE

> Adaptación del [Proceso Principal](Proceso%20Principal.md) al caso de opciones que
> vencen el mismo día. El Proceso Principal se conserva intacto como base heredada:
> este documento **no lo reemplaza**, lo especializa.

## Objetivo

Vigilar de forma continua, durante la sesión, **dónde se está concentrando el volumen
de opciones SPX que vencen hoy**, y presentarlo en una tabla con forma de option chain
para leer de un vistazo qué strikes están en juego.

A diferencia del Proceso Principal —que busca actividad inusual acumulada, con historia
de días— aquí la ventana es **intradía**: el contrato nace y muere en la misma sesión, y
lo relevante es el volumen del día, no el Open Interest heredado.

## 1. Alcance

**Un solo subyacente: SPX.** Solo el vencimiento del día (DTE = 0).

| Fuente | Símbolo a enviar | Nota |
|--------|------------------|------|
| MarketSnack | `SPX` | los contratos vuelven con raíz **`SPXW`** |
| Schwab | `$SPX` | **requiere el prefijo `$`** |

Los símbolos OCC del vencimiento diario usan la raíz `SPXW`, no `SPX`
(ej. `SPXW260724C07450000`). El filtro de búsqueda va con `SPX`, pero el parseo debe
aceptar `SPXW`.

### 1.1 Fuera de alcance

- **SPY y QQQ** — retirados del alcance a propósito. El agente vigila SPX únicamente.
- **/ES y /NQ** — verificado el 24-jul-2026: `GET /marketdata/v1/chains` responde `400`
  a `/ES`, `/NQ` y `NQ`; `ES` resuelve la **acción** Eversource, no el futuro. El
  endpoint cubre opciones sobre acciones e índices, no sobre futuros. Requeriría otro
  proveedor.

## 2. Ciclo operativo

| Parámetro | Valor |
|-----------|-------|
| Zona horaria | `America/New_York` (**no** un offset fijo) |
| Inicio | 9:00 AM ET |
| Intervalo | cada 5 minutos |
| Fin | 4:00 PM ET *(supuesto — confirmar)* |
| Vencimiento | **solo el del día en curso** |

**La zona horaria se resuelve por nombre, no por offset.** "EST" es UTC−5 y solo aplica
en invierno; de marzo a noviembre Nueva York está en EDT (UTC−4). Fijar el offset a mano
desplazaría el ciclo una hora media parte del año.

**"Hoy" se calcula en hora de Nueva York, no en UTC.** Es la premisa misma del agente:
si la fecha se deriva de UTC, a partir de las 8:00 PM ET el sistema pediría el
vencimiento de mañana.

### 2.1 Fase pre-market (9:00 – 9:30 ET)

El mercado abre a las 9:30. El ciclo arranca a las 9:00 según lo pedido, pero las
lecturas anteriores a la apertura se marcan **explícitamente como pre-market** y se
consideran **no operables**.

Motivo: antes de la apertura el volumen del día es prácticamente nulo, así que un
ranking "por mayor volumen" en esa franja ordena ruido. Estas lecturas **sí se capturan
y se guardan** —sirven para ver el estado de la cadena al abrir— pero no deben
interpretarse como señal.

## 3. Fuentes de datos

Se usan **las dos, y cada una aporta algo que la otra no tiene.**

| | MarketSnack | Schwab |
|---|---|---|
| Naturaleza | time & sales (trades) | option chain (cadena) |
| Frescura medida | trade de hace **26 s** | `quoteTime` al segundo actual |
| `volume` del día por contrato | ✅ | ✅ |
| `open_interest` | ✅ | ✅ |
| `delta`, `gamma`, IV | ✅ | ✅ |
| **`side`** (agresor: ask/bid/mid) | ✅ | ❌ |
| Contratos que **no** operaron | ❌ no aparecen | ✅ cadena completa |
| **Nivel del índice SPX** | ❌ `asset_price` vacío | ✅ `underlyingPrice` |
| Autenticación | cookie de sesión (**caduca**) | OAuth `client_credentials` |

> **Nota de implementación (jul-2026):** el reparto de roles cambió respecto al diseño
> inicial de este documento tras probar contra las APIs. El plan original hacía a
> MarketSnack la fuente primaria del **ranking por volumen**; la medición lo desmintió
> (§3.3), así que **Schwab rankea y MarketSnack aporta solo el agresor**. Las secciones
> siguientes ya reflejan el reparto real.

### 3.1 Schwab — cadena y ranking (fuente primaria)

Es la base de la tabla:

1. **El volumen del día por contrato de toda la cadena.** Schwab entrega los ~636
   contratos del vencimiento; MarketSnack, al ser un feed de trades con ventana de ~1
   minuto, solo ve los ~80 que operaron en ese instante. Por eso **el ranking sale de
   Schwab**: es el único que tiene el volumen acumulado de todos los strikes.
2. **El nivel de SPX** (`underlyingPrice`), que MarketSnack no da para índices.
3. **OI, delta y gamma reales** por contrato, que alimentan el GEX del día.

### 3.2 MarketSnack — agresor (complemento)

Aporta la única cosa que Schwab no tiene y que hace falta para leer dirección:

- **`side`** — si la ejecución fue contra el ask (compra) o el bid (venta). Sin este
  dato, la tabla del [Proceso Principal §4](Proceso%20Principal.md) **no se puede
  aplicar**: verías volumen en un strike sin saber si es muro (venta) o apuesta
  direccional (compra).

Verificado el 24-jul-2026 sobre SPX: el feed **no está pre-filtrado** —38 de 50 trades
de la primera página eran de 1 solo contrato— así que el agresor no queda sesgado hacia
operaciones grandes. Pero su ventana es tan estrecha que **una foto suelta no vale**:
dos lecturas separadas por un minuto daban resultados opuestos en el mismo strike (7445
call pasó de COMPRA 58% a VENTA 77%). Por eso el agresor se **acumula** a lo largo de la
sesión — ver §4.4.

Schwab también rellena el lado del strike que no operó: si un strike entró al ranking
por sus puts y su call no se negoció, la cadena de Schwab trae igualmente su OI y delta.

### 3.3 Sobre la bandera `isDelayed` de Schwab

La cadena de Schwab llega marcada `isDelayed=true`, pero **el retraso real no es
material**. Medido el 24-jul-2026 a las 11:20 ET contra MarketSnack en el mismo
instante: SPY a 741.69 (Schwab) frente a 741.56 (MarketSnack, trade de hace 26 s) —
**0.018% de diferencia**, y el `quoteTime` de Schwab venía al segundo actual.

Un retraso de 15 minutos habría producido una diferencia de dólares, no de centavos.
**No hace falta contratar un feed en tiempo real** para este agente. Aun así, cada
lectura debe mostrar de qué fuente viene y de qué hora.

## 4. Datos y selección

### 4.1 Campos por contrato

| Campo | Origen | Uso |
|-------|--------|-----|
| **Strike** | símbolo OCC | eje de la tabla |
| **Volume** | Schwab | **único criterio de selección** |
| **Open Interest** | Schwab | contraste, no filtro (ver §8) |
| **Delta** | Schwab | exposición direccional |
| **Gamma** | Schwab | GEX del día (§5.1) |
| **Side / agresor** | MarketSnack (acumulado) | compra vs venta → interpretación §6.3 |

### 4.2 Criterio de selección

**Únicamente el volumen.** Sin ponderar por premium, notional ni ningún otro factor.

- **Los 10 strikes con mayor volumen de CALLS**
- **Los 10 strikes con mayor volumen de PUTS**

Los dos rankings son **independientes**. Como no tienen por qué coincidir, la unión
puede dar **hasta 20 strikes distintos**.

Mantener los lados separados preserva la **asimetría**, que es información: un strike
con mucho call y nada de put es una señal distinta a uno equilibrado, y un ranking
combinado la borraría.

**El lado que no clasificó se muestra igualmente**, con su dato real. Aquí entra Schwab:
si un strike entró por el lado put y su call no operó, MarketSnack no tiene fila para
ese call —y la cadena de Schwab sí, con su OI y su delta. Sin ese complemento la mitad
de la tabla saldría en blanco.

**Empates:** a igual volumen, gana el strike más cercano al nivel del índice.

### 4.3 El ranking no necesita acumularse; el agresor sí

El volumen del ranking **no se acumula**: Schwab ya entrega `totalVolume` del día por
contrato, sobre toda la cadena. Cada consulta trae el estado completo, así que un strike
que operó por la mañana y se quedó quieto sigue apareciendo con su volumen correcto.
*(El diseño inicial de este documento planteaba acumular el volumen porque asumía que la
fuente era el feed de trades de MarketSnack; con Schwab como fuente del ranking, esa
acumulación es innecesaria.)*

Lo que **sí** se acumula es el **agresor** (§4.4), porque ahí la fuente sí es el feed de
ventana estrecha.

### 4.4 Acumulación del agresor durante la sesión

El `side` viene de MarketSnack, cuyo feed cubre ~1 minuto de cinta por consulta. Una foto
suelta es inestable (§3.2). Por eso el agente mantiene un **acumulado por contrato** del
día: cada ciclo suma su tramo de cinta —deduplicando por id de trade— al total en
`data/0dte/{TICKER}-{FECHA}.json`. A media sesión hay decenas de muestras repartidas, y
la lectura de compra/venta se estabiliza conforme avanza el día. El acumulado es
**intradía**: no se arrastra de un día al siguiente.

Reglas del acumulado:
- **Mínimo de 5 trades** para publicar un porcentaje. Un 100% de un solo trade no es
  señal, así que la celda se deja vacía.
- Se descartan las **transacciones canceladas** y todo lo que no venza hoy.
- **MID** se etiqueta aparte; las ejecuciones sin clasificar cuentan como trade pero no
  suman a ningún lado.

## 5. Tabla de salida

Formato de option chain clásico — strike al centro, calls a un lado, puts al otro:

```
  Agresor   Vol   OI   Delta │  STRIKE  │  Delta   OI   Vol   Agresor
```

Reglas de presentación:

- Ordenada por **strike descendente** (no por volumen) — así se lee como una cadena
  real, y con los precios altos arriba, igual que un gráfico.
- El **nivel de SPX** se marca en su posición dentro de la escala de strikes.
- Se indica **por qué entró cada strike**: por el ranking de calls, el de puts, o ambos.
- El strike de mayor volumen de cada lado se marca (**MAX CALL / MAX PUT**).
- Cada lectura muestra su **hora de captura en ET** y si es pre-market.

### 5.1 Paneles derivados

Sobre la tabla, tres lecturas que el volumen y la cadena permiten:

- **Escenarios hasta el cierre** — tres objetivos (bajista/base/alcista) con % y
  probabilidad de tocarlos antes de las 16:00 ET. El imán es el strike de mayor volumen
  ponderado por probabilidad de toque, recortado al cono de 2σ. La IV es la *at-the-money*
  del día (±2% del spot), no la de toda la cadena, que en 0DTE se dispara. **No dan
  dirección**: son zonas de atracción con su probabilidad.
- **Gamma del día (GEX)** — régimen (γ positiva revierte hacia el imán / γ negativa
  amplifica), strike imán (mayor gamma) y zona de inversión (donde el GEX acumulado
  cambia de signo). Calculado solo sobre el vencimiento del día, con la gamma real de
  Schwab.
- **Ratio Put/Call** y los dos strikes de mayor volumen, sobre la cadena completa.

## 6. Salvaguardas

### 6.1 Frescura y procedencia

El retraso no es un bloqueo (§3.3), pero sí una propiedad que hay que mostrar: cada
lectura indica de qué fuente salió cada dato y de qué hora. **Nunca presentar una
lectura como si fuera en vivo sin respaldarlo con su marca de tiempo.**

### 6.2 Caducidad de la sesión de MarketSnack

La autenticación es por **cookie de sesión, que expira**. Para un agente desatendido que
arranca a las 9:00 todos los días, es la fragilidad operativa más probable.

- El fallo debe ser **visible e inequívoco** ("sesión expirada, renovar cookie"), nunca
  una tabla vacía o a medias que parezca un mercado tranquilo.
- Al caer MarketSnack, el agente **sigue operando solo con Schwab**, marcando que perdió
  el dato de `side` y que la interpretación compra/venta no está disponible.

### 6.3 Interpretación de flujo

La tabla del [Proceso Principal §4](Proceso%20Principal.md) sigue vigente sin cambios, y
`side` es lo que la habilita:

| Operación | Señal |
|-----------|-------|
| Buy Call | Direccional (alcista) |
| Sell Call | Resistencia / posible "muro" |
| Buy Put | Hedge **o** direccional → requiere validación |
| Sell Put | Soporte |

### 6.4 Liquidez

Se hereda la regla del [Proceso Principal §6](Proceso%20Principal.md): nunca recomendar
operar una cadena ilíquida. En 0DTE aplica **por strike**: un strike lejano puede tener
volumen suficiente para entrar al top 10 y aun así carecer de liquidez real para salir.

## 7. Qué se hereda y qué no

| Tarea del Proceso Principal | En el Agente 0DTE |
|---|---|
| 1. Open Interest por vencimiento | **Adaptada** — un solo vencimiento, el de hoy |
| 2. Volumen + histórico de 5 días | **Reemplazada** — ventana intradía, cada 5 min |
| 3. Comparación sectorial | **Fuera de alcance** — un solo índice |
| 4. Interpretación Call/Put | **Heredada sin cambios** — ver §6.3 |
| 5. Fórmulas (Open Premium, Notional) | **No se usan como filtro** — ver §8 |
| 6. Evaluación de liquidez | **Heredada y endurecida** — ver §6.4 |
| 7. Monitoreo RSS | **Aplazada** — no en el primer incremento |

## 8. Por qué el volumen y no el Open Premium

La fórmula `Open Premium = OI × Bid` del Proceso Principal asume que el Open Interest
representa posición viva y relevante. **En 0DTE eso no se sostiene**, y hay medición:

| Contrato | Volumen del día | Open Interest | Ratio |
|---|---|---|---|
| `SPXW260724C07450000` | 66,047 | 3,039 | **22×** |
| `SPXW260724C07440000` | 44,924 | 1,617 | **28×** |
| `SPY260724P00738000` | 327,841 | 8,079 | **41×** |

*(medido el 24-jul-2026 a las 11:20 ET)*

El OI se publica con un día de rezago y no recoge lo que abre y cierra dentro de la
misma sesión —que en 0DTE es casi todo. Por eso **el criterio es el volumen** y el OI
se muestra solo como contraste.

## 9. Estado de implementación

Lo construido vive en `web/lib/zerodte.ts` (cadena, escenarios, GEX del día),
`web/lib/zerodteFlow.ts` (agresor acumulado) y `web/app/0dte/` (página + rutas). Todo lo
puro está cubierto por `zerodte.test.ts` y `zerodteFlow.test.ts`.

**Resuelto al implementar:**

1. **Se esquivó el bug de `dteWindows(0)`.** En vez de tocar `fetchOptionChain`, la
   consulta 0DTE pide `fromDate = toDate = hoy`, que baja una sola expiración sin pasar
   por el troceo por ventanas. El bug de `maxDte ? ... : DTE_WINDOWS` (donde `0` es
   *falsy*) sigue ahí, pero este agente no lo toca.
2. **La fecha se calcula en `America/New_York`**, reusando `marketDateStr` de `occ.ts`,
   no en UTC.
3. **Símbolos normalizados:** `$SPX` para Schwab, `SPX` para MarketSnack, `SPXW` aceptado
   en el parseo OCC.
4. **El GEX del día va aparte de `gexAnalysis`**, que descarta todo contrato con
   `daysToExpiration <= 0` —y en 0DTE eso es la cadena entera—. Misma fórmula de GEX
   para que los números sean comparables.
5. **La IV del pronóstico es la at-the-money (±2%)**, no la de `chainIV` (±20%), que en
   0DTE se dispara por los strikes lejanos.

**Corregido de la propia `.gitignore`:** la regla `API/` capturaba también
`web/app/api/` en Windows (`core.ignorecase`), ignorando en silencio las rutas nuevas.
Anclada como `/API/`.

## 10. Pendiente

- **Ciclo automático de 5 minutos.** Hoy el agente acumula el agresor cuando se carga la
  página; falta el scheduler que corra solo desde las 9:00 ET, con aviso claro cuando la
  cookie de MarketSnack caduque.
- **Auto-evaluación.** Guardar cada pronóstico y contrastarlo contra el cierre real del
  mismo día, midiendo acierto y sesgo — como hace `predictionStore` para el agente de
  días. Es lo que convertiría las afirmaciones en algo medible.
- **`web/.env.example`** no documenta `SCHWAB_CLIENT_ID` / `SCHWAB_CLIENT_SECRET`.
- **Alcance del selector.** La página ofrece SPY y QQQ además de SPX; la spec es solo
  SPX. Decidir si se retiran.
- **Hora de cierre del ciclo** — se asume 4:00 PM ET. Confirmar.
- **Cobertura de gamma real:** solo ~47% de los contratos la traen; el resto se omite del
  GEX. Entender por qué.
