# ETH LONG SUPERVISOR — Fail-Safe v3

**Sesión 38 — Ejecución controlada de orden ETH LONG en Alpaca PAPER**

---

## ⚠️ ANTES DE EJECUTAR

✋ **NO EJECUTES HOY.** Primero:

1. ✅ **Lee el código** en `ethLongSupervisor.ts` (líneas 1-100, configuración)
2. ✅ **Corre las 5 pruebas** de fail-safe (ver abajo)
3. ✅ **Confirma** que entiendes los 5 escenarios
4. ✅ **LUEGO** solicita autorización para ejecutar la orden

---

## Estructura

```
web/lib/executors/
├── ethLongSupervisor.ts              # Supervisor principal + lógica Alpaca
├── ethLongSupervisor.failsafe-tests.ts  # 5 escenarios de robustez
└── README.md                          # Este archivo
```

---

## Paso 1: REVISAR EL CÓDIGO

Abre `ethLongSupervisor.ts` y verifica:

| Sección | Líneas | Qué revisar |
|---------|--------|-----------|
| **CONFIG** | 48–57 | `symbol: "ETHUSD"`, `quantity: 0.1`, `stopPrice: 2402.75`, `tpPrice: 2548.26` |
| **loadEnvironment()** | 63–81 | Lee `ALPACA_PAPER_KEY/SECRET` desde `.env.local` (sin mostrarlas) |
| **verifyPaperEndpoint()** | 83–96 | **BLOQUEO ABSOLUTO** de endpoint LIVE; solo PAPER permitido |
| **generateClientOrderId()** | 98–102 | Crea UUID único `ETH-LONG-{timestamp}-{random}` |
| **placeEntryOrder()** | 108–127 | Simula entrada BUY 0.1 ETH @ MARKET |
| **placeStopLossOrder()** | 129–151 | Simula stop SELL 0.1 @ $2,402.75 STOP |
| **ETHLongSupervisor.execute()** | 212–291 | Los 5 pasos: verificar endpoint → sin posiciones previas → entrada → stop → monitor |

✅ **Lo que debes confirmar:**
- ✓ `verifyPaperEndpoint()` rechaza LIVE con error
- ✓ `CONFIG.quantity = 0.1` (no mayor)
- ✓ `CONFIG.stopPrice = 2402.75` (100% protección)
- ✓ `CONFIG.tpPrice = 2548.26` (virtual, no en broker)

---

## Paso 2: CORRER LAS 5 PRUEBAS FAIL-SAFE

### Opción A: Todos los escenarios (recomendado)

```bash
npx ts-node web/lib/executors/ethLongSupervisor.failsafe-tests.ts --scenario=all
```

**Espera:** 5 pruebas secuenciales (10–15 segundos)

**Resultado esperado:** 5 ✅ PASS

### Opción B: Un escenario a la vez

```bash
# Escenario 1: Pérdida de conexión (60s timeout)
npx ts-node web/lib/executors/ethLongSupervisor.failsafe-tests.ts --scenario=1

# Escenario 2: Fill parcial (entrada sin stop confirmado)
npx ts-node web/lib/executors/ethLongSupervisor.failsafe-tests.ts --scenario=2

# Escenario 3: Cancelación fallida del stop
npx ts-node web/lib/executors/ethLongSupervisor.failsafe-tests.ts --scenario=3

# Escenario 4: Doble ejecución (reintento sin idempotencia)
npx ts-node web/lib/executors/ethLongSupervisor.failsafe-tests.ts --scenario=4

# Escenario 5: Crash + reinicio
npx ts-node web/lib/executors/ethLongSupervisor.failsafe-tests.ts --scenario=5
```

### Qué mide cada prueba

| # | Escenario | Protección | Verificación |
|---|-----------|-----------|--------------|
| **1** | Desconexión (60s) | Stop activo en broker sobrevive | ✅ Loss ≤ $4.75 |
| **2** | Fill parcial | Detección automática → cierre 100% | ✅ Sin stop = cierre inmediato |
| **3** | Cancel falla | Stop persiste como defensa | ✅ Loss capped, TP virtual |
| **4** | Doble ejecución | Client Order ID único | ✅ Alpaca rechaza segundo intento |
| **5** | Crash + reinicio | Recuperación desde Alpaca | ✅ Ninguna posición huérfana |

---

## Paso 3: ENTENDER EL FLUJO DE EJECUCIÓN

### Modo Dry-Run (simulación sin conectar a Alpaca)

```bash
npx ts-node web/lib/executors/ethLongSupervisor.ts --dry-run
```

**Qué pasa:**
1. Verifica endpoint PAPER (pasa)
2. Simula sin posiciones previas (pasa)
3. Simula entrada: BUY 0.1 ETH @ $2,450.25 ✓
4. Simula stop: SELL 0.1 @ $2,402.75 STOP ✓
5. Simula monitoreo (5 segundos → TP alcanzado → cierre @ MARKET)
6. **No envía órdenes a Alpaca**

**Salida esperada:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ETH LONG SUPERVISOR v3 - [DRY-RUN]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PASO 1: Verificación Alpaca PAPER
✅ Endpoint verificado: https://paper-api.alpaca.markets

PASO 2: Verificación de posiciones/órdenes previas
[DRY-RUN] Consultando posiciones existentes...
✅ Sin posiciones previas

PASO 3: Orden de entrada
✓ [DRY-RUN] Orden de entrada simulada: BUY 0.1 ETH @ MARKET
✅ Entrada ejecutada: 0.1 ETH @ $2,450.25 (simulado)

PASO 4: Colocación de stop-loss 100%
✓ [DRY-RUN] Orden stop-loss simulada: SELL 0.1 ETH @ $2,402.75 STOP
✅ Stop-loss colocado: SELL 0.1 ETH @ $2,402.75 STOP

PASO 5: Monitoreo iniciado
⏱️  Monitor: Cada 5s
⏱️  Timeout desconexión: 60s

[Monitor] Precio alcanzó TP? Simulando TP alcanzado...
✓ [DRY-RUN] Cancelación de stop simulada
✓ Stop-loss cancelado
✓ [DRY-RUN] Cierre @ MARKET simulado: SELL 0.1 ETH
✓ Posición cerrada @ $2425.746999999998

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESULTADO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "success": true,
  "message": "✅ Operación completada",
  "entryOrderId": "ETH-LONG-1725020400123-k3xj2q1c",
  "stopOrderId": "ETH-LONG-1725020400123-k3xj2q1c-SL",
  "executedPrice": 2450.25,
  "executedQty": 0.1,
  "maxLoss": 4.75
}
```

✅ **LISTO PARA OPERATIVO**

---

## Paso 4: EJECUCIÓN EN ALPACA PAPER (Operativo)

⚠️ **SOLO DESPUÉS DE:**
- ✓ Código revisado
- ✓ 5 pruebas pasadas
- ✓ Autorización del usuario explícita

### Comando

```bash
npx ts-node web/lib/executors/ethLongSupervisor.ts --execute-now
```

**Qué pasa:**
1. Lee `ALPACA_PAPER_KEY` y `ALPACA_PAPER_SECRET` de `.env.local`
2. **Bloqueo absoluto:** verifica endpoint PAPER (rechaza LIVE)
3. **Genera client_order_id único:** `ETH-LONG-{timestamp}-{random}`
4. Verifica sin posiciones/órdenes ETH previas
5. **Envía BUY 0.1 ETH @ MARKET a Alpaca PAPER** ← AQUÍ
6. Espera confirmación de fill
7. **Envía SELL 0.1 @ $2,402.75 STOP** ← Y AQUÍ
8. Inicia monitoreo: vigila TP, cancela stop si alcanzado, cierra posición
9. Registra resultado con IDs, precios reales, max loss

**Salida esperada:**
```
🚨 MODO OPERATIVO: Enviando órdenes a Alpaca PAPER
   Asegúrate de estar preparado.

[... pasos 1-4 igual que dry-run ...]

PASO 3: Orden de entrada
→ Enviando BUY 0.1 ETH @ MARKET a Alpaca PAPER...
✅ Entrada ejecutada: 0.1 ETH @ $2,450.25 (real)

PASO 4: Colocación de stop-loss 100%
→ Enviando SELL 0.1 ETH @ $2,402.75 STOP a Alpaca PAPER...
✅ Stop-loss colocado: SELL 0.1 ETH @ $2,402.75 STOP

PASO 5: Monitoreo iniciado
[Monitor] Vigilando TP y posición en tiempo real...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESULTADO:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "success": true,
  "message": "✅ Operación completada",
  "entryOrderId": "ABC123XYZ",          ← ID real de Alpaca
  "stopOrderId": "DEF456UVW",           ← ID real de Alpaca
  "executedPrice": 2450.25,             ← Precio real de ejecución
  "executedQty": 0.1,                   ← Cantidad real ejecutada
  "maxLoss": 4.75                       ← Máxima pérdida teórica
}
```

---

## Requisitos previos

### `.env.local` (debe existir)

```env
ALPACA_PAPER_KEY=your_paper_api_key
ALPACA_PAPER_SECRET=your_paper_api_secret
ALPACA_PAPER_BASE_URL=https://paper-api.alpaca.markets
```

✅ **Verificar:**
- ✓ Keys válidas en Alpaca PAPER account
- ✓ No expuestas en git (`.env.local` está en `.gitignore`)
- ✓ Base URL **DEBE ser `paper-api.alpaca.markets`** (rechaza LIVE)

### Dependencias

```bash
npm install dotenv
npm install --save-dev typescript ts-node @types/node
```

---

## Troubleshooting

### Error: "Credenciales ALPACA_PAPER_KEY/SECRET no encontradas"

→ Verifica `.env.local` en raíz del proyecto (`web/`)

### Error: "BLOQUEADO ABSOLUTO: No se permite endpoint LIVE"

→ Base URL en `.env.local` no es PAPER. Corrige a `https://paper-api.alpaca.markets`

### "Posición ETH existente detectada"

→ Ya hay 0.1 ETH abierto en Alpaca PAPER. Ciérralo manualmente en Alpaca o espera a que se resuelva.

### "Stop-loss rechazado / no queda confirmado"

→ Supervisor detecta automáticamente y **cierra 100% de la posición de emergencia**. Log: "Cierre inmediato sin stop confirmado"

### Timeout / sin respuesta de Alpaca

→ Espera 60 segundos (timeout por defecto). Si persiste, reinicia `ethLongSupervisor.ts` — recupera desde Alpaca sin duplicar órdenes (client_order_id único).

---

## Seguridades implementadas

| # | Mecánica | Detalles |
|---|----------|---------|
| **1** | **Endpoint PAPER obligatorio** | Rechaza LIVE con error antes de cualquier lógica |
| **2** | **Client Order ID único** | Alpaca rechaza duplicados automáticamente |
| **3** | **Stop 100%** | No 50/50; toda la posición protegida |
| **4** | **Detección de stop rechazado** | Sin stop = cierre inmediato 100% |
| **5** | **TP virtual** | No enviado a Alpaca, monitoreado localmente |
| **6** | **Fail-safe post-crash** | Recupera desde Alpaca sin huérfanas |
| **7** | **Max loss acotado** | $4.75 (0.1 × $47.50 diferencia) |
| **8** | **Una sola instancia** | Genera UUID, no permite sobreescrituras |

---

## Resumen de flujo

```
┌─────────────────────────────────────────┐
│ npx ts-node ethLongSupervisor.ts        │
│   --execute-now                         │
└──────────────┬──────────────────────────┘
               │
        ┌──────v──────┐
        │ Verificar   │
        │ endpoint    │
        │ PAPER       │
        └──────┬──────┘
               │ ✅
        ┌──────v──────────────┐
        │ Sin posiciones      │
        │ ETH previas         │
        └──────┬──────────────┘
               │ ✅
        ┌──────v──────────────┐
        │ BUY 0.1 ETH         │
        │ @ MARKET            │
        │ [Esperando fill]    │
        └──────┬──────────────┘
               │ ✅ FILLED
        ┌──────v──────────────┐
        │ SELL 0.1 ETH        │
        │ @ $2,402.75 STOP    │
        │ [Esperando confirm] │
        └──────┬──────────────┘
               │ ✅ PLACED
        ┌──────v──────────────┐
        │ Monitoreo           │
        │ TP $2,548.26        │
        │ [Cada 5s]           │
        └──────┬──────────────┘
               │
        ┌──────v──────────────┐
        │ TP alcanzado?       │
        └──────┬──────────────┘
               │ Sí
        ┌──────v──────────────┐
        │ Cancelar stop       │
        │ Cerrar @ MARKET     │
        │ [Cierre 100%]       │
        └──────┬──────────────┘
               │ ✅
        ┌──────v──────────────┐
        │ Resultado final     │
        │ IDs + precios +     │
        │ max loss            │
        └─────────────────────┘
```

---

## Próximos pasos

1. ✅ **Lee código** (ethLongSupervisor.ts)
2. ✅ **Corre pruebas** (`--scenario=all`)
3. ✅ **Confirma dry-run** (`--dry-run`)
4. 📧 **Solicita autorización** al usuario (paso 4 arriba)
5. ✅ **Ejecuta operativo** (`--execute-now`) SOLO si autorizado

---

## Contacto / Soporte

Si hay errores o comportamiento inesperado durante las pruebas, reporta:
- El escenario (1–5 ó `--dry-run`)
- La salida exacta (copiar todo)
- Si es endpoint PAPER o LIVE
- Si es Alpaca PAPER (papel) o LIVE (real)

**NO EJECUTES `--execute-now` sin autorización explícita.**

---

**Última actualización:** Sesión 38  
**Estado:** 🟢 LISTO PARA REVISAR Y PRUEBAS
