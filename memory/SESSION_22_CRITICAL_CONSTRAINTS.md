---
name: session_22_critical_constraints
description: Restricciones de seguridad críticas para Sesión 22
metadata:
  type: feedback
  session: 22
  priority: CRITICAL
  status: ACTIVE
---

# RESTRICCIONES CRÍTICAS — SESIÓN 22

**Establecidas:** 2026-08-29  
**Vigencia:** Toda Sesión 22 y posteriores

## 🚨 NO NEGOCIABLE

### 1. EXCLUSIVAMENTE ALPACA PAPER TRADING
```
✅ paper-api.alpaca.markets (PAPER)
❌ api.alpaca.markets (LIVE - BLOQUEADO)

No hay excepciones. No hay cuentas live.
```

### 2. NO ACTIVAR AUTONOMÍA
```
❌ ENABLE_EXIT_MANAGER=true (solo en background monitoring)
❌ Ejecución automática de órdenes
❌ Cambios sin aprobación manual

✅ Manual control: ON
✅ Requiere confirmación explícita para cada acción
```

### 3. NO ABRIR OPERACIONES NUEVAS DURANTE S22
```
Restricción temporal mientras se implementa Market Regime Analysis:

❌ Nuevas órdenes BTC
❌ Nuevas órdenes de otros cryptos
❌ Cambios en posición existente
❌ Modificar órdenes de protección

✅ Permitido: Monitoreo pasivo
✅ Permitido: Análisis en dry-run
✅ Permitido: Logging y observación

Levantarse cuando:
→ Implementación completada
→ Dry-run validado
→ Resultados mostrados
→ Aprobación explícita dada
```

### 4. POSICIÓN BTC/USD EXISTENTE — INTACTA
```
Posición Actual:
  • Símbolo: BTCUSD
  • Cantidad: 0.01286 BTC
  • Entrada: ~$77,662
  • Valor: ~$998

Administración:
  ✅ Exit Manager: CONTINÚA ACTIVO
  ✅ Stop Loss: $75,332.14 (monitoreado)
  ✅ Take Profit: $81,545.10 (en Alpaca)

NO PERMITIDO DURANTE S22:
  ❌ Modificar niveles de SL/TP
  ❌ Cerrar la posición
  ❌ Cambiar el Exit Manager
  ❌ Alterar órdenes de protección

→ La posición se cierra SOLO si:
   • SL se dispara (precio ≤ $75,332.14)
   • TP se ejecuta (precio ≥ $81,545.10)
   • Exit Manager cierra por regla interna
```

## 📋 AUTORIDADES DE APROBACIÓN

```
Aprobación requerida para:
✅ Dry-run de Market Regime Analysis
✅ Implementación en dashboard
✅ Habilitar nueva operación crypto
✅ Cualquier cambio a posición BTC existente

Quien puede autorizar:
→ Usuario (tú)

Quien NO puede autorizar:
→ Claude (yo)
→ Tito Core
→ Exit Manager (solo monitorea)
```

## ⚠️ VIOLACIONES

Si ocurre cualquiera de estas durante S22:
```
❌ Operación en cuenta LIVE → PARAR INMEDIATAMENTE
❌ Autonomía activada sin aprobación → APAGAR
❌ Nueva operación abierta sin autorización → CERRAR
❌ Posición BTC modificada → REVERTIR

→ Investigar causa
→ Reportar al usuario
→ Esperar nueva aprobación
```

## ✅ CHECKSUM

Antes de comenzar S22, verificar:
- [ ] Exit Manager corriendo (posición BTC monitoreada)
- [ ] ENABLE_EXIT_MANAGER=true DESACTIVADO (solo background)
- [ ] NO hay nuevas órdenes abiertas
- [ ] Dry-run está listo (no ejecuta operaciones)
- [ ] Todas las restricciones entendidas y aceptadas

---

**Estado:** 🟢 CONFIRMADO Y VIGENTE
**Próximo evento:** Sesión 22 implementation (awaiting approval)
