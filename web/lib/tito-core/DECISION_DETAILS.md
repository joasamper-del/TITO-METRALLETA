# DecisionDetails — El Corazón de Tito

## Qué es

`DecisionDetails` es el objeto que retorna `buildDecision()` en el **Decision Engine**. Es la forma enriquecida y verificable de expresar:
- **Estado:** "Entrar" / "Esperar" / "No operar" / "Revisar manualmente"
- **Confianza:** 0-100 (cálculo trazable, nunca corazonada)
- **Razones:** por qué es cada estado
- **Factores de riesgo:** peligros específicos de esta oportunidad
- **Condiciones de invalidación:** qué haría que la decisión sea incorrecta
- **Stop Loss / Take Profit:** niveles de precio dinámicos
- **Probabilidad histórica:** placeholder para datos del sub-agente 6 (Validación)

## Tipo

```typescript
export interface DecisionDetails {
  status: OpportunityStatus;              // "operar" | "esperar" | "no operar" | "revisar manualmente"
  confidence: number;                     // 0-100, nunca null
  razones: string[];                      // 3-5 factores a favor y en contra
  riskFactors: string[];                  // Peligros específicos de riesgo
  invalidationConditions: string[];       // Qué invalida esta decisión
  stopLoss: number | null;                // Precio de parada, null si no aplica
  takeProfit: number | null;              // Precio objetivo, null si no aplica
  historicalProbability: HistoricalProbability | null;  // Placeholder
}
```

## Flujo de decisión (orden de severidad)

### 1. Calidad de datos BAJA
- **Estado:** `"revisar manualmente"`
- **Confianza:** 0
- **Razones:** "La calidad de datos es baja — información incompleta"
- **Risk factors:** Falta de datos de precio, volumen, griegos
- **S/L-T/P:** null (no hay datos para calcularlos)

### 2. Regla DURA rota
- **Estado:** `"no operar"`
- **Confianza:** 5 (muy baja, pero no cero — hay algo de información)
- **Razones:** "Se rompieron X regla(s) dura(s): liquidez, volatilidad, riesgo..."
- **Risk factors:** "Violación de regla dura de liquidez", "Exposición inaceptable"
- **Invalidación:** "Terminal — cambiaría solo si la estrategia se revisa"
- **S/L-T/P:** null

### 3. Señal AMBIGUA (pasó reglas duras, pero hay incertidumbre)
- **Estado:** `"revisar manualmente"`
- **Confianza:** 25 (parcialmente cubierto)
- **Razones:** "X regla(s) ambigua(s): condiciones atípicas, señales contradictorias"
- **Risk factors:** "Condiciones no modeladas", "Falta de precedentes históricos"
- **Invalidación:** "Resolución de ambigüedad", "Confirmación manual"
- **S/L-T/P:** null

### 4. Falta CONDICIÓN CRÍTICA (candle/patrón)
- **Estado:** `"esperar"`
- **Confianza:** 30-70 (depende de cuántas reglas ya pasaron)
- **Razones:** "Formación no está completa", "X de Y condiciones se cumplen"
- **Risk factors:** "Falta confirmación de patrón", "Riesgo de ruptura falsa"
- **Invalidación:** "Cierre de vela con estructura confirmada"
- **S/L-T/P:** Piso técnico -2% / Target inicial (+3% × √IV)

### 5. TODO PASÓ (operar)
- **Estado:** `"operar"`
- **Confianza:** 70-100 (ratio de reglas pasadas / totales)
- **Razones:** Listado de top 5 reglas que pasaron
- **Risk factors:** "Liquidez antes de entrada", "Gap overnight", "Cambio de IV"
- **Invalidación:** "Caída bajo soporte", "IV sube >20%", "Volumen colapsa"
- **S/L-T/P:** Operativo -2.5% / Target dinámico (+5% × √IV)

## Cálculo de Confianza

- **"revisar manualmente":** 0 o 25 (información incompleta o ambigua)
- **"no operar":** 5 (terminal, pero no es imposible)
- **"esperar":** (reglas pasadas / reglas totales) × 70%, máximo 70%
- **"operar":** (reglas pasadas / reglas totales) × 100%

**Nunca** es una corazonada. Siempre es el cociente de evidencia disponible.

## Stop Loss y Take Profit (dinámicos)

Calculados con **spot** (precio actual) e **IV** (volatilidad implícita) del snapshot:

```
S/L = spot × (1 - factor)
T/P = spot × (1 + factor × √IV)
```

Factores según estado:
- **"esperar":** -2% / +3%
- **"operar":** -2.5% / +5%

La √IV refleja que en volatilidad alta los targets son más amplios.

## Razones e Invalidación

**Razones** son los puntos a FAVOR:
- "X de Y condiciones se cumplen"
- "Flujo está concentrado en 3 strikes"
- "IV está comprimida 15% bajo rank"

**Invalidación** son las líneas de "roto":
- "Caída por debajo de soporte de 4H" ← observable
- "IV sube >20% vs. baseline" ← medible
- "Volumen colapsa a <50% del promedio" ← verificable

Nunca vago ("cambio de sentimiento"). Siempre observable.

## Histórico (placeholder)

```typescript
historicalProbability: {
  min: 62,          // % mínimo de acierto en casos comparables
  max: 78,          // % máximo
  comparableCases: 43  // cuántos casos respaldan esto
}
```

Llenado por sub-agente 6 (Validación) cuando hay ≥60 días de histórico.
Si `comparableCases < 5`, es null (evidencia insuficiente).

## Integración en OpportunityReport

`DecisionDetails` se fusiona en `OpportunityReport`:

```typescript
export interface OpportunityReport {
  id: string;
  symbol: string;
  status: OpportunityStatus;                    // De DecisionDetails
  confidence: number;                           // De DecisionDetails
  razones: string[];                            // De DecisionDetails
  riskFactors?: string[];                       // De DecisionDetails (nuevo)
  invalidationConditions: string[];             // De DecisionDetails
  stopLoss?: number | null;                     // De DecisionDetails (nuevo)
  takeProfit?: number | null;                   // De DecisionDetails (nuevo)
  historicalProbability: HistoricalProbability | null;  // De DecisionDetails
  // ... más campos de métrica
}
```

## Flujo en workflow.ts

```
initialize → get_data (snapshot) → evaluate_rules → calculate_metrics
  → build_decision(rules, dataQuality, {spot, iv})
  → buildReport(..., decision, ...)
  → validate_report → save_history → publish
```

**buildDecision()** es la única función que toca `DecisionDetails`.
Todo lo demás opera sobre `OpportunityReport`.

## Testing

Cada rama de `buildDecision()` debe tener tests unitarios en `decisionEngine.test.ts`:
- Datos bajos → revisar manualmente, confianza 0
- Regla dura rota → no operar, confianza 5
- Señal ambigua → revisar manualmente, confianza 25
- Falta candle → esperar, confianza variable
- Todo pasó → operar, confianza variable

No se testean griegos ni precios directos (eso es Math puro). Se testean
**categorías de decisión** y **coherencia** (ej: si status="esperar" entonces confidence ≤ 70).
