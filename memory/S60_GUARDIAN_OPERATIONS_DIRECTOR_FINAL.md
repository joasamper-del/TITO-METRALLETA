# 🏛️ Guardian as Operations Director - FINAL ARCHITECTURE

**Fecha:** 2026-09-07 (S60)  
**Escalada Final:** Monitor → Administrator → **Operations Director**  
**Estado:** ✅ ARQUITECTURA COMPLETA - LISTO PARA IMPLEMENTACIÓN

---

## 🎯 La Misión Final del Guardian

**Guardian es el Director de Operaciones de la Plataforma Tito.**

```
Responsabilidades:
  ✅ Diagnosticar salud del sistema (24/7)
  ✅ Autorizar cada operación de trading
  ✅ Detectar patrones y aprender
  ✅ Auto-corregir de forma segura (≥80% confianza)
  ✅ Generar reporte ejecutivo DIARIO
  ✅ Proporcionar índice de confiabilidad (0-100%)
  ✅ Recomendar si operar o no

Lo que Guardian NO HACE:
  ❌ Operar
  ❌ Decidir estrategias
  ❌ Crear órdenes
  ❌ Analizar mercados
```

---

## 📊 El Reporte Ejecutivo Diario

**Todos los días, cuando se abre el mercado, Guardian entrega UN reporte que el operador lee en 2 minutos y decide.**

```
════════════════════════════════════════════════════════════════
OPERATIONS DIRECTOR - DAILY REPORT
2026-09-07 09:00 AM
════════════════════════════════════════════════════════════════

STATUS: 🟢 OPERATIONAL
CONFIDENCE: 95% (PROCEED)
RECOMMENDATION: GO

════════════════════════════════════════════════════════════════

🔴 CRITICAL ISSUES (0):
  (none)

🟡 WARNINGS (2):
  • NewsAPI occasional timeouts (rate limiting)
  • Alpaca latency above baseline (+50ms)

✅ FIXES APPLIED (85% success rate):
  • Cache clear - NewsAPI recovered
  • Connection reset - Alpaca normalized

📋 PENDING ACTIONS (3):
  🔴 [CRITICAL] Upgrade NewsAPI plan to handle rate limits (Est: 1 day)
  🟡 [HIGH] Review Alpaca network routing (Est: 2 hours)

📊 METRICS:
   Uptime: 99.5% | Latency: 245ms | Data Fresh: 100%

════════════════════════════════════════════════════════════════
VERDICT: ✅ READY TO OPERATE
════════════════════════════════════════════════════════════════
```

**Operador lee esto y decide: "OK, hoy SÍ operamos" o "No, arreglamos primero X".**

---

## 🔄 Flujo Operativo Diario

### 09:00 AM - Market Opens
```
guardian.resetSession()
  └─ Limpia datos de ayer

guardian.generateDailyDirectorReport()
  ├─ Inspección comprehensiva (APIs, auth, datos, latencia)
  ├─ Detecta patrones (problemas recurrentes)
  ├─ Calcula índice de confianza (0-100%)
  ├─ Recomienda GO / NO-GO
  └─ Entrega reporte

Operador lee reporte:
  ├─ Status: OPERATIONAL / DEGRADED / CRITICAL
  ├─ Confidence: 95%
  ├─ Recommendation: GO / NO-GO / GO_WITH_CAUTION
  └─ Decision: ¿Operar o no?
```

### 09:30 AM - 16:00 (Trading Session)
```
guardian.monitorTradingSession()
  └─ Corre cada 60 segundos:
     ├─ Health checks de todos los providers
     ├─ Detecta patrones nuevos
     ├─ Auto-corrige lo seguro (timeout→reset, cache→clear, etc)
     ├─ Registra incidents
     └─ Actualiza trend

ANTES de cada operación de Tito:
  └─ guardian.confirmAllSystemsReadyForOperation()
     ├─ ¿APIs operativas?
     ├─ ¿Datos frescos?
     ├─ ¿Sin problemas críticos?
     └─ GO / NO-GO (rápido, <100ms)
```

### 16:00 (4 PM - Market Close)
```
guardian.generatePostSessionIntelligenceReport()
  ├─ Patrones detectados hoy
  ├─ Correcciones que funcionaron
  ├─ Trend de salud (mejorando/estable/degradando)
  ├─ Recomendaciones para MAÑANA
  └─ Insights de aprendizaje
  
Ejemplo:
  "NewsAPI timeouts entre 10-11 AM (3x en 24h)
   → Solución: Rotate a fallback durante esa hora
   → Efectividad: 85% (safe to auto-correct)"
```

---

## 🏗️ Componentes Técnicos

### 1. SystemGuardian (Monitoreo)
```typescript
// Health checks cada minuto
performHealthCheck()
  └─ Valida conectividad
  └─ Mide latencia
  └─ Detecta issues
  └─ Registra incidents

// Gate antes de operar
confirmAllSystemsGo()
  └─ Rápida revisión de salud
  └─ Retorna: {approved, reason, checkResults}

// Chequeo completo antes de mercado
performPreMarketChecklist()
  └─ APIs, auth, datos, latencia, recursos
  └─ Retorna: readinessScore (0-100)
```

### 2. SystemIntelligence (Aprendizaje)
```typescript
// Detectar patrones recurrentes
detectIncidentPatterns(incidents)
  └─ "NewsAPI timeout (3x en 24h)"
  └─ "Patrón entre 10-11 AM"
  └─ "Sugerencia: rotate fallback"

// Auto-corregir lo SEGURO
performSafeAutoCorrection(provider, type)
  ├─ Si timeout → reset (85% éxito) → AUTO
  ├─ Si cache stale → clear (90% éxito) → AUTO
  ├─ Si provider down → rotate (95% éxito) → AUTO
  └─ Otras → ALERTA (no auto-ejecutar)

// Aprender de hoy para mañana
generateIntelligenceReport()
  └─ Patterns, corrections, trend, insights
```

### 3. OperationsDirector (Reporte Ejecutivo)
```typescript
// El reporte que el operador lee
generateExecutiveSummary()
  ├─ Issues encontrados (critical/warning/info)
  ├─ Fixes aplicados (tasa de éxito)
  ├─ Pending actions (qué hacer después)
  ├─ Confidence index (0-100%)
  ├─ Recommendation (GO/NO-GO)
  └─ formatForDisplay() → reporte bonito

// Índice de confianza compuesto
confidenceIndex:
  ├─ Infrastructure (API health + latencia)
  ├─ DataQuality (freshness)
  ├─ Resilience (auto-corrections)
  └─ Knowledge (patterns detected)
```

### 4. SystemGuardianDirector (Orquestación)
```typescript
// TODO EN UNO

generateDailyDirectorReport()
  └─ Combina: Guardian + Intelligence + Director
  └─ Entrega: ExecutiveSummary listo para operador

monitorTradingSession()
  └─ Corre cada minuto durante sesión

confirmAllSystemsReadyForOperation()
  └─ Gate rápido antes de cada trade

generatePostSessionIntelligenceReport()
  └─ Learning para MAÑANA
```

---

## 📈 El Índice de Confianza

**Composite score (0-100%) que resume la salud total del sistema:**

```
Infrastructure Score (0-100):
  = 100 - (uptime_gap × 2) - (latency_ms / 20)
  Ejemplo: 99% uptime + 245ms latency = 98 puntos

Data Quality Score (0-100):
  = % de datos frescos (< 5 minutos)
  Ejemplo: 100% datos frescos = 100 puntos

Resilience Score (0-100):
  = (auto-corrections exitosas / total) × 100 + 20
  Ejemplo: 8/10 exitosas = 100 puntos

Knowledge Score (0-100):
  = 70 + min(patterns_detected × 5, 20)
  Ejemplo: 4 patrones detectados = 90 puntos

OVERALL = (Infrastructure + DataQuality + Resilience + Knowledge) / 4
  Ejemplo: (98 + 100 + 100 + 90) / 4 = 97%
```

**Recomendación basada en score:**
```
Score ≥ 90%  → PROCEED ("All systems ready")
Score 75-89% → PROCEED_CAUTIOUS ("Monitor required")
Score 60-74% → HOLD ("System degraded")
Score < 60%  → ESCALATE ("Critical - do not operate")
```

---

## 💾 Datos del Reporte

### OperationIssue
```typescript
{
  id: string,
  category: 'critical' | 'warning' | 'info',
  title: string,
  description: string,
  detectedAt: Date,
  provider?: string,
  impact: string,
  severity: number (1-10)
}
```

### AppliedFix
```typescript
{
  id: string,
  type: 'auto_correction' | 'manual_intervention' | 'monitoring' | 'escalation',
  issue: OperationIssue,
  action: string,
  result: 'success' | 'partial' | 'pending' | 'failed',
  appliedAt: Date,
  notes?: string
}
```

### PendingAction
```typescript
{
  id: string,
  priority: 'critical' | 'high' | 'medium' | 'low',
  title: string,
  description: string,
  estimatedEffort: string, // "5 min", "1 hour", "1 day"
  recommendedBy: string,
  targetCompletion?: Date
}
```

### ExecutiveSummary
```typescript
{
  sessionDate: Date,
  overallStatus: 'OPERATIONAL' | 'DEGRADED' | 'CRITICAL',
  confidenceIndex: {
    overall: 0-100,
    infrastructure: 0-100,
    dataquality: 0-100,
    resilience: 0-100,
    knowledge: 0-100,
    recommendation: 'PROCEED' | 'PROCEED_CAUTIOUS' | 'HOLD' | 'ESCALATE',
    reasoning: string
  },
  recommendation: 'GO' | 'NO-GO' | 'GO_WITH_CAUTION',

  issuesDetected: { critical[], warnings[], info[] },
  appliedFixes: AppliedFix[],
  autoCorrectionsSuccessRate: number (%),

  pendingActions: PendingAction[],
  blockers: string[],

  metrics: {
    systemUptime: number (%),
    averageLatency: number (ms),
    dataFreshness: number (%),
    incidentsDetected: number,
    incidentsResolved: number,
    autoCorrectionsExecuted: number
  },

  insights: {
    patterns: string[],
    improvements: string[],
    risks: string[]
  },

  fullReport: string // Rich text narrative
}
```

---

## 🔧 API del Guardian Director

### Morning: Pre-Market
```typescript
const report = await director.generateDailyDirectorReport();

// Operador lee esto:
console.log(director.formatDailyReport(report));
// Output: Pretty-printed executive summary

// Decide:
if (report.recommendation === 'GO') {
  // Permitir trading
} else {
  // Bloquear hasta resolución
}
```

### Trading Session: Every Trade
```typescript
const gate = await director.confirmAllSystemsReadyForOperation();

if (gate.approved) {
  // Ejecutar trade
} else {
  // Bloquear: gate.reason
}
```

### Trading Session: Every Minute
```typescript
await director.monitorTradingSession();
// Se ejecuta automáticamente via @Cron()
// - Detecta issues
// - Auto-corrige
// - Registra
```

### Afternoon: Post-Market
```typescript
const intelligence = await director.generatePostSessionIntelligenceReport();

// Guardar para análisis mañana:
// - intelligence.patterns
// - intelligence.recommendations
// - intelligence.trend
// - intelligence.insights
```

---

## 📁 Archivos Creados

```
backend/src/modules/research/guardians/
  ├─ system-guardian.ts (600+ líneas)
  │  ✅ Health checks, incident logging, gates
  │
  ├─ system-intelligence.ts (400+ líneas)
  │  ✅ Pattern detection, safe auto-correction, learning
  │
  ├─ operations-director.ts (400+ líneas)
  │  ✅ Executive summary, confidence index, formatting
  │
  └─ system-guardian-director.ts (300+ líneas)
     ✅ Orchestration, daily workflow, integration

research/research.module.ts
  └─ ✅ Dependencies registered
```

---

## 🚀 Integración en Operación

### 1. **Application Startup**
```typescript
// app.module.ts
async onModuleInit() {
  const report = await this.director.generateDailyDirectorReport();
  console.log(this.director.formatDailyReport(report));
  
  if (report.recommendation === 'NO-GO') {
    this.logger.error('System not ready. Cannot start trading.');
    process.exit(1);
  }
}
```

### 2. **Before Every Trade**
```typescript
// operation-orchestrator.ts
async proposeOperation(signal) {
  const gate = await this.director.confirmAllSystemsReadyForOperation();
  
  if (!gate.approved) {
    return { blocked: true, reason: gate.reason };
  }
  
  return this.executeOperation(signal);
}
```

### 3. **Continuous Monitoring**
```typescript
// scheduled.tasks.ts
@Cron(CronExpression.EVERY_MINUTE)
async monitorHealth() {
  await this.director.monitorTradingSession();
}
```

### 4. **Market Close**
```typescript
// scheduled.tasks.ts
@Cron('0 16 * * MON-FRI') // 4 PM ET
async dailyClosing() {
  const intelligence = await this.director.generatePostSessionIntelligenceReport();
  await this.auditService.logIntelligence(intelligence);
}
```

---

## 📋 Checklist: Implementación

**Phase 1: Providers (Sesión S61+)**
- [ ] NewsAPI provider
- [ ] Earnings provider
- [ ] Calendar provider
- [ ] SECEdgar provider
- [ ] Yahoo fundamentals provider

**Phase 2: Integration (Sesión S62+)**
- [ ] Wire Guardian into WebResearchService
- [ ] Hook operation gates
- [ ] Dashboard endpoints
- [ ] Alert system

**Phase 3: Learning (Sesión S63+)**
- [ ] Pattern detection validation
- [ ] Auto-correction tuning
- [ ] Learning memory persistence
- [ ] Recommendation engine refinement

---

## 🎯 Filosofía Core

> **Guardian es el Administrador de la Plataforma.**
>
> No opera. No decide sobre trading. Solo mantiene la plataforma en máxima capacidad.
>
> Antes de abrir mercado: reporte ejecutivo que dice SÍ o NO.
>
> Durante la sesión: gates en cada trade + monitoreo continuo.
>
> Al cierre: análisis de patrones para prevenir mañana.
>
> **Índice de confianza: la métrica que resume TODO.**

---

## ✅ Estado Final

**Guardian está COMPLETO y LISTO.**

Lo que falta es **integrar los 5 data providers** (Sesión S61+).

Una vez implementados, Guardian funcionará como:
- ✅ Monitor 24/7 (salud del sistema)
- ✅ Gatekeeper (antes de cada trade)
- ✅ Inteligencia (detecta patrones, aprende)
- ✅ Director (reporte ejecutivo diario)

Tito opera en segundo plano seguro.

---

**Creado:** 2026-09-07  
**Escalada:** Monitor → Administrator → Operations Director  
**Responsable:** Claude Code (AI Architect)  
**Estado:** ✅ ARQUITECTURA CONGELADA - LISTA PARA IMPLEMENTACIÓN
