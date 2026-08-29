---
name: session_22_instructions
description: Sesión 22 — Mejora CRYPTO con Market Regime Analysis
metadata:
  type: project
  session: 22
  phase: C — CRYPTO Enhancement
  status: READY_FOR_IMPLEMENTATION
---

# SESIÓN 22 — INSTRUCCIONES EXACTAS

**Última actualización:** 2026-08-29

## 🎯 OBJETIVO

Implementar análisis de Régimen de Mercado para CRYPTO sin modificar Tito Core congelado.

## 📋 REGLAS CRÍTICAS

1. ✅ NO TOCAR Tito Core v0.3.0 (FROZEN)
2. ✅ NO MODIFICAR lógica EQUITY (SPY/QQQ/VIX)
3. ✅ NO ALTERAR pestañas originales del dashboard
4. ✅ Módulo CRYPTO debe ser **completamente aislado**
5. ✅ Exit Manager continúa igual

## 🔧 PLAN DE IMPLEMENTACIÓN

### Paso 1: Archivos a crear/modificar
**ANTES de escribir código, dime:**
- [ ] Qué archivos pienso crear
- [ ] Qué archivos pienso modificar
- [ ] Confirma que Tito Core permanecerá intacto

**Candidatos:**
- `cryptoMarketRegime.ts` ✅ (ya existe)
- `cryptoDashboard.ts` (NEW)
- `web/app/components/CryptoAnalysis.tsx` (NEW)
- `web/app/api/crypto/regime/route.ts` (NEW)
- **NO TOCAR:** `backend/@tito-core/` (FROZEN)

### Paso 2: Dry-run + Validación
```
1. Implementar cambios en archivos aislados
2. Ejecutar dry-run con datos históricos BTC
3. Mostrar resultados (regime classification, confidence, reasons)
4. Verificar NO hay cambios en Tito Core
5. Obtener aprobación antes de habilitar
```

### Paso 3: Logging para Feedback
```
Agregar logging en:
- Fecha/hora de clasificación
- Régimen detectado (BULLISH/BEARISH/SIDEWAYS)
- Confidence %
- Razones
- Resultado real del mercado (post-hoc)
- Precisión de clasificación
```

Archivo: `phase_d_logs/crypto_regime_log_*.jsonl`

### Paso 4: Mejora de Tito
```
Revisar logs para:
- ¿Fueron correctas las clasificaciones de régimen?
- ¿Mejoraron los resultados con reglas adaptativas?
- Usar datos para refinar umbrales de Tito

SIN MODIFICAR:
- Tito Core logic (congelada)
- Pesos de decisión
- Thresholds originales
```

## 🎬 FLUJO PARA S22

```
SESIÓN 22 WORKFLOW:

1. Briefing (esta sesión)
   ✅ Plan confirmado
   ✅ Reglas de seguridad claras
   ✅ Archivos identificados

2. Implementación
   → Crear módulos aislados
   → Dry-run con datos reales
   → Mostrar resultados

3. Validación
   → Sin cambios en Tito Core ✅
   → Logging completo ✅
   → Aprobación antes de operación real ✅

4. Operación
   → Habilitar análisis de régimen
   → Aplicar reglas adaptativas
   → Monitorear clasificaciones
```

## 📊 DASHBOARD CRYPTO (S22)

Mostrar antes de cada operación:
```
Market Regime: BULLISH / BEARISH / SIDEWAYS
Direction: LONG / WAIT / NO TRADE
Confidence: XX%
Reasons:
  • Razón 1
  • Razón 2
  • Razón 3
Invalidation: [nivel crítico]
Entry: $XXXXX
Stop Loss: $XXXXX
Take Profit: $XXXXX
Risk-Adjusted Size: $XXXX
```

## ✅ CONFIRMACIÓN ANTES DE S22

**NUNCA comenzar S22 sin:**
1. [ ] Listar archivos a crear/modificar
2. [ ] Confirmar Tito Core permanecerá intacto
3. [ ] Verificar dry-run está configurado
4. [ ] Aprobar plan de logging

---

## 📝 NOTAS

- Exit Manager (S21) sigue corriendo en background
- Posición BTC abierta: 0.01286 BTC @ $77,648
- Protección activa (TP en Alpaca + SL en exitManager)
- Todo listo para S22 cuando autorice

---

**Estado:** 🟢 LISTO PARA SESIÓN 22
**Espera:** Confirmación de plan antes de implementar
