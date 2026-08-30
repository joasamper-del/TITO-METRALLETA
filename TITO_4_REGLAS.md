# 🎯 TITO METRALLETA - LAS 4 REGLAS DE ORO

**El corazón del sistema de trading más fuerte.**

---

## 1️⃣ PROTEGER CAPITAL (Nunca violar riesgo máximo)

```
Capital: $50,000
Riesgo máximo por trade: 2% = $1,000

┌─────────────────────────────────────────────────────┐
│ Si SL calculado sería $1,100 de riesgo             │
│ → NO ENTRA                                          │
│ → REDUCE cantidad hasta que SL sea ≤ $1,000         │
└─────────────────────────────────────────────────────┘

This is NON-NEGOTIABLE.
Stop-loss se ejecuta SIEMPRE, sin excepciones.
```

**Por qué:** La diferencia entre un sistema que ayuda y uno que arruina.

---

## 2️⃣ SIEMPRE EXPLICAR (Auditoría clara)

```
Cada decisión = Explicación

"ENTRADA en SPY porque:
 ✅ Tendencia alcista (MA50 558 > MA200 545)
 ✅ RSI en 62 (bullish, no sobrecomprado)
 ✅ SuperTrend: BULLISH
 ✅ Volumen: 89M vs media 75M (+18%)
 ✅ VIX: 18 (favorable)

 PUNTUACIÓN: 84/100 (ENTRADA FUERTE)

 Stop: $543.72 (2% = $1,100)
 Targets: $565.90, $577.48
 Duración: 30-120 min
 Reentradas: Máximo 2"

→ Transparencia total. Sé por qué pasó cada cosa.
```

**Por qué:** Learning + confianza + auditoría.

---

## 3️⃣ AUTONOMÍA DENTRO DE LÍMITES (Libertad controlada)

```
Lo que SÍ puede hacer (sin pedir permiso):
  ✅ Seleccionar estrategia
  ✅ Calcular entrada/salida
  ✅ Ejecutar trailing stops
  ✅ Cerrar por TP, SL, patrón, régimen
  ✅ Ejecutar reentradas validadas
  ✅ Registrar learnings

Lo que NO puede hacer:
  ❌ Violar riesgo máximo
  ❌ Operar sin explicación
  ❌ Bajar score mínimo "para más actividad"
  ❌ Operar con earnings próximo
  ❌ Usar instrumentos no permitidos

= Libertad dentro de guardrails
```

**Por qué:** Tito decide rápido, pero siempre dentro de reglas.

---

## 4️⃣ SELECTIVIDAD (NO operar si no es sólido)

```
El Principio Más Importante:

┌─────────────────────────────────────────────────────┐
│ OBJETIVO: No es operar más.                         │
│           Es proteger capital y aprovechar          │
│           BUENAS oportunidades.                     │
└─────────────────────────────────────────────────────┘

Hoy: 3 señales mediocres (score 60-70)
→ Tito: "Ninguna es realmente sólida. Espero."
→ Resultado: 0 trades. Capital protegido. ✅

Hoy: 1 señal excelente (score 85+, volumen confirmado)
→ Tito: "Esta es sólida. Entro."
→ Resultado: Trade ejecutado. ✅
```

**La Verdad del Trading:**
```
Trader Sin Disciplina:
  100 trades/mes × 45% win rate = PIERDE

Trader Con Disciplina:
  20 trades/mes × 80% win rate = GANA

Diferencia: NO es "más trabajo", es SELECTIVIDAD
```

**Por qué:** Los mejores traders operan 20% del tiempo, pero con máxima precisión.

---

## 🔗 Las 4 Reglas Trabajando Juntas

```
         Proteger Capital (Regla 1)
                    ↓
         Explicar Decisiones (Regla 2)
                    ↓
         Autonomía Controlada (Regla 3)
                    ↓
         Selectividad (Regla 4)
                    ↓
    ┌─────────────────────────────────┐
    │  SISTEMA DE TRADING MUY FUERTE  │
    │                                 │
    │  ✅ Nunca pierde más de lo ok  │
    │  ✅ Opera solo en BUENO setup   │
    │  ✅ Decide rápido, dentro reglas│
    │  ✅ Explica todo, aprende siempre│
    └─────────────────────────────────┘
                    ↓
         GANA DINERO + LO PROTEGE
```

---

## 📊 Traducción a Código

### En BaseStrategy.evaluate()
```typescript
// Validar reglas
if (!rulesAreValid) {
  return BLOCKED;  // ← Regla 4: selectividad
}

// Calcular score
const signalScore = calculateScoreFactors();

// Hacer recomendación (NUNCA bajar mínimo)
if (signalScore >= minScoreRequired && volumeConfirmed) {
  recommendation = ENTER;
  explanation = buildNaturalLanguageExplanation();  // ← Regla 2
} else {
  recommendation = BLOCKED;  // ← Regla 4: no operar si no es sólido
}
```

### En OperationManager.executeAndManage()
```typescript
// Validar riesgo (NUNCA exceder)
if (calculatedRisk > maxRiskAllowed) {
  throw Error("Risk exceeds maximum");  // ← Regla 1
}

// Ejecutar dentro de límites (Regla 3: autonomía)
if (allValidationsPass) {
  await executePosition();  // Sin pedir permiso
  await trackPosition();    // Logging obligatorio (Regla 2)
}
```

---

## ✨ Por Qué Tito Va a Ser MUY Fuerte

Si estas 4 reglas están **bien firmes en el corazón del sistema**:

1. ✅ **No pierde capital que no pueda** (regla 1)
2. ✅ **Sabe exactamente por qué cada decisión** (regla 2)
3. ✅ **Opera rápido, sin hesitación** (regla 3)
4. ✅ **Solo cuando realmente valga la pena** (regla 4)

= **Un sistema de trading que GANA dinero y lo PROTEGE**

---

## 🎯 Verificación: ¿Tito Respeta Las 4 Reglas?

Antes de ejecutar cualquier trade, preguntar:

- [ ] ¿Riesgo ≤ máximo permitido? (Regla 1)
- [ ] ¿Hay explicación clara? (Regla 2)
- [ ] ¿Se ejecuta dentro de guardrails? (Regla 3)
- [ ] ¿Score ≥ mínimo? ¿Volumen confirmado? (Regla 4)

Si falla UNA → No entra.

---

## 📌 Resumen en 1 Línea

**Tito es fuerte porque protege capital, explica decisiones, actúa autónomamente, y solo opera cuando setup es excelente. La selectividad es poder.**

---

**Fecha:** 2026-08-30  
**Sesión:** 40 Completada  
**Estado:** 🟢 Filosofía de operación lista para implementar en Strategy Library
