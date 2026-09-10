# 🚦 ETAPAS DE IMPLEMENTACIÓN: 5 Correcciones Independientes y Reversibles

**Estrategia:** Dividir en 5 etapas aisladas. Cada una:
- ✅ No afecta las otras
- ✅ Totalmente reversible (rollback simple)
- ✅ Tests PASS/FAIL exactos
- ✅ Checkpoint obligatorio antes de siguiente

**Carpeta S64/duplicada:** Intacta, lectura-solo, protegida 🛡️

---

## ETAPA 1: ExecutionEngine (Reintento Inteligente)

### 🎯 Propósito
Implementar lógica de reintento inteligente para manejar errores transitorios (429/401) sin detener el sistema.

### 📁 Archivos
**NUEVOS:**
- `backend/src/core/executionEngine.ts` (270 líneas)
- `backend/src/core/executionEngine.spec.ts` (180 líneas)

**MODIFICADOS:** Ninguno

### 🔧 Propósito Técnico

```typescript
// ANTES (S64):
try {
  const order = await alpacaClient.post('/v2/orders', orderData);
  return order;
} catch (err) {
  return null;  // ← Falla inmediatamente sin reintentos
}

// DESPUÉS (Etapa 1):
for (let attempt = 0; attempt < maxRetries; attempt++) {
  try {
    const order = await alpacaClient.post('/v2/orders', orderData);
    return order;
  } catch (err) {
    if (err.status === 429) {
      // Rate limit: esperar y reintentar
      await sleep(2^attempt * 1000);
      continue;
    } else if (err.status === 401) {
      // Auth: no reintentar, alertar
      return fail('auth_required');
    } else if (err.status === 422) {
      // Validation: no reintentar, es bug lógica
      return fail('validation_error');
    }
  }
}
```

### 📦 Dependencias
- ❌ Ninguna (aislada)
- Requisito: `axios` (ya existe en package.json)
- Requisito: `@nestjs/common` Logger (ya existe)

### ✅ Tests Unitarios (PASS/FAIL exacto)

**Test Suite 1: Rate Limit Handling**
```
TEST 1.1: 429 en primer intento → retry → éxito en segundo
  Input: POST falla 429, luego retorna éxito
  Expected: success=true, orderId='order-123', retriesUsed=1
  PASS if: mockAlpacaClient.post llamado 2 veces
  FAIL if: success=false OR retriesUsed > 2

TEST 1.2: 429 persistente × 5 intentos → agotados
  Input: Todos los 5 intentos fallan 429
  Expected: success=false, errorType='rate_limit', retriesUsed=5
  PASS if: mockAlpacaClient.post llamado 5 veces
  FAIL if: retriesUsed < 5 OR error !== 'rate_limit'

TEST 1.3: Backoff exponencial (1s → 2s → 4s → 8s → 16s)
  Input: 429 × 5 intentos
  Expected: delays ≈ [1000, 2000, 4000, 8000, 16000] ms
  PASS if: tiempos en ±10% del esperado
  FAIL if: delay lineal O sin delay
```

**Test Suite 2: Auth Failure Handling**
```
TEST 2.1: 401 en primer intento → NO reintentar
  Input: POST falla 401
  Expected: success=false, errorType='auth', retriesUsed=0
  PASS if: mockAlpacaClient.post llamado 1 sola vez
  FAIL if: retriesUsed > 0 OR POST llamado > 1 vez

TEST 2.2: 401 genera log y alerta
  Input: POST falla 401
  Expected: error guardado en data/execution-errors.jsonl
  PASS if: archivo existe Y contiene errorType='auth'
  FAIL if: archivo no existe O error no persistido
```

**Test Suite 3: Validation Error Handling**
```
TEST 3.1: 422 en primer intento → NO reintentar
  Input: POST falla 422 "oco orders must be limit orders"
  Expected: success=false, errorType='validation', retriesUsed=0
  PASS if: mockAlpacaClient.post llamado 1 sola vez
  FAIL if: retriesUsed > 0

TEST 3.2: 422 log detallado (request + error)
  Input: POST falla 422
  Expected: data/validation-errors.jsonl contiene request Y error
  PASS if: archivo existe Y ambos campos presentes
  FAIL if: archivo no existe O campo faltante
```

**Test Suite 4: Deduplication**
```
TEST 4.1: clientOrderId único → se ejecuta
  Input: clientOrderId='unique-123'
  Expected: success=true, orderId retornado
  PASS if: order se crea
  FAIL if: success=false

TEST 4.2: clientOrderId repetido → rechazado
  Input: Mismo clientOrderId='unique-123' dos veces
  Expected: Primera=success, Segunda=success=false
  PASS if: mockAlpacaClient.post llamado 1 sola vez (no 2)
  FAIL if: POST llamado 2 veces (duplicado)

TEST 4.3: Deduplicación persistida a disco
  Input: Ejecutar con clientOrderId, reiniciar proceso
  Expected: Siguiente proceso lee data/executed-orders.json
  PASS if: archivo existe Y contiene clientOrderId
  FAIL if: archivo no existe
```

**Test Suite 5: Other Errors**
```
TEST 5.1: 500 Server Error → NO reintentar
  Input: POST falla 500
  Expected: success=false, errorType='unknown', retriesUsed=0
  PASS if: mockAlpacaClient.post llamado 1 sola vez
  FAIL if: retriesUsed > 0
```

### 🎯 E2E Validation (si se integra en NestJS)

Cuando se integre en backend:
```bash
# Simular 429 con mock:
curl -X POST /api/orders \
  -H "X-Test-Simulate: 429" \
  -d '{"symbol":"SPY","qty":1}'

# Esperado: retry automático, orden completada o error log
```

### ✔️ Criterio PASS/FAIL

**PASS Etapa 1 si:**
- [ ] Archivo `executionEngine.ts` creado y compila
- [ ] Archivo `executionEngine.spec.ts` creado
- [ ] `npm test -- executionEngine.spec.ts` retorna **5 test suites, todas PASS**
- [ ] `data/executed-orders.json` se crea tras primera ejecución
- [ ] `data/execution-errors.jsonl` se crea tras error 401/429/422
- [ ] No hay cambios en otros archivos Phase 6

**FAIL Etapa 1 si:**
- [ ] Cualquier test falla
- [ ] El archivo no compila (TypeScript error)
- [ ] Logs no se persisten
- [ ] Deduplicación no funciona

### 🔙 Rollback
```bash
# Si falla, revertir:
rm backend/src/core/executionEngine.ts
rm backend/src/core/executionEngine.spec.ts
rm -f data/executed-orders.json data/execution-errors.jsonl

# Verificar git status:
git status  # Debe mostrar solo estas 3 líneas como deleted
git checkout -- .  # Si hay cambios accidentales
```

---

## ETAPA 2: OrderValidator (Prevención de 422)

### 🎯 Propósito
Validar payload de órdenes ANTES de enviar a Alpaca. Detecta:
- OCO con market orders (rechazado 422)
- SL/TP invertidos para BUY/SELL
- Campos obligatorios faltantes

### 📁 Archivos
**NUEVOS:**
- `backend/src/core/orderValidator.ts` (150 líneas)
- `backend/src/core/orderValidator.spec.ts` (140 líneas)

**MODIFICADOS:** Ninguno

### 🔧 Propósito Técnico

```typescript
// Antes: Alpaca rechaza 422
POST /v2/orders {
  symbol: 'SPY',
  qty: 1,
  side: 'buy',
  type: 'market',  // ← BUG: OCO requiere limit
  stop_loss: {...}
}
// Response: 422 "oco orders must be limit orders"

// Después: Validar localmente
const validator = new OrderValidator();
const result = validator.validate({
  type: 'market',
  stop_loss: {...}
});
// result.valid = false
// result.errors = ["OCO orders must use type=limit"]
// → No enviar a Alpaca, retornar error local
```

### 📦 Dependencias
- ✅ DEPENDS ON Etapa 1 (ExecutionEngine)
  - Razón: OrderValidator se llama desde ExecutionEngine.executeOrder()
  - Pero: Pueden coexistir (validator es standalone)
  - SI NO ETAPA 1: OrderValidator se prueba en aislamiento

### ✅ Tests Unitarios (PASS/FAIL exacto)

**Test Suite 1: OCO Validation**
```
TEST 1.1: OCO con market order → invalid
  Input: {type: 'market', stop_loss: {...}, take_profit: {...}}
  Expected: valid=false, errors contiene "OCO orders must use type=limit"
  PASS if: errors.length > 0 Y "type=limit" en errors
  FAIL if: valid=true OR errors vacío

TEST 1.2: OCO con limit order → válido (si SL/TP correctos)
  Input: {type: 'limit', limit_price: 105, stop_loss: {stop_price: 100}, ...}
  Expected: valid=true (suponiendo SL/TP correctos)
  PASS if: valid=true Y errors.length=0
  FAIL if: valid=false

TEST 1.3: SL/TP invertidos para BUY → invalid
  Input: {side: 'buy', limit_price: 105, stop_loss: {stop_price: 110}, take_profit: {limit_price: 100}}
  Expected: valid=false, errors contiene "stop_loss must be < limit_price"
  PASS if: multiple errors Y relación invertida detectada
  FAIL if: valid=true
```

**Test Suite 2: BUY Order Validation**
```
TEST 2.1: BUY con SL < entry < TP → válido
  Input: {side: 'buy', limit_price: 105, stop_loss: 100, take_profit: 110}
  Expected: valid=true
  PASS if: valid=true Y errors.length=0
  FAIL if: valid=false

TEST 2.2: BUY con SL >= entry → invalid
  Input: {side: 'buy', limit_price: 105, stop_loss: 110}
  Expected: valid=false, errors contiene "stop_loss must be < limit_price"
  PASS if: error detectado
  FAIL if: valid=true

TEST 2.3: BUY con TP <= entry → invalid
  Input: {side: 'buy', limit_price: 105, take_profit: 100}
  Expected: valid=false
  PASS if: error detectado
  FAIL if: valid=true
```

**Test Suite 3: SELL Order Validation**
```
TEST 3.1: SELL con TP < entry < SL → válido
  Input: {side: 'sell', limit_price: 105, take_profit: 100, stop_loss: 110}
  Expected: valid=true
  PASS if: valid=true
  FAIL if: valid=false

TEST 3.2: SELL con invertidos → invalid
  Input: {side: 'sell', limit_price: 105, take_profit: 110}
  Expected: valid=false, errors
  PASS if: error detectado
  FAIL if: valid=true
```

**Test Suite 4: Required Fields**
```
TEST 4.1: symbol vacío → invalid
  Input: {symbol: '', qty: 1, side: 'buy'}
  Expected: valid=false, errors contiene "symbol is required"
  PASS if: error detectado
  FAIL if: valid=true

TEST 4.2: qty <= 0 → invalid
  Input: {symbol: 'SPY', qty: 0, side: 'buy'}
  Expected: valid=false
  PASS if: error detectado
  FAIL if: valid=true
```

### ✔️ Criterio PASS/FAIL

**PASS Etapa 2 si:**
- [ ] Archivo `orderValidator.ts` compila
- [ ] `npm test -- orderValidator.spec.ts` retorna **4 test suites, todas PASS**
- [ ] Warnings se detectan (sin fallar validación)
- [ ] No hay cambios en Etapa 1 archivos

**FAIL Etapa 2 si:**
- [ ] Cualquier test falla
- [ ] Tipo error no detecta

### 🔙 Rollback
```bash
rm backend/src/core/orderValidator.ts
rm backend/src/core/orderValidator.spec.ts
git checkout -- .
```

---

## ETAPA 3: HeartbeatService (Detección de Silencio)

### 🎯 Propósito
Implementar "latido" del sistema. Si desaparece silenciosamente, se detecta.

### 📁 Archivos
**NUEVOS:**
- `backend/src/core/heartbeatService.ts` (120 líneas)
- `backend/src/core/heartbeatService.spec.ts` (90 líneas)

**MODIFICADOS:** Ninguno

### 🔧 Propósito Técnico

```typescript
// Etapa 3: Logging de vitalidad
heartbeat.beat('cycle_start');
  // → Append: {timestamp, event: 'beat', context: 'cycle_start'} a data/heartbeat.jsonl

try {
  // ... ejecutar orden ...
} catch (err) {
  heartbeat.criticalError(err.message);
  // → Append: {timestamp, event: 'critical_error', error: msg} a data/heartbeat.jsonl
  // → LUEGO: Slack alert (TODO)
}

// Si proceso muere, data/heartbeat.jsonl tiene último beat conocido
```

### 📦 Dependencias
- ❌ Ninguna
- Aislado: Solo depende de `fs` (Node.js nativo)

### ✅ Tests Unitarios (PASS/FAIL exacto)

**Test Suite 1: Beat Recording**
```
TEST 1.1: beat() escribe a heartbeat.jsonl
  Action: heartbeat.beat('test_context')
  Expected: data/heartbeat.jsonl contiene línea JSON con context='test_context'
  PASS if: Archivo existe Y línea tiene timestamp + event + context
  FAIL if: Archivo no existe O línea malformada

TEST 1.2: Múltiples beats se acumulan
  Action: beat('a'), beat('b'), beat('c')
  Expected: heartbeat.jsonl tiene 3 líneas
  PASS if: wc -l data/heartbeat.jsonl = 3 (mínimo)
  FAIL if: Solo 1 línea O sobreescrito
```

**Test Suite 2: Error Recording**
```
TEST 2.1: criticalError() registra error
  Action: heartbeat.criticalError('Test error message')
  Expected: data/heartbeat.jsonl contiene event='critical_error' Y error='Test error message'
  PASS if: Línea contiene ambos campos
  FAIL if: Falta event O error
```

**Test Suite 3: Alive Detection**
```
TEST 3.1: isAlive() retorna true si reciente
  Action: beat('test'), immediato → isAlive()
  Expected: true
  PASS if: isAlive() === true
  FAIL if: false

TEST 3.2: isAlive() retorna false si timeout (1 min)
  Action: beat('test'), avanzar 61 segundos, → isAlive()
  Expected: false
  PASS if: isAlive() === false
  FAIL if: true

TEST 3.3: Timeout configurable
  Action: MaxAllowedMs = 5000ms, beat(), avanzar 6s, isAlive()
  Expected: false
  PASS if: timeout respeta config
  FAIL if: timeout ignorado
```

**Test Suite 4: Shutdown Recording**
```
TEST 4.1: shutdown() registra razón
  Action: heartbeat.shutdown('SIGTERM received')
  Expected: data/heartbeat.jsonl contiene event='shutdown' Y reason='SIGTERM received'
  PASS if: Ambos campos presentes
  FAIL if: Falta alguno
```

### ✔️ Criterio PASS/FAIL

**PASS Etapa 3 si:**
- [ ] Archivo `heartbeatService.ts` compila
- [ ] `npm test -- heartbeatService.spec.ts` retorna **4 test suites, todas PASS**
- [ ] `data/heartbeat.jsonl` se crea tras primer beat()
- [ ] isAlive() detecta timeout correctamente (5+ test cases)
- [ ] No hay cambios en Etapas 1-2

**FAIL Etapa 3 si:**
- [ ] Cualquier test falla
- [ ] Archivo no se crea
- [ ] Timeout no funciona

### 🔙 Rollback
```bash
rm backend/src/core/heartbeatService.ts
rm backend/src/core/heartbeatService.spec.ts
rm -f data/heartbeat.jsonl
```

---

## ETAPA 4: Integración (ExecutionEngine + OrderValidator + HeartbeatService)

### 🎯 Propósito
Conectar los 3 servicios anteriores. ExecutionEngine AHORA:
1. Valida orden con OrderValidator
2. Si válida, ejecuta con reintento (ExecutionEngine)
3. Registra cada paso con HeartbeatService

### 📁 Archivos
**NUEVOS:** Ninguno

**MODIFICADOS:**
- `backend/src/core/executionEngine.ts` (agregar validación + heartbeat)
  - Δ ~40 líneas (integración)

### 🔧 Cambio Específico

En `ExecutionEngine.executeOrder()`:

```typescript
async executeOrder(request: OrderRequest): Promise<ExecutionResult> {
  this.heartbeat.beat('executeOrder_start');

  try {
    // NUEVO: Validar ANTES de enviar
    const validation = new OrderValidator().validate(request);
    if (!validation.valid) {
      this.logger.error(`Validation failed: ${validation.errors[0]}`);
      this.heartbeat.beat('executeOrder_validation_fail');
      return {
        success: false,
        error: validation.errors[0],
        errorCode: 422,
        errorType: 'validation',
        timestamp: new Date().toISOString(),
      };
    }

    // EXISTENTE: Reintento
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        this.heartbeat.beat(`executeOrder_attempt_${attempt}`);
        const response = await this.alpacaClient.post('/v2/orders', request);
        this.executedOrders.add(request.clientOrderId);
        this.saveExecutedOrders();
        this.heartbeat.beat('executeOrder_success');
        return { success: true, orderId: response.data.id, ... };
      } catch (err) {
        // EXISTENTE: Discriminar errores
        if (err.status === 429) {
          this.heartbeat.beat(`executeOrder_429_retry`);
          await sleep(2^attempt * 1000);
        } else if (err.status === 401) {
          this.heartbeat.criticalError('Auth failed: ' + err.message);
          return { success: false, errorType: 'auth', ... };
        } // etc...
      }
    }
  } catch (err) {
    this.heartbeat.criticalError('Unexpected error: ' + err.message);
  }
}
```

### 📦 Dependencias
- ✅ DEPENDS ON Etapa 1 (ExecutionEngine)
- ✅ DEPENDS ON Etapa 2 (OrderValidator)
- ✅ DEPENDS ON Etapa 3 (HeartbeatService)

**NO avanzar si alguno de los 3 anteriores falla**

### ✅ Tests (E2E Simulado)

**Test Suite 1: Flujo Happy Path**
```
TEST 1.1: Orden válida + sin errores = éxito
  Input: orderValidator=valid, alpaca=success
  Expected: ExecutionEngine retorna success=true
  PASS if: heartbeat contiene beat('executeOrder_success')
  FAIL if: success=false O heartbeat no registrado
```

**Test Suite 2: Validación falla**
```
TEST 2.1: OrderValidator rechaza = no enviar a Alpaca
  Input: orderValidator=invalid(422), alpaca=never called
  Expected: ExecutionEngine retorna success=false, errorType='validation'
  PASS if: alpacaClient.post nunca fue llamado
  FAIL if: POST fue llamado (envió a Alpaca)
```

**Test Suite 3: 429 + Validación**
```
TEST 3.1: Orden válida + 429 = reintentar
  Input: validator=valid, alpaca={429, 429, success}
  Expected: success=true, retriesUsed=2
  PASS if: alpaca.post llamado 3 veces, heartbeat contiene retry beats
  FAIL if: success=false
```

### ✔️ Criterio PASS/FAIL

**PASS Etapa 4 si:**
- [ ] `npm test -- executionEngine.spec.ts` aún **PASS** (no regresión)
- [ ] Modificación a executionEngine.ts compila
- [ ] Nueva lógica se ejecuta: heartbeat.beat('executeOrder_start') registrada
- [ ] OrderValidator integrada: Si invalid → no envía POST
- [ ] Etapas 1-3 siguen funcionando en aislamiento

**FAIL Etapa 4 si:**
- [ ] Test anterior falla (regresión)
- [ ] OrderValidator no se llama
- [ ] POST se envía con payload inválido

### 🔙 Rollback
```bash
# Revertir cambios a executionEngine.ts
git diff backend/src/core/executionEngine.ts  # Ver cambios
git checkout -- backend/src/core/executionEngine.ts  # Restaurar
```

---

## ETAPA 5: TitoOperativeService (Loop 24/7 en Phase 6)

### 🎯 Propósito
Crear el loop operativo 24/7 en NestJS Backend (reemplazando S64 standalone script).

### 📁 Archivos
**NUEVOS:**
- `backend/src/tito/operative.service.ts` (200 líneas)
- `backend/src/tito/operative.module.ts` (40 líneas)
- `backend/src/tito/operative.service.spec.ts` (100 líneas)

**MODIFICADOS:**
- `backend/src/app.module.ts` (agregar TitoOperativeModule)
  - Δ ~3 líneas

### 🔧 Propósito Técnico

```typescript
// S64 (standalone):
const tito = new TitoOperativeLoop();
tito.run().catch(err => process.exit(1));

// ETAPA 5 (NestJS):
@Injectable()
export class TitoOperativeService {
  constructor(
    private executionEngine: ExecutionEngine,  // Etapa 1
    private heartbeat: HeartbeatService,       // Etapa 3
  ) {}

  async start() {
    setInterval(() => this.cycle(), 5000);
  }

  private async cycle() {
    this.heartbeat.beat('operative_cycle');
    // ... generar signals ...
    // ... ejecutar con executionEngine ...
    // ... heartbeat.beat('operative_end') ...
  }
}
```

### 📦 Dependencias
- ✅ DEPENDS ON Etapa 1 (ExecutionEngine)
- ✅ DEPENDS ON Etapa 3 (HeartbeatService)
- ❌ NO DEPENDS ON Etapa 2 (OrderValidator es llamada por ExecutionEngine)
- ✅ DEPENDS ON Etapa 4 (Integración de 1+2+3)

**NO avanzar si Etapas 1, 3, 4 fallan**

### ✅ Tests (Unit + Integration)

**Test Suite 1: Service Initialization**
```
TEST 1.1: TitoOperativeService inicializa
  Action: new TitoOperativeService(mockExecutionEngine, mockHeartbeat)
  Expected: service instancia creada
  PASS if: service !== null
  FAIL if: error en constructor

TEST 1.2: start() inicia loop
  Action: service.start()
  Expected: setInterval configurado, heartbeat.beat('operative_start') llamada
  PASS if: heartbeat.beat fue llamada
  FAIL if: beat no registrada
```

**Test Suite 2: Cycle Execution**
```
TEST 2.1: cycle() genera signals (mocked)
  Action: cycle() ejecutada manualmente
  Expected: heartbeat.beat registra ciclo
  PASS if: heartbeat contiene beat('operative_cycle')
  FAIL if: beat no registrada

TEST 2.2: cycle() ejecuta órdenes
  Action: cycle() con señal mock
  Expected: executionEngine.executeOrder() fue llamada
  PASS if: executeOrder invocada
  FAIL if: nunca se llamó
```

**Test Suite 3: Error Handling**
```
TEST 3.1: Error en cycle() no detiene loop
  Action: cycle() lanza exception
  Expected: heartbeat.criticalError registrada, loop continúa
  PASS if: heartbeat registra error Y loop sigue activo
  FAIL if: proceso muere

TEST 3.2: SIGTERM se maneja gracefully
  Action: enviar SIGTERM a proceso
  Expected: heartbeat.shutdown('SIGTERM received') registrada
  PASS if: heartbeat contiene shutdown
  FAIL if: proceso muere sin log
```

### ✔️ Criterio PASS/FAIL

**PASS Etapa 5 si:**
- [ ] Archivos compilan (no TypeScript error)
- [ ] `npm test -- operative.service.spec.ts` retorna **3 test suites, todas PASS**
- [ ] `npm run build` exitoso (backend compila)
- [ ] TitoOperativeModule se integra en app.module sin error
- [ ] No hay cambios en Etapas 1-4

**FAIL Etapa 5 si:**
- [ ] Cualquier test falla
- [ ] Build error
- [ ] app.module no compila tras agregar TitoOperativeModule

### 🔙 Rollback
```bash
rm -r backend/src/tito/
git diff backend/src/app.module.ts  # Ver cambios
git checkout -- backend/src/app.module.ts  # Restaurar
```

---

## 🎯 ORDEN RECOMENDADO DE IMPLEMENTACIÓN

### Paso 1: Validar Orden
```
Etapa 1 → Etapa 3 → Etapa 4 → Etapa 2 → Etapa 5
   ↓
Reintento  Heartbeat  Integración  Validator  Service
(core)     (vitalidad) (3 juntos)   (prevención) (loop)
```

### Paso 2: Checkpoint Antes de Cada Avance
```
✅ ANTES Etapa 2: ¿Etapa 1 PASS? → SÍ: continúa | NO: arregla
✅ ANTES Etapa 3: ¿Etapa 1 PASS? → SÍ: continúa | NO: arregla
✅ ANTES Etapa 4: ¿Etapas 1+2+3 PASS? → SÍ: continúa | NO: arregla
✅ ANTES Etapa 5: ¿Etapas 1+3+4 PASS? → SÍ: continúa | NO: arregla
```

### Paso 3: Tiempo Estimado
- Etapa 1 (ExecutionEngine): ~1.5h (código + tests + validación)
- Etapa 3 (HeartbeatService): ~1h (simple, aislada)
- Etapa 4 (Integración): ~0.5h (pocas líneas)
- Etapa 2 (OrderValidator): ~1h (tests exhaustivos)
- Etapa 5 (TitoOperativeService): ~1.5h (integración NestJS)

**Total: ~5.5 horas si todos PASS**

---

## ✅ CHECKLIST FINAL ANTES DE AUTORIZAR

- [ ] Leí todas las 5 etapas
- [ ] Entiendo por qué son independientes
- [ ] Confirmo: ¿Proceder con Etapa 1 primero?
- [ ] ¿Preguntas sobre alguna etapa?
- [ ] ¿Modificaciones al orden recomendado?

**S64/duplicada:** Completamente intacta y lectura-solo 🛡️

---

**Esperando tu autorización para comenzar Etapa 1.**

