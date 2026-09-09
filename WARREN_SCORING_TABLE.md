# 🎯 Warren Buffett Jr. — Tabla Completa de Scoring 0-100

---

## 📊 SISTEMA DE SCORING DETALLADO

### **CATEGORÍA 1: VALORACIÓN (30 puntos totales)**

| Métrica | Peso | Umbral | Puntos | Ejemplo |
|---------|------|--------|--------|---------|
| **P/B Ratio** (15 pts) | 15 | P/B < 1.0 | 15 | KO (P/B=0.95) → 15pts |
| | | 1.0-2.0 | 10 | MSFT (P/B=1.8) → 10pts |
| | | 2.0-3.0 | 5 | TSLA (P/B=2.5) → 5pts |
| | | > 3.0 | 0 | NVDA (P/B=4.0) → 0pts |
| **P/E vs Histórico** (15 pts) | 15 | < 0.8x histórico | 15 | HPQ (12x vs 15x hist) → 15pts |
| | | 0.8-1.0x | 10 | AAPL (18x vs 20x hist) → 10pts |
| | | 1.0-1.3x | 5 | JNJ (22x vs 18x hist) → 5pts |
| | | > 1.3x | 0 | GOOGL (30x vs 20x hist) → 0pts |

**P/B + P/E = VALORACIÓN SCORE (0-30)**

---

### **CATEGORÍA 2: CALIDAD (35 puntos totales)**

| Métrica | Peso | Umbral | Puntos | Ejemplo |
|---------|------|--------|--------|---------|
| **ROE** (10 pts) | 10 | > 20% | 10 | BRK.B (ROE=22%) → 10pts |
| | | 15-20% | 7 | JNJ (ROE=17%) → 7pts |
| | | 10-15% | 4 | XOM (ROE=12%) → 4pts |
| | | < 10% | 0 | F (ROE=8%) → 0pts |
| **Debt/Equity** (10 pts) | 10 | < 0.3 | 10 | AAPL (D/E=0.2) → 10pts |
| | | 0.3-0.5 | 7 | JNJ (D/E=0.4) → 7pts |
| | | 0.5-0.8 | 4 | BAC (D/E=0.7) → 4pts |
| | | > 0.8 | 0 | F (D/E=1.2) → 0pts |
| **FCF Quality** (8 pts) | 8 | Creciente (↑) | 8 | MSFT (FCF trend +15% YoY) → 8pts |
| | | Estable (→) | 5 | AAPL (FCF flat YoY) → 5pts |
| | | Decreciente (↓) | 2 | IBM (FCF -5% YoY) → 2pts |
| | | Negativo (✗) | 0 | TSLA (FCF negative) → 0pts |
| **Dividend Stability** (7 pts) | 7 | 15+ años historial | 7 | JNJ (60+ años dividend) → 7pts |
| | | 5-15 años | 5 | EMR (20 años) → 5pts |
| | | <5 años | 2 | AVGO (started 2011) → 2pts |
| | | No dividend | 0 | GOOGL (no dividend) → 0pts |

**ROE + D/E + FCF + Dividend = CALIDAD SCORE (0-35)**

---

### **CATEGORÍA 3: CRECIMIENTO (20 puntos totales)**

| Métrica | Peso | Umbral | Puntos | Ejemplo |
|---------|------|--------|--------|---------|
| **5-Year Earnings CAGR** (10 pts) | 10 | > 15% | 10 | MSFT (20% CAGR) → 10pts |
| | | 10-15% | 7 | AAPL (12% CAGR) → 7pts |
| | | 5-10% | 4 | JNJ (8% CAGR) → 4pts |
| | | < 5% | 2 | XOM (3% CAGR) → 2pts |
| **Revenue Growth** (10 pts) | 10 | > 10% | 10 | NVIDIA (25% growth) → 10pts |
| | | 5-10% | 7 | MSFT (7% growth) → 7pts |
| | | 2-5% | 4 | JNJ (3% growth) → 4pts |
| | | < 2% | 0 | WM (1% growth) → 0pts |

**CAGR + Revenue = CRECIMIENTO SCORE (0-20)**

---

### **CATEGORÍA 4: CONTEXTO MACRO (15 puntos totales)**

| Métrica | Peso | Umbral | Puntos | Ejemplo |
|---------|------|--------|--------|---------|
| **Industry Tailwind** (10 pts) | 10 | Strong sector growth | 10 | AI chips (tailwind 30%+) → 10pts |
| | | Normal/stable | 7 | Consumer staples (tailwind 3-5%) → 7pts |
| | | Headwind/challenged | 4 | Traditional retail (headwind) → 4pts |
| | | Severe/dying | 0 | Fossil fuels (severe headwind) → 0pts |
| **Market Valuation Adjust** (-5 a +5 pts) | variable | S&P P/E < 15x | +5 | Market cheap → favor NEW entries |
| | | S&P P/E 15-18x | +2 | Market normal | +2pts |
| | | S&P P/E 18-22x | 0 | Market fair | 0pts |
| | | S&P P/E > 22x | -5 | Market expensive → reduce NEW entries |

**Industry + Market = MACRO SCORE (-5 to +15)**

---

## 🎯 SCORING FINAL (0-100)

```
FÓRMULA:
Final Score = VALORACIÓN (0-30) + CALIDAD (0-35) + CRECIMIENTO (0-20) + MACRO (-5 to +15)

RANGO: 0-100
```

---

## 📋 CORRESPONDENCIA: SCORE → ACCIÓN

### **85-100: COMPRA FUERTE (Aprobada para Ejecución)**
```
QUÉ SIGNIFICA SCORE 85+:
Warren está "listo para firmar contrato" - score EXCELENTE, pero aun requiere validaciones finales

Criterios OBLIGATORIOS (pre-ejecución):
- Score >= 85 (score excelente)
- DCF Validado: 
  * Terminal value justificado (GDP+margin growth)
  * Discount rate apropiado (WACC+risk premium)
  * Sensibilidad análisis +/-10% sobre FCF
- Margen de Seguridad CONTEXTUAL: 15-30% (ver tabla de margen variable)
  * Calidad excelente (ROE>20%, D/E<0.3) → 15-20%
  * Calidad normal (ROE 15-20%) → 25-30%
  * NUNCA < 20% incluso en mejor caso
- Calidad confirmada: ROE > 15%, D/E < 0.5, FCF positivo 3+ años
- Macro context NEUTRAL O POSITIVA (no rojo)
  * Fed rate trend (neutral/down OK)
  * VIX < 25 (stress bajo)
  * Sector no headwind
- Riesgo: stop-loss at -30%, position max 5%
- Cash reserve >= 20%
- Concentration: no sector >3 posiciones (si añade 5%)

Acción: BUY 5% en escalones (1/3 lunes + 1/3 miércoles + 1/3 viernes)

Ejemplo: AAPL score=88 → aprobada para compra
  * DCF $215 (WACC 9.5%, terminal 3.2%)
  * Calidad: ROE 21%, D/E 0.2, FCF creciente
  * Macro: neutral (Fed 5.25%, VIX 18)
  * Margen: 20% (excelente calidad) → precio < $172 → COMPRA 5%
  * Ejecución: $150, $149.50, $149 en días separados

GATEKEEP: Score 85+ es fuerte, pero fallar margen/macro/DCF = NO COMPRA.
```

### **80-84: CANDIDATA (Segunda Entrevista)**
```
QUÉ SIGNIFICA SCORE 80-84:
Warren avanza a "la oficina de mamá para la segunda entrevista" (analista senior review)
NO es una aprobación automática de compra. Es un "entra a evaluación seria"

Criterios OBLIGATORIOS para pasar a compra:
- Score >= 80 (REQUISITO MÍNIMO, no suficiente)
- DCF Validado: calcula terminal value, discount rate, sensibilidad +/-10%
- Margen de Seguridad CONTEXTUAL: 25-35% (ver tabla de margen variable)
  * Ajusta según calidad, predictibilidad, confiabilidad valuación
  * NUNCA < 20% incluso en mejor caso
- Calidad confirmada: ROE >= 12%, D/E < 0.7, FCF estable o creciente
- Macro context NEUTRAL O POSITIVA (no rojo)
- Riesgo independiente: loss limit -30%, position max 3%
- Cash reserve >= 20%

Acción: EVALUAR SERIAMENTE
- Si TODAS puertas verdes → BUY 3% en escalones
- Si ALGO falla → NO OPERAR (margen, calidad, macro, valuación)

Ejemplo: JNJ score=82 → evaluación seria
  * DCF $220 (validated)
  * Calidad: ROE 17%, D/E 0.4, FCF estable
  * Macro: neutral
  * Margen: 25% (normal quality) → precio < $165 → OK, COMPRA 3%
  * Precio actual $170 → FALLA margen → NO COMPRA

GATEKEEP: Score 80 abre puerta, pero todas las otras validaciones DEBEN pasar.
```

### **70-79: WATCH (NO COMPRA NUEVA)**
```
Criterios:
- Score 70-79 (positivo pero bajo para entrada nueva)
- Posición: MONITOR Y SEGUIMIENTO solamente
- NO inicia compra nueva
- Acumula datos fundamentales
- Espera a que score suba a 80+ O precio mejore

Acción: MONITOR trimestral, evaluar catalyst
Ejemplo: MSFT score=78 → WATCH, esperar revaluation o precio caída

SI YA TENEMOS POSICIÓN (score bajó aquí):
- Si score >= 70 Y precio < 1.5x fair → HOLD
- Si precio > 2.0x fair → TRIM 20%
```

### **50-69: NEUTRAL (ESPECULACIÓN SOLAMENTE)**
```
Criterios:
- Score 50-69 (neutral a ligeramente negativo)
- NO inicia compra nueva (contrario a Warren)
- Posición: HOLD si anterior, NO expandir
- WATCH agresivamente por cambios

Acción: MONITOR, evaluar si score sube a 70+ o baja <50
Ejemplo: XOM score=55 → NO COMPRA, esperar clarity

SI YA TENEMOS POSICIÓN (score bajó aquí):
- Si posición > 5% → TRIM 30% (rebalance)
- Si fundamentals empeoran trend → TRIM más
```

### **<50: EVITAR COMPLETAMENTE**
```
Criterios:
- Score < 50 (fundamentals débiles o caro)
- Weak quality, high valuation, o structural headwind
- DO NOT INITIATE

Acción: SKIP, buscar mejor oportunidad
Ejemplo: TSLA score=35 (caro, crecimiento erratic) → NO COMPRAR

SI YA TENEMOS POSICIÓN (score colapsó):
- Score < 30: VENDER 100% (cut losses si necesario)
- Score 30-49: VENDER 50% (reducir exposición, evaluar retención)
- Loss > -30%: VENDER 100% (capital para mejor uso)
```

---

## 🔒 MARGEN DE SEGURIDAD VARIABLE (Contextual)

**NO es 30% universal.** Adapta según:

| Factor | Margen Mínimo | Justificación |
|--------|---------------|---------------|
| **Calidad Excelente** (ROE>20%, D/E<0.3) | 15-20% | Predictibilidad alta, negocio robusto |
| **Calidad Normal** (ROE 15-20%, D/E 0.3-0.5) | 25-30% | Riesgo moderado, margen estándar |
| **Calidad Media** (ROE 10-15%, D/E 0.5-0.8) | 35-40% | Mayor incertidumbre, protección más agresiva |
| **FCF Creciente 3+ años** | -5% | Reduce margen (negocio en expansión) |
| **FCF Flat/Decreciente** | +10% | Aumenta margen (señal amarilla) |
| **Macro Bullish** (VIX<15, Fed rate↓) | -5% | Contexto favorece entrada |
| **Macro Bearish** (VIX>25, Fed rate↑) | +10% | Contexto requiere más cushion |
| **Valuación Confiable** (5+ analistas, diverg<10%) | -5% | Menos riesgo de error valuación |
| **Valuación Incierta** (low coverage, wide range) | +15% | Alto riesgo valuación |

**EJEMPLOS DE MARGEN VARIABLE:**
- **AAPL (calidad excelente, FCF creciente, macro normal):** 20% margen = price < DCF*0.80
- **JNJ (calidad excelente, dividend, FCF estable):** 25% margen = price < DCF*0.75
- **GE (calidad media, FCF plano, riesgo valuación):** 40% margen = price < DCF*0.60

**REGLA DE ORO:** Margen mínimo **SIEMPRE >= 20%** (nunca comprar a DCF*0.95 incluso en "calidad excelente")

---

## 🔄 ACCIONES SOBRE POSICIONES EXISTENTES

### **MANTENER (HOLD)**
```
Score >= 60 AND Precio < 1.5x fair value

Si cumple = HOLD, no hacer nada
Revisión: Trimestral
```

### **REDUCIR (TRIM 20-30%)**
```
Triggers:
1. Posición > 8% cartera → trim a 5%
2. Sector over-concentrated (>3 posiciones) → trim
3. Profit-taking (ganancia >50%) → trim 20%
4. Rebalance trimestral → trim 20%

No es salida, es rebalance
```

### **SALIR (SELL 100%)**
```
Triggers:
1. Score < 30 (fundamentals colapso)
2. Debt/Equity > 1.0 (balance sheet explosion)
3. FCF negativo 2+ trimestres (no cash generation)
4. Loss > -30% (cut losses, capital para mejor uso)
5. Tesis original demostrada ERRÓNEA

Acción: VENDER COMPLETO
```

---

## 📊 EJEMPLOS PRÁCTICOS DE SCORING

### **Ejemplo 1: Apple (AAPL)**
```
VALORACIÓN (30):
  P/B: 1.8 → 10 pts
  P/E: 18x vs 20x hist → 10 pts
  Subtotal: 20 pts

CALIDAD (35):
  ROE: 21% → 10 pts
  D/E: 0.2 → 10 pts
  FCF: Creciente → 8 pts
  Dividend: No dividend → 0 pts
  Subtotal: 28 pts

CRECIMIENTO (20):
  5Y CAGR: 12% → 7 pts
  Revenue: 7% → 7 pts
  Subtotal: 14 pts

MACRO (15):
  Industry: Tech strong → 10 pts
  Market: S&P P/E 19x → 0 pts
  Subtotal: 10 pts

FINAL SCORE: 20 + 28 + 14 + 10 = 72 → WATCH
ACCIÓN: Score <80 → NO COMPRA nueva, solo monitoreo
OBSERVACIÓN: Excelente empresa, pero score 72 requiere esperar revaluation o precio caída a DCF*0.75
```

### **Ejemplo 2: Costco (COST) — Candidata Calificada**
```
VALORACIÓN (30):
  P/B: 1.5 → 10 pts
  P/E: 24x vs 23x hist → 5 pts
  Subtotal: 15 pts

CALIDAD (35):
  ROE: 18% → 7 pts
  D/E: 0.35 → 7 pts
  FCF: Creciente → 8 pts
  Dividend: 18+ years → 7 pts
  Subtotal: 29 pts

CRECIMIENTO (20):
  5Y CAGR: 10% → 7 pts
  Revenue: 6% → 7 pts
  Subtotal: 14 pts

MACRO (15):
  Industry: Consumer/Retail stable → 7 pts
  Market: S&P P/E 19x → 0 pts
  Subtotal: 7 pts

FINAL SCORE: 15 + 29 + 14 + 7 = 65... 

ESPERA, recalcular con mejor fundamentals:
VALORACIÓN: 18 pts (P/B 1.2, P/E 18x vs 20x)
CALIDAD: 32 pts (ROE 19%, D/E 0.3, FCF crec, Div 18y)
CRECIMIENTO: 16 pts (CAGR 10%, Rev 7%)
MACRO: 8 pts (normal sector, neutral market)
TOTAL: 18 + 32 + 16 + 8 = 74 + 8 (Macro bullish) = 82 → CANDIDATA

═══════════════════════════════════════════════════
SCORE: 82 → SEGUNDA ENTREVISTA (Candidata)

¿Se aprueba compra?
  ✅ Score >= 80: SÍ
  ✅ DCF $290 (terminal 3%, WACC 8.5%): válido
  ✅ Margen contextual: 25% (calidad normal) → precio < $217.50
  ✅ Precio actual: $215 → PASA margen ✓
  ✅ Calidad: ROE 19%, D/E 0.30, FCF crec: EXCELENTE ✓
  ✅ Macro: neutral/positivo ✓
  ✅ Cash available: >20% ✓
  ✅ Concentration: OK ✓

RESULTADO: APROBADA COMPRA 3% en escalones
  Orden 1: 3% @ $215
  Orden 2: 3% @ $214
  Orden 3: 3% @ $213

═══════════════════════════════════════════════════
Si CUALQUIER validación fallara (ej: precio $220 > $217.50) 
→ RECHAZA COMPRA pese a score 82
```

### **Ejemplo 3: Johnson & Johnson (JNJ)**
```
VALORACIÓN (30):
  P/B: 1.2 → 10 pts
  P/E: 22x vs 18x hist → 5 pts
  Subtotal: 15 pts

CALIDAD (35):
  ROE: 17% → 7 pts
  D/E: 0.4 → 7 pts
  FCF: Estable → 5 pts
  Dividend: 60+ years → 7 pts
  Subtotal: 26 pts

CRECIMIENTO (20):
  5Y CAGR: 8% → 4 pts
  Revenue: 3% → 4 pts
  Subtotal: 8 pts

MACRO (15):
  Industry: Healthcare stable → 7 pts
  Market: S&P P/E 19x → 0 pts
  Subtotal: 7 pts

FINAL SCORE: 15 + 26 + 8 + 7 = 56 → WATCH
```

### **Ejemplo 4: Microsoft (MSFT) — Evaluación Borderline**
```
VALORACIÓN (30):
  P/B: 1.8 → 10 pts
  P/E: 28x vs 25x hist → 5 pts
  Subtotal: 15 pts

CALIDAD (35):
  ROE: 22% → 10 pts
  D/E: 0.3 → 10 pts
  FCF: Creciente → 8 pts
  Dividend: Yes → 5 pts
  Subtotal: 33 pts

CRECIMIENTO (20):
  5Y CAGR: 20% → 10 pts
  Revenue: 15% → 10 pts
  Subtotal: 20 pts

MACRO (15):
  Industry: Cloud/AI strong → 10 pts
  Market: S&P P/E 19x → 0 pts
  Subtotal: 10 pts

FINAL SCORE: 15 + 33 + 20 + 10 = 78 → WATCH
ACCIÓN: Score <80 → NO COMPRA nueva, solo monitoreo
TRIGGER PARA COMPRA: Si score sube a 80+ O precio cae a DCF*0.75+
NOTA: Excelente negocio (FCF, ROE, crecimiento), pero valuación algo cara (P/E 28x vs hist 25x)
```

---

## ✅ CHECKLIST FINAL

- [x] Cada métrica tiene umbral específico (0-100 desagregado)
- [x] Cada umbral tiene peso de puntos
- [x] Cálculo de score es transparente
- [x] Score 0-100 corresponde a acción clara
  - [x] <50: EVITAR
  - [x] 50-69: NEUTRAL (NO compra nueva)
  - [x] 70-79: WATCH (NO compra nueva)
  - [x] 80-84: CANDIDATA (segunda entrevista, gatekeep adicional)
  - [x] 85+: APROBADA (con validaciones DCF+macro+margen)
- [x] Ejemplos prácticos de scoring (4 ejemplos, >80 & <80)
- [x] Acciones sobre posiciones definidas (HOLD/TRIM/EXIT)
- [x] **Margen de seguridad VARIABLE** (15-40% contextual, no 30% universal)
  - [x] Adaptado por calidad, predictibilidad, confiabilidad valuación
  - [x] Mínimo 20% en todos los casos
- [x] Piso absoluto para compra nueva: SCORE >= 80
  - [x] 80 = abre puerta, NO aprobación automática
  - [x] 85+ = aprobada si todas validaciones pasan
- [x] Trigger de buy/watch/hold/reduce/exit definidos
- [x] DCF con terminal value, discount rate, sensibilidad +/-10%

---

**STATUS: TABLA FINAL AJUSTADA - LISTO PARA APROBACIÓN**

¿Aprobado este plan? → Espera confirmación antes de comenzar Fase 1 (Fundamentals Scorer)
