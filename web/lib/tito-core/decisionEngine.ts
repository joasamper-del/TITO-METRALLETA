// Decision Engine — "deriva únicamente los cuatro estados oficiales" (bitácora §7).
// No conoce símbolos, precios ni prioridades: solo mira resultados de reglas y calidad
// de datos. Orden de evaluación (mayor a menor severidad), fiel a la semántica de §4:
//
//   1. dataQuality "baja"         → datos incompletos FUERZAN revisión (principio §2).
//   2. una regla dura rota        → no cumple la estrategia → "no operar".
//   3. cualquier señal ambigua    → mixta / fuera de lo cubierto → "revisar manualmente".
//   4. falta la condición crítica → oportunidad en formación → "esperar".
//   5. todo lo demás aprobado     → "operar".
//
// "Casi cumple" nunca es "operar": el paso 4 es la única salida hacia "esperar", y
// exige que TODAS las reglas duras ya hayan pasado.

import type { DataQuality, OpportunityStatus } from "./types";
import type { RuleResult } from "./ruleEngine";
import { HARD_RULE_CATEGORIES } from "./ruleEngine";

export function buildDecision(rules: RuleResult[], dataQuality: DataQuality): OpportunityStatus {
  if (dataQuality === "baja") return "revisar manualmente";

  const hardBroken = rules.some(
    (r) => HARD_RULE_CATEGORIES.includes(r.category) && r.passed === false,
  );
  if (hardBroken) return "no operar";

  const ambiguous = rules.some((r) => r.passed === null);
  if (ambiguous) return "revisar manualmente";

  const candle = rules.find((r) => r.category === "candle");
  if (candle && candle.passed === false) return "esperar";

  return "operar";
}
