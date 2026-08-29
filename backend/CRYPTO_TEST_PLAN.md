# FASE D — CRYPTO TESTING PLAN (Waiting for Alpaca Rate Limit Recovery)

**Status:** 🟡 READY (awaiting Alpaca API availability)  
**Date:** 2026-08-29  
**Endpoint:** https://paper-api.alpaca.markets (PAPER ONLY)  

---

## ✅ VERIFICACIÓN DE SEGURIDAD

```
✅ Endpoint: PAPER (https://paper-api.alpaca.markets)
✅ Credenciales: En .env.local (protegidas)
✅ Lógica: Tito Core v0.3.0 (congelada)
✅ Tamaño: miniFraccional (pequeño)
✅ Control: Usuario aprobación requerida
✅ Rate limit: 429 es comportamiento normal (esperar 1-2 min)
```

---

## 🔄 PARES CRYPTO A PROBAR

Cuando Alpaca esté disponible, probaremos:

| Par | Status | Tamaño Test |
|-----|--------|------------|
| BTC/USD | ⏳ Pendiente verificación | 0.001-0.01 BTC |
| ETH/USD | ⏳ Pendiente verificación | 0.01-0.1 ETH |
| XRP/USD | ⏳ Pendiente verificación | 10-100 XRP |
| LTC/USD | ⏳ Pendiente verificación | 0.1-1 LTC |
| SOL/USD | ⏳ Pendiente verificación | 0.1-1 SOL |
| ADA/USD | ⏳ Pendiente verificación | 10-100 ADA |

**Nota:** Paper Trading podría no soportar todos los pares.  
Si no hay disponibilidad → usar SPY/QQQ en su lugar.

---

## 📋 ORDEN DE EJECUCIÓN (Una vez Alpaca disponible)

```
1. ✅ Verificar endpoint PAPER
2. ✅ Obtener estado de cuenta
3. ⏳ Consultar pares crypto disponibles
4. ⏳ Proponer par + tamaño al usuario
5. ⏳ PAUSA → Esperar aprobación
6. ⏳ Ejecutar 1 orden pequeña
7. ⏳ Registrar: entrada, fill, slippage
8. ⏳ Monitorear con Tito Core
9. ⏳ Capturar: salida, P&L, accuracy
10. ⏳ PAUSA OBLIGATORIA
11. ⏳ Mostrar resultado, esperar usuario
```

---

## 🛡️ RESTRICCIONES

- ❌ NO órdenes grandes
- ❌ NO en cuenta REAL
- ❌ NO cambios a Tito Core
- ❌ NO sin pausa entre operaciones
- ✅ SÍ registro completo
- ✅ SÍ usuario autoriza cada paso

---

## ⏱️ PRÓXIMOS PASOS

### Opción 1: Reintentar ahora
```bash
cd backend
npx ts-node phaseD_CryptoPreparation.ts
```

### Opción 2: Esperar 2-3 minutos
Alpaca rate limit recupera automáticamente después de 60-120 segundos.

### Opción 3: Usar SPY en su lugar
Si Alpaca sigue en rate limit, podemos iniciar SPY stocks en su lugar:
```bash
PHASE_D_APPROVED=true npx ts-node phaseD_ControlledExecution.ts
```

---

## 📊 INFORMACIÓN DE DEBUGGING

**Error recibido:** HTTP 429 (Too Many Requests)  
**Causa:** Alpaca permite max 200 requests/minuto por credencial  
**Solución:** Esperar 1-2 minutos y reintentar  
**Verificación:** El script está intentando conectar a PAPER (correcto)

---

## ✅ PREPARACIÓN COMPLETA

El sistema está listo. Solo falta que Alpaca baje el rate limit.

Cuando esté disponible:
- Script ejecutará verificación de pares crypto
- Mostrará cuáles están disponibles
- Propondrá par + tamaño
- Esperará tu aprobación final
- Ejecutará 1 orden de prueba pequeña
- Capturará resultado completo

---

**Estado:** 🟡 **LISTO (Esperando Alpaca)**  
**Acción:** Reintentar en 2-3 minutos  
**Seguridad:** 100% intacta  
**Lógica:** Congelada
