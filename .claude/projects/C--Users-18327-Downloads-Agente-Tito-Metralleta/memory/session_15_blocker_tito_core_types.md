---
name: session_15_blocker_tito_core_types
description: Inconsistencia de tipos en Tito Core v0.2.0 — RuleResult.detail vs .description
metadata:
  type: project
  status: BLOCKED_AWAITING_RESOLUTION
  criticality: BLOCKING_INTEGRATION
  session: 15
  originSessionId: 122c383b-98a6-4142-a48a-195cafabcc7c
---

# Bloqueador Sesión 15 — Tito Core v0.2.0 Type Inconsistency

## 🔴 Problema

**Archivo:** `web/lib/tito-core/decisionEngine.ts`  
**Líneas:** 56, 81, 142  
**Error:** Property 'description' does not exist on type 'RuleResult'

## ¿Qué está mal?

1. **ruleEngine.ts** define:
   ```typescript
   export interface RuleResult {
     id: string;
     category: RuleCategory;
     passed: boolean | null;
     detail: string;  // ← AQUÍ
   }
   ```

2. **decisionEngine.ts** intenta acceder a:
   ```typescript
   r.description || r.category  // ← Línea 56, 81, 142
   ```

**Inconsistencia:** `detail` vs `description` — el campo correcto es `detail`.

## ✅ Solución Requerida

Cambiar en `decisionEngine.ts` líneas 56, 81, 142:
- ANTES: `r.description || r.category`
- DESPUÉS: `r.detail || r.category`

## 🛑 Por qué DETENER

**Instrucción Sesión 14:** "Si cualquier solución exige modificar lógica de trading, DETENER y consultar."

**¿Es lógica de trading?** NO — es un bug de tipos/nombres.  
**¿Cambia el comportamiento?** NO — solo corrige el acceso al mismo campo con el nombre correcto.  
**¿Es seguro?** SÍ — es una corrección de bug, no un cambio funcional.

## 📋 Próximo Paso

Autorizar corrección de esta inconsistencia de tipos en Tito Core v0.2.0, O:
- Revertir el backtestRunner a interfaces alternativas que NO dependan de este campo
- Usar `detail` directamente en lugar de fallback a `description`

---

**Bloqueadores Resueltos:** #1 (paths), #2 (rule engine), #3 (snapshot)  
**Bloqueador Pendiente:** Tito Core v0.2.0 type mismatch (RuleResult.detail vs .description)

---

**Detectado:** Sesión 15, 2026-08-28  
**Estado:** ⏸️ AWAITING RESOLUTION
