# S70 SEATBELT — 5 Aclaraciones Críticas para Jay

**Revisión de seguridad ANTES de autorización**

Víctor identificó 5 puntos que deben ser cristal claro ANTES de que Jay autorice. Estos son requirements no-negociables de SEATBELT.

---

## 1️⃣ APERTURA vs CIERRE — Regla de Oro

### **Problema:**
SEATBELT no debe bloquear **cierres de emergencia** cuando está en el medio de una posición peligrosa.

### **Especificación (SIN CÓDIGO):**

```
SEATBELT BLOQUEA (si algún gate falla):
  ✅ Nuevas APERTURAS (entrada a posición)
  ✅ AUMENTOS de exposición (agregar contratos)
  ✅ Cambios de dirección

SEATBELT NUNCA BLOQUEA (incluso si falla):
  ❌ NO puede bloquear CIERRES (venta para salir)
  ❌ NO puede bloquear STOP-LOSS (protección)
  ❌ NO puede bloquear TAKE-PROFIT (ganancia)
  ❌ NO puede bloquear LIQUIDACIÓN DE EMERGENCIA
  ❌ NO puede bloquear REDUCCIÓN DE RIESGO
```

### **Clasificación de Órdenes:**

Cada orden que llega a SEATBELT se clasifica ANTES de validar gates:

```
Orden: BUY 10 ETHUSD @ 2510
  ├─ Type: APERTURA (no hay posición actual)
  ├─ Direction: LONG
  └─ SEATBELT: VALIDA 5 GATES (bloquea si falla)

Orden: SELL 5 ETHUSD (posición actual: +10)
  ├─ Type: CIERRE PARCIAL (reduce de +10 a +5)
  ├─ Direction: SALIDA
  └─ SEATBELT: SOLO valida Gate 5 (broker disponible)
              NUNCA bloquea por Gates 1-4

Orden: SELL 10 ETHUSD SL @ 2400 (posición: +10)
  ├─ Type: STOP-LOSS (protección)
  ├─ Flag: EMERGENCY_CLOSE
  └─ SEATBELT: BYPASS COMPLETO (no valida gates)
              Va directamente a broker
```

### **Implementación Conceptual:**

```
if (order.intent === "CLOSE_POSITION") {
  // NUNCA bloquear cierres
  return { allGatesPass: true, bypassReason: "CLOSE_ORDER" };
}

if (order.intent === "REDUCE_RISK") {
  // NUNCA bloquear reducción de riesgo
  return { allGatesPass: true, bypassReason: "RISK_REDUCTION" };
}

if (order.flag === "EMERGENCY_LIQUIDATION") {
  // NUNCA bloquear liquidación de emergencia
  return { allGatesPass: true, bypassReason: "EMERGENCY" };
}

// Solo APERTURA y AUMENTO deben pasar 5 gates
if (order.intent === "OPEN_POSITION" || order.intent === "ADD_TO_POSITION") {
  return validateAll5Gates(order);
}
```

### **Garantía:**

SEATBELT **protege** de malas decisiones de entrada, pero **NUNCA** impide que Tito se salve a sí mismo.

---

## 2️⃣ BYPASS-PROOF — La Última Frontera

### **Problema:**
Alguien (o un bug) podría saltarse SEATBELT llamando broker directamente, sin pasar por ExecutionEngine.

### **Especificación (SIN CÓDIGO):**

**Arquitectura actual (Tito):**
```
OperationManager.decide()
  → ExecutionEngine.execute(order)
    → broker.placeOrder()
```

**Riesgo:** Si OperationManager llama `broker.placeOrder()` directamente, SEATBELT nunca lo ve.

---

### **Solución: Doble Validación**

#### **Punto 1: OperationManager (NO es punto de control)**
```
OperationManager.decide()
  → DecisionAuditTrail.save(decisión)
  → TradeExecution.create({status: PENDING, decisionId: ...})
  → ExecutionEngine.execute(tradeId)
  
  // SI alguien intenta:
  //   broker.placeOrder() directamente ← INCORRECTO
  // Resultado: TradeExecution.status sigue en PENDING
  //           PreExecutionEvidence nunca se crea
  //           Orden ejecutada, pero NO auditada
```

**Problema:** Orden se ejecuta sin auditoría.

---

#### **Punto 2: ExecutionEngine (1ER punto de control)**
```
ExecutionEngine.execute(tradeId)
  1. Buscar TradeExecution con ese tradeId
  2. Verificar status === PENDING
  3. Llamar Seatbelt.validate(order)
  4. Si OK: crear PreExecutionEvidence
  5. Llamar broker.placeOrder()
  6. Actualizar TradeExecution.status = CONFIRMED
```

**Pero:** Si código futuro añade bypass, ¿cómo lo detectamos?

---

#### **Punto 3: Broker Adapter (2DO punto de control — LA ÚLTIMA FRONTERA)**
```
BrokerAdapter.placeOrder(order)
  
  ANTES de llamar broker.placeOrder():
    1. Verificar que order.tradeId existe
    2. Verificar que TradeExecution con ese tradeId existe
    3. Verificar que PreExecutionEvidence existe para ese tradeId
    4. Verificar que PreExecutionEvidence.allGatesPass === true
    5. Verificar que PreExecutionEvidence no está expirada (<5 min)
    
    IF algo falla:
      throw new SeatbeltValidationError("Missing evidence", {
        tradeId, reason: "..." 
      })
      
    // Solo entonces:
    return broker.placeOrder(order)
```

**Garantía:** Incluso si ExecutionEngine se salta SEATBELT, el BrokerAdapter lo detecta y ABORTA.

---

### **Especificación de Validación en BrokerAdapter:**

```
REGLA: Antes de ejecutar CUALQUIER orden (market, limit, stop):

✓ PreExecutionEvidence debe existir en BD para este tradeId
✓ PreExecutionEvidence.allGatesPass === true
✓ PreExecutionEvidence no expirada (timestamp > now - 5min)
✓ PreExecutionEvidence.orderIntentId === order.intentId (match)

SI falla cualquiera:
  ❌ ABORT orden
  ❌ Log: "SEATBELT violation detected at BrokerAdapter"
  ❌ Alert: "Possible bypass attempt or evidence lost"
  ❌ Guardar audit log con fecha/hora/usuario/razón
```

### **Detección de Bypass:**

```
Escenario: Código malicioso llama broker.placeOrder() sin SEATBELT

Orden llega a BrokerAdapter:
  ├─ BrokerAdapter.placeOrder(order)
  ├─ Buscar PreExecutionEvidence para tradeId
  ├─ NO ENCONTRADA ← CATCH!
  ├─ Log: "Bypass detected: evidence missing"
  ├─ Alert usuario: "Unauthorized trade attempt blocked"
  └─ ABORT (no ejecuta)
```

**Garantía:** No hay forma de saltarse SEATBELT si PreExecutionEvidence es validado en la última frontera (BrokerAdapter).

---

## 3️⃣ FAIL-CLOSED — Comportamiento en Errores

### **Problema:**
¿Qué pasa si SEATBELT se bloquea? Debe fallar CERRANDO (bloqueando), nunca abriendo.

### **Especificación de Fail-Closed:**

**Escenario A: Timeout en Gate 1**
```
Gate1MarketHealth.validate() tarda > 5 segundos
  ├─ Timeout se activa
  ├─ Retorna: { healthy: false, reason: "TIMEOUT" }
  ├─ SEATBELT.allGatesPass = false
  └─ Orden BLOQUEADA (correcto: no sabemos si mercado está bien)
```

**Escenario B: Datos Faltantes**
```
Gate3DecisionAudit: DecisionAuditTrail no existe en BD
  ├─ Retorna: { valid: false, reason: "DECISION_NOT_FOUND" }
  ├─ SEATBELT.allGatesPass = false
  └─ Orden BLOQUEADA (correcto: no podemos auditar)
```

**Escenario C: PreExecutionEvidence No Se Guarda**
```
Seatbelt pasó todos los 5 gates ✓
  → BrokerAdapter.save(PreExecutionEvidence)
  → BD error: "Connection lost"
  → Salvaguarda: throw error (no ejecuta orden)
  ├─ Orden NO se ejecuta
  ├─ Log: "Evidence save failed, aborting order"
  ├─ TradeExecution.status permanece PENDING
  └─ Supervisor alerta usuario
```

**Escenario D: Reinicio del Sistema Medio Validación**
```
SEATBELT validando Gate 4, ExecutionEngine se reinicia
  ├─ PreExecutionEvidence INCOMPLETA en BD
  ├─ La orden tiene status VALIDATING
  ├─ Supervisor detecta: status = VALIDATING después de reinicio
  ├─ Retoma: Revalidar desde inicio (no reutiliza aprobación)
  └─ Si falla algún gate: BLOQUEADA
```

**Escenario E: Concurrencia**
```
Dos órdenes con mismo tradeId llegando al mismo tiempo
  ├─ BD: UNIQUE constraint en tradeId
  ├─ Una pasa, otra falla con: "Duplicate tradeId"
  ├─ Segunda orden: BLOQUEADA
  └─ Supervisor alerta: "Duplicate trade attempt"
```

**Escenario F: Error de BD**
```
PostgreSQL connection error durante Gate 2
  ├─ Gate2RiskBoundary: error { code: "23505" }
  ├─ Retorna: { valid: false, reason: "DB_ERROR" }
  ├─ SEATBELT.allGatesPass = false
  └─ Orden BLOQUEADA
```

### **Tabla de Fail-Closed:**

| Error | Acción |
|-------|--------|
| Timeout | ❌ BLOQUEA |
| Datos faltantes | ❌ BLOQUEA |
| Evidence no guardada | ❌ BLOQUEA |
| Reinicio medio validación | ❌ REVALIDA (no reutiliza) |
| Duplicado concurrente | ❌ BLOQUEA |
| BD error | ❌ BLOQUEA |
| Network error | ❌ RETRY, luego BLOQUEA |

**Garantía:** NUNCA falla abierto. Siempre falla bloqueando.

---

## 4️⃣ ANTI-REPLAY — Una Aprobación, Una Orden

### **Problema:**
Alguien crea un PreExecutionEvidence válido, luego lo reutiliza para 10 órdenes diferentes.

### **Especificación (SIN CÓDIGO):**

#### **Mecanismo 1: TradeId Único**
```
Cada orden tiene un tradeId único e inmutable:
  TradeId: "ETHUSD_20260912_0001"
  
PreExecutionEvidence se vincula a UN tradeId:
  PreExecutionEvidence.tradeId = "ETHUSD_20260912_0001"
  
Si alguien intenta reutilizar:
  Orden 2: TradeId "ETHUSD_20260912_0001" (mismo)
  ├─ BrokerAdapter busca PreExecutionEvidence
  ├─ Encuentra la del trade 1
  ├─ Verifica: PreExecutionEvidence.consumed === true (usada ya)
  ├─ BLOQUEA: "Evidence already consumed for this trade"
  └─ Resultado: NO DUPLICA
```

#### **Mecanismo 2: OrderIntentId (Criptográfico)**
```
Cuando se crea la orden:
  order.orderIntentId = hash(
    tradeId + symbol + side + quantity + price + timestamp
  )
  
PreExecutionEvidence guarda:
  PreExecutionEvidence.orderIntentId = order.orderIntentId
  
Si alguien intenta cambiar la orden:
  Orden modificada: {symbol, quantity} cambiado
  ├─ Nuevo hash ≠ hash anterior
  ├─ BrokerAdapter: "orderIntentId mismatch"
  ├─ BLOQUEA: "Order parameters don't match evidence"
  └─ Resultado: NO PERMITE MODIFICACIÓN
```

#### **Mecanismo 3: Expiración**
```
PreExecutionEvidence.validUntil = now + 5 minutes

Si pasan > 5 min entre SEATBELT pass y ejecución:
  ├─ BrokerAdapter.validate()
  ├─ Verificar: now < PreExecutionEvidence.validUntil
  ├─ Si expirada: BLOQUEA
  └─ Resultado: Evidence vieja rechazada
```

#### **Mecanismo 4: Inmutabilidad**
```
Una vez que PreExecutionEvidence.consumed = true:
  
Cualquier intento de:
  - Reutilizar ese tradeId
  - Modificar la orden
  - Re-validar con misma evidencia

Resultado: ❌ BLOQUEADO
  Razón: "Evidence already consumed"
```

### **Tabla Anti-Replay:**

| Ataque | Protección | Resultado |
|--------|-----------|-----------|
| Reutilizar mismo tradeId | Consumed flag | ❌ BLOQUEADO |
| Cambiar cantidad | orderIntentId hash | ❌ BLOQUEADO |
| Cambiar precio | orderIntentId hash | ❌ BLOQUEADO |
| Esperar 6 min para ejecutar | Expiración 5 min | ❌ BLOQUEADO |
| Falsificar evidence | Criptografía (BD integrity) | ❌ BLOQUEADO |

**Garantía:** Una PreExecutionEvidence = UNA orden, punto y basta.

---

## 5️⃣ SIN GARANTÍAS, SOLO OBJETIVOS

### **Problema:**
No afirmar "cumplimiento SEC garantizado" ni "fallos < 1 por mes" sin evidencia.

### **Especificación Corregida:**

#### **Antes (INCORRECTO):**
```
SEATBELT garantiza:
  ✅ Cumplimiento SEC
  ✅ Reducción de fallos a < 1 por mes
  ✅ Cero órdenes malas ejecutadas
```

**Problema:** Son promesas, no realidades. La SEC requiere más que logs. Los fallos dependen de Alpaca API uptime.

---

#### **Después (CORRECTO):**

```
SEATBELT facilita (OBJETIVOS, no garantías):
  
1. AUDITORÍA COMPLETA
   Objetivo: Documentar CÓMO y POR QUÉ se ejecutó cada trade
   Entrega: PreExecutionEvidence con foto de 5 gates
   Verificable: SELECT * FROM pre_execution_evidence WHERE tradeId = '...'
   Limitación: Requiere que PreExecutionEvidence se guarde correctamente
   
2. REDUCCIÓN DE FALLOS (esperado)
   Objetivo: Reducir órdenes rechazadas por broker
   Esperado: De 3-5/semana → <1/mes (basado en validaciones)
   Verificable: Contar TradeExecution.status = FAILED por mes
   Limitación: Depende de Alpaca uptime, no bajo nuestro control
   
3. PROTECCIÓN DE ENTRADA
   Objetivo: Bloquear aperturas peligrosas (riesgo, decisión dudosa)
   Entrega: Gates de validación previos a ejecución
   Verificable: Contar órdenes bloqueadas por Gate X
   Limitación: Solo bloquea aperturas, no cierres
   
4. TRAZABILIDAD
   Objetivo: Cada trade tiene cadena de custodía completa
   Entrega: TradeExecution → DecisionAuditTrail → PreExecutionEvidence → ExecutionEvent
   Verificable: JOIN en BD
   Limitación: Requiere consistencia BD
   
5. REVERSIBILIDAD
   Objetivo: Desactivar SEATBELT sin romper Tito
   Entrega: Feature flag SEATBELT_ENABLED
   Verificable: Verificar código ejecuta sin SEATBELT
   Limitación: Requiere testing sin SEATBELT antes de LIVE
```

### **Lo Que NO Garantiza SEATBELT:**

❌ Cumplimiento SEC automático (requiere auditor legal)  
❌ Cero fallos por mes (depende Alpaca)  
❌ Cero órdenes malas (depende OperationManager)  
❌ Protección de cierre (no bloquea stops)  
❌ P&L positivo (es protección, no estrategia)  

### **Lo Que SÍ Entrega SEATBELT:**

✅ Foto de cada decisión ANTES de ejecutar  
✅ 5 capas independientes de validación  
✅ Fail-closed (falla bloqueando, nunca abriendo)  
✅ Anti-replay (una evidencia = una orden)  
✅ Trazabilidad completa por TradeId  

---

## 🚨 CRITERIOS GO/HOLD/NO-GO REVISADOS

### **OPCIÓN A: GO — IMPLEMENTAR SEATBELT**

**REQUISITOS PARA GO:**
- [ ] Doble validación (ExecutionEngine + BrokerAdapter) implementada
- [ ] Fail-closed en todos los 6 escenarios de error
- [ ] Anti-replay con 4 mecanismos (tradeId, hash, expiración, consumed)
- [ ] Cierres/stops/emergencias BYPASAN SEATBELT
- [ ] PreExecutionEvidence guardada ANTES de broker.placeOrder()
- [ ] Orden bloqueada si BrokerAdapter no encuentra evidencia
- [ ] 64 tests que cubren estos 5 puntos

**LIMITACIONES A ACEPTAR:**
- ⚠️ Auditoría ayuda SEC pero no = cumplimiento automático
- ⚠️ Esperamos <1 fallo/mes pero no es garantía
- ⚠️ SEATBELT bloquea aperturas, no cierres

**VEREDICTO:** 🟢 **GO** (si se implementan los 5 puntos sin excepción)

---

### **OPCIÓN B: HOLD**

Esperar si alguno de estos se descubre durante implementación:
- SEATBELT bypasseable
- Fail-open en algún escenario
- BrokerAdapter no valida evidence

---

### **OPCIÓN C: NO-GO**

Rechazar si:
- No se puede garantizar doble validación
- Cierres quedan bloqueados por error
- Fallos de BD no son fail-closed

---

## 📋 ESPECIFICACIÓN FINAL PARA S70

### **Lo que se DEBE implementar:**

1. ✅ 5 Gates (Market, Risk, Audit, Engine, Broker)
2. ✅ Clasificación de órdenes (APERTURA vs CIERRE)
3. ✅ Doble validación (ExecutionEngine + BrokerAdapter)
4. ✅ Fail-closed en 6 escenarios
5. ✅ Anti-replay con 4 mecanismos
6. ✅ PreExecutionEvidence entity + migration
7. ✅ Bypass detection en BrokerAdapter
8. ✅ 64 tests (incluyendo estos 5 puntos)

### **Lo que se NO DEBE afirmar:**

❌ "Garantizamos cumplimiento SEC"  
❌ "Eliminamos fallo a <1 por mes"  
❌ "Cero órdenes malas ejecutadas"  

### **Lo que SI se debe objetivar:**

✅ "Documentamos CÓMO se ejecutó cada trade"  
✅ "Esperamos reducción a <1 fallo/mes basada en validaciones"  
✅ "Bloqueamos aperturas sin pasar 5 gates"  

---

## 🎯 Recomendación Revisada para Jay

```
OPCIÓN A: GO — IMPLEMENTAR SEATBELT

PERO SOLO SI:
  ✅ Se implementan los 5 puntos críticos sin excepción
  ✅ Se aceptan limitaciones (auditoría ≠ garantía, objetivos no garantías)
  ✅ Se acepta que SEATBELT es protección, no solución total
  
BENEFICIO:
  🟢 Tito es más seguro, auditado, trazable
  
RIESGO:
  🟡 Bajo (5 puntos = fail-closed, anti-replay, doble validación)
```

---

**Esta revisión es crítica: el cinturón evita accidentes, pero jamás debe impedir que Tito frene una posición peligrosa.** 🛑🔒

*Esperando autorización explícita de Jay DESPUÉS de revisar estos 5 puntos.*

