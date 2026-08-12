# Auto-descubrimiento de candidatos 0DTE

> Para que el módulo 0DTE **encuentre candidatos solo** en vez de elegir el ticker a mano.
> Enfoque: scan de Robinhood (rápido) + filtros manuales que el scanner no cubre.
> *"No es consejo financiero. Solo análisis inteligente."*

## Paso 1 — Scan de Robinhood (lo que sí filtra el scanner)

Scan guardado (id `762e390a-4c25-4299-853f-97b78550f51b`), ordenado por **volumen relativo de
opciones** desc. Filtros:

| Criterio | Filtro | Valor |
|---|---|---|
| Volumen de opciones inusual (la señal del día) | `FILTER_TYPE_RELATIVE_OPTIONS_VOLUME` (1d, len 30) | `> 1.3` |
| Liquidez de opciones (mercado profundo) | `FILTER_TYPE_AVERAGE_OPTIONS_VOLUME` (1d, len 30) | `> 20000` |
| La acción está activa | `FILTER_TYPE_RELATIVE_VOLUME` (1d, len 30) | `> 1.1` |
| Tamaño / liquidez | `FILTER_TYPE_MARKET_CAP` · `FILTER_TYPE_LAST` | `>10B` · `>20` |

> **Nota técnica:** `FILTER_TYPE_TOTAL_OPTIONS_VOLUME` y `FILTER_TYPE_TOTAL_OPEN_INTEREST` con
> intervalo `1d` fallan en DXFeed (generan `candleCount=0`, rechazado). Usar
> `AVERAGE_OPTIONS_VOLUME` (acepta `length`) como proxy de liquidez.

## Paso 2 — Gate 0DTE AUTOMÁTICO (el scanner no lo cubre, pero se automatiza)

**No es paso manual.** Sobre CADA candidato del scan, llamar `get_option_chains(ticker)` y
comprobar si **la fecha de HOY (ET) está en `expiration_dates`**. Se descartan automáticamente
los que no la tengan. Un barrido en paralelo sobre los 12 resuelve el gate sin intervención.

> **Lección (2026-08-11, martes):** los vencimientos diarios de **nombres individuales son
> Lun/Mié/Vie** (patrón 12-Mié, 14-Vie, 17-Lun, 19-Mié…). **Martes y jueves NO tienen 0DTE de
> single-names** — solo los **índices** (SPY/QQQ/SPX) vencen cada día hábil. Ese día, el gate
> automático descartó los 12 candidatos de acciones correctamente. Para cubrir Mar/Jue, incluir
> SPY/QQQ en el universo (0DTE diario garantizado).

## Paso 3 — Filtros de contexto (a mano, sobre los que pasan el gate)

1. **Noticia fresca / catalizador** — `WebSearch` del nombre: earnings, guía, upgrade, evento.
   Es lo que suele explicar el surge de volumen de opciones.
2. **Evento binario** — si la noticia es un earnings HOY/mañana → marcar en "cuándo NO operar"
   (la ruptura puede revertir; esperar el reporte).

## Paso 4 — Correr el scorecard 0DTE

Sobre los 1–3 mejores candidatos, correr el Options Flow Scorecard + la conclusión ejecutiva
(ver `Options-Flow-Scorecard.md`, `Conclusion-Ejecutiva-0DTE.md`). El descubridor **surface**;
el scorecard **decide**.

## Ejemplo (2026-08-11)
El scan encontró 12 candidatos. Líder: **SMCI** (vol. rel. opciones **4.42×**, +10%). Filtro de
noticia → **earnings HOY tras el cierre** (preliminares fuertes: margen 15–17%, backlog $60B). El
pipeline funcionó solo, y la noticia marcó el evento binario → esperar el reporte.

*Toda ejecución la hace el usuario manualmente.*
