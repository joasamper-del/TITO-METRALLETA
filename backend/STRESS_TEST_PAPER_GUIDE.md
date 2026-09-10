# Stress Test Validation - Alpaca PAPER Guide

**Objetivo:** Validar que Tito funciona correctamente en Alpaca Paper Trading (modo simulado) antes de autorizar operación continua.

**Status:** 80/80 unit tests PASS ✅ | Listo para validación real en PAPER

---

## Requisitos Previos

### 1. Credenciales Alpaca PAPER

Verificar que tienes credenciales PAPER en `.env.local`:

```bash
cd backend
cat .env.local | grep ALPACA
```

Debe mostrar:
```
ALPACA_API_KEY=PKxxxxxxxxxxxxxxxxxxxxxx
ALPACA_BASE_URL=https://paper-api.alpaca.markets
```

### 2. Cuenta Alpaca en PAPER Mode

Verificar en [app.alpaca.markets](https://app.alpaca.markets):
- ✅ Account Type: **Paper Trading**
- ✅ Portfolio Value: Dinero simulado (típicamente $100,000)
- ✅ Buying Power: Disponible

---

## Ejecución

### Opción A: Prueba Unitaria (Simulada, 80 tests)

Ejecuta todos los tests sin tocar Alpaca:

```bash
cd backend
npm test
```

**Output esperado:**
```
Test Files  7 passed (7)
Tests  80 passed (80)
```

**Genera:** Reportes simulados en `data/stress-test.jsonl`

---

### Opción B: Validación Real en Alpaca PAPER (Recomendado)

Ejecuta contra la API PAPER real y captura métricas verdaderas:

```bash
cd backend
npm run stress-test:paper
```

**Lo que hace:**
1. **Valida conexión** a Alpaca PAPER
   - Verifica credenciales
   - Confirma que es PAPER (no LIVE)
   - Muestra saldo y poder de compra

2. **Ejecuta 3 escenarios:**
   - **Light Load (5 órdenes):** Baseline para verificar que funciona
   - **Normal Load (10 órdenes):** Carga típica
   - **Stress Load (8 órdenes):** Más presión

3. **Captura métricas reales por orden:**
   - ✅ Orden ejecutada (con ID real de Alpaca)
   - ❌ Orden rechazada (con código de error)
   - ⏱️ Latencia actual en ms
   - 🔴 Errores 401, 422, 429 si ocurren

4. **Genera reporte final:**
   ```
   Total Orders: X/23 (Y%)
   Latency: avg Zms, max Wms
   Status: PASS (≥75% éxito) o FAIL
   Mode: PAPER ✅
   ```

5. **Guarda archivo:** `data/stress-test-report-paper.json`

---

## Interpretación de Resultados

### PASS (Listo para Etapa 6)

```json
{
  "summary": {
    "successRate": 95.0,
    "avgLatency": 250,
    "maxLatency": 800,
    "status": "PASS",
    "mode": "PAPER",
    "totalOrders": 23,
    "successfulOrders": 22
  }
}
```

✅ Indica:
- 22/23 órdenes ejecutadas exitosamente
- Latencia promedio 250ms (aceptable)
- Ningún error crítico
- Modo PAPER confirmado

**Siguiente paso:** Autorización para Etapa 6 (Operación Continua)

---

### FAIL (Investigación requerida)

```json
{
  "summary": {
    "successRate": 65.0,
    "status": "FAIL",
    "errors": {
      "error_401": 3,
      "error_429": 5
    }
  }
}
```

⚠️ Indica problemas:
- `error_401`: Credencial inválida o token expirado
- `error_429`: Rate limit (Alpaca rechaza por muchas órdenes)
- `error_422`: Payload inválido (revisar OrderValidator)

**Acciones:**
1. Verificar credenciales
2. Esperar antes de reintentar si es 429
3. Revisar logs en `data/execution-errors.jsonl`
4. Volver a ejecutar

---

## Seguridades Implementadas

### ✅ PAPER-Only Garantizado

```typescript
if (account.account_type !== 'paper') {
  throw new Error('❌ Account is not in PAPER mode!');
}
```

El script se detiene si no está en PAPER.

### ✅ Sin modificaciones de credenciales

- Solo **LECTURA** de `ALPACA_API_KEY`
- Jamás se modifica `.env.local`
- Jamás se intercambian credenciales PAPER ↔ LIVE

### ✅ Kill Switch Disponible

Si algo va mal, puedes parar inmediatamente:
```bash
# Ctrl+C (interrupts the test)
```

El reporte se guarda con lo que se ejecutó hasta ese punto.

---

## Flujo de Trabajo Recomendado

### 1️⃣ Verificar Credenciales

```bash
cd backend
grep ALPACA .env.local
```

### 2️⃣ Ejecutar Tests Simulados

```bash
npm test
# Esperado: 80/80 PASS
```

### 3️⃣ Ejecutar Validación Real en PAPER

```bash
npm run stress-test:paper
# Esperado: 3 escenarios con métricas reales
```

### 4️⃣ Revisar Reporte

```bash
cat data/stress-test-report-paper.json | jq '.summary'
```

### 5️⃣ Si PASS: Solicitar Autorización

Mostrar al usuario:
- Reporte JSON
- Captura de pantalla de salida
- Evidencia de PAPER mode

### 6️⃣ Con Autorización: Etapa 6

Una vez aprobado → `TitoOperativeService` en operación continua

---

## Logs y Debugging

### Logs de órdenes

```bash
tail -f data/operation.jsonl
```

Cada ciclo operativo se registra con timestamp, orden, resultado.

### Logs de errores de ejecución

```bash
cat data/execution-errors.jsonl
```

Cada error HTTP (429, 401, 422, etc.) se registra con detalles.

### Logs de heartbeat

```bash
cat data/heartbeat.jsonl
```

Cada latido del sistema (beats, errores críticos, shutdown).

---

## Troubleshooting

### "ALPACA_API_KEY not found"

**Solución:**
```bash
# Crear .env.local en backend/ si no existe
echo "ALPACA_API_KEY=PKxxxxxxxxxxxxxx" > .env.local
echo "ALPACA_BASE_URL=https://paper-api.alpaca.markets" >> .env.local
```

### "Connection failed: 401 Unauthorized"

**Solución:**
- Verificar que la API key es válida
- Generar nueva key en [app.alpaca.markets/paper](https://app.alpaca.markets/paper)
- Copiar a `.env.local`

### "Account is not in PAPER mode!"

**Solución:**
- Verificar en [app.alpaca.markets](https://app.alpaca.markets) que estás en Paper Trading
- Cambiar si accidentalmente seleccionaste Live Trading

### "Order rejected with 422"

**Solución:**
- Verificar que el símbolo existe (SPY, QQQ, AAPL, MSFT son válidos)
- Verificar cantidad (qty) es positiva
- Revisar en `data/validation-errors.jsonl` para más detalles

---

## Ejemplos de Ejecución

### Ejecución Exitosa

```
📡 Validating Alpaca PAPER connection...
✅ Connection successful
   Account: ABC123456
   Portfolio Value: $100,000.00
   Buying Power: $100,000.00
   Mode: PAPER ✅

🧪 Scenario: Light Load (5 orders)
   ✅ Order 1/5: SPY buy (125ms)
   ✅ Order 2/5: QQQ sell (98ms)
   ✅ Order 3/5: AAPL buy (156ms)
   ✅ Order 4/5: MSFT sell (112ms)
   ✅ Order 5/5: SPY buy (134ms)
   📊 Results: 5/5 successful
   ⏱️  Latency: avg 125ms, max 156ms

📊 VALIDATION REPORT
Total Orders: 23/23 (100%)
Latency: avg 127ms, max 256ms
Status: 🟢 PASS
Mode: PAPER ✅

📄 Report saved: data/stress-test-report-paper.json
✅ Validation complete. Ready for authorization.
```

### Ejecución con Fallos

```
🧪 Scenario: Normal Load (10 orders)
   ✅ Order 1/10: SPY buy (145ms)
   ✅ Order 2/10: QQQ sell (132ms)
   ❌ Order 3/10: 429 Too Many Requests (89ms)
   ✅ Order 4/10: AAPL buy (156ms)
   ...
   📊 Results: 8/10 successful
   🔴 Failures: 2
   Errors: {"error_429": 2}

📊 VALIDATION REPORT
Total Orders: 20/23 (87%)
Status: 🟢 PASS (≥75%)
Mode: PAPER ✅
```

---

## Próximo Paso

Ejecuta:
```bash
cd backend
npm run stress-test:paper
```

Captura el output y el reporte. Con eso → **Autorización para Etapa 6 (Operación Continua)**.

---

**IMPORTANTE:** Todo ocurre en PAPER. Sin dinero real. Sin credenciales modificadas. Solo validación.

Tito suda en el gimnasio simulado antes de entrenar de verdad. 💪
