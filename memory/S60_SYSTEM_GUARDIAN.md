# 🛡️ System Guardian - 24/7 Maintenance Layer
**Creado:** 2026-09-07 (S60)  
**Filosofía:** "Un ingeniero que trabaja en segundo plano mientras el motor solo se enfoca en operar"  
**Estado:** ARQUITECTURA COMPLETADA

---

## 🎯 Propósito

**Separación de responsabilidades:**

```
TITO (Trading Core)            GUARDIAN (Maintenance)
├─ Analizar datos              ├─ Validar providers
├─ Evaluar estrategias         ├─ Medir response times
├─ Ejecutar trades             ├─ Detectar fallos
└─ Registrar decisiones        ├─ Auto-rotar fallbacks
                               ├─ Registrar incidentes
                               └─ Se auto-cuida (independiente)
```

**Beneficio:** 
- Tito limpio y enfocado
- Guardian vigilante 24/7
- Solución permanente (no parcheada)

---

## 📋 Responsabilidades del Guardian

### 1. Health Checks (Cada minuto)
```typescript
@Cron(EVERY_MINUTE)
async performHealthCheck(): Promise<void> {
  // Para cada provider:
  // 1. Ping endpoint (HEAD request)
  // 2. Validar API key
  // 3. Medir response time
  // 4. Verificar rate limit headers
  // 5. Actualizar ProviderHealthStatus
  // 6. Loguear incidente si falla
  // 7. Auto-rotar fallback si es necesario
}
```

### 2. Incident Logging (Inmutable)
```
Cada falla → SystemIncident:
  id: "INC-1725138360000-a7b3c2"
  timestamp: 2026-09-07T15:26:00Z
  provider: "NewsAPI"
  type: "connection_timeout" | "api_error" | "rate_limit" | etc.
  severity: "critical" | "high" | "medium" | "low"
  message: "Request timed out after 5000ms"
  statusCode: 504
  recoveryAction: "Switching to fallback"
```

### 3. Provider Health Tracking
```
ProviderHealthStatus:
  name: "NewsAPI"
  type: "news"
  priority: 1
  isHealthy: true/false
  responseTimeMs: 245
  uptime: 99.8%
  consecutiveFailures: 0
  consecutiveSuccesses: 47
```

### 4. Fallback Management
```typescript
const nextProvider = guardian.suggestNextProvider('NewsAPI', 'news');
// Returns: Provider con menor priority que esté saludable
// Ejemplo: "MarketWatch" (priority 2) si NewsAPI falla
```

### 5. Manual Intervention
```typescript
guardian.disableProvider('NewsAPI');  // Deshabilitar manualmente
guardian.enableProvider('NewsAPI');   // Re-habilitar
```

---

## 🔧 Implementación en WebResearchService

### Cuando un Provider Falla
```typescript
// En web-research.service.ts:
for (const provider of this.newsProviders) {
  try {
    const results = await provider.search(context.ticker);
    items.push(...results);
    
    // Provider OK - registrar recuperación
    if (wasFailingBefore) {
      this.guardian.recordIncident(provider.name, 'recovery', 'low', 'Provider OK');
    }
  } catch (error) {
    // Provider FALLÓ - registrar incidente
    const incidentId = this.guardian.recordIncident(
      provider.name,
      'connection_timeout',
      'high',
      error.message
    );
    
    // Sugerir fallback
    const nextProvider = this.guardian.suggestNextProvider('news', context.ticker);
    
    // Continuar con siguiente provider
  }
}
```

---

## 📊 APIs del Guardian

### Health Report (Dashboard)
```
GET /api/research/guardian/health

Response:
{
  timestamp: "2026-09-07T15:26:00Z",
  overallHealth: "healthy" | "degraded" | "critical",
  healthScore: 95,  // 0-100
  providers: [
    {
      name: "NewsAPI",
      type: "news",
      priority: 1,
      isHealthy: true,
      responseTimeMs: 245,
      uptime: 99.8%,
      consecutiveFailures: 0,
      consecutiveSuccesses: 47
    },
    // ... más providers
  ],
  incidents: [
    {
      id: "INC-...",
      timestamp: "...",
      provider: "NewsAPI",
      type: "connection_timeout",
      severity: "high",
      message: "Timed out after 5000ms",
      recoveryAction: "Switched to MarketWatch"
    }
  ],
  recommendations: [
    "NewsAPI response time increased to 3000ms - monitor closely"
  ]
}
```

### Provider Status
```
GET /api/research/guardian/providers?type=news

Response: [
  { name: "NewsAPI", isHealthy: true, uptime: 99.8%, ... },
  { name: "MarketWatch", isHealthy: true, uptime: 98.2%, ... },
  ...
]
```

### Incident Log
```
GET /api/research/guardian/incidents?provider=NewsAPI&hoursBack=24

Response: [
  { id: "INC-...", timestamp: "...", type: "connection_timeout", ... },
  { id: "INC-...", timestamp: "...", type: "recovery", ... },
  ...
]
```

### Guardian Stats
```
GET /api/research/guardian/stats

Response:
{
  totalIncidentsRecorded: 47,
  providersMonitored: 5,
  criticalIncidents: 2,
  providersDisabled: 0,
  lastHealthCheckAt: "2026-09-07T15:26:00Z"
}
```

### Manual Control
```
POST /api/research/guardian/providers/:name/disable
POST /api/research/guardian/providers/:name/enable
GET /api/research/guardian/incidents/export?format=json|csv
```

---

## 🏗️ Arquitectura Completa (Ahora)

```
┌─────────────────────────────────────────────────────────────┐
│                     Tito Trading Core                        │
│          (Analyze • Decide • Execute • Learn)                │
└───────────────────┬─────────────────────────────────────────┘
                    │ uses
                    ▼
┌─────────────────────────────────────────────────────────────┐
│                 Web Research Service                         │
│  (News, Events, Fundamentals, Quality Assessment)           │
│                                                              │
│  Flow:                                                       │
│  1. investigate() → collects data                           │
│  2. On failure → guardian.recordIncident()                  │
│  3. Get fallback → guardian.suggestNextProvider()           │
│  4. Continue chain → try next provider                      │
└───────────────────┬─────────────────────────────────────────┘
                    │ monitored by
                    ▼
┌─────────────────────────────────────────────────────────────┐
│              System Guardian (24/7)                          │
│                                                              │
│  Every 1 min:  Health check on all providers               │
│  Every error:  Record incident with details                │
│  On recovery:  Log recovery, update status                 │
│  Dashboard:    Real-time provider health report            │
│  Manual:       Enable/disable providers as needed          │
│                                                              │
│  Independence: NOT dependent on research core              │
│                Self-maintains, self-monitors               │
└─────────────────────────────────────────────────────────────┘
```

---

## 💡 Key Advantages

### 1. Separation of Concerns
- Tito = Trading logic
- Guardian = Infrastructure health
- No mixing responsibilities

### 2. Resilience
```
Provider fails:
  1. Guardian detects (health check)
  2. Records incident
  3. Suggests fallback
  4. WebResearch switches provider
  5. Tito never sees the failure
```

### 3. Transparency
```
Operator asks: "Why did we use MarketWatch instead of NewsAPI?"

Answer (from incident log):
  "NewsAPI connection_timeout at 15:23:00
   INC-1725138360000-a7b3c2
   Switched to MarketWatch (priority 2)
   NewsAPI recovered at 15:25:30"
```

### 4. Scalability
```
Adding new provider:
  1. Guardian auto-discovers it
  2. Starts health checks immediately
  3. Integrates fallback chain
  4. No code changes to trading core
```

### 5. Permanent Solution
- Not a band-aid
- Architecture-level resilience
- Works for any provider type
- Grows with Tito

---

## 📈 Metrics Guardian Tracks

```
Per Provider:
  ✓ Response time (ms)
  ✓ Uptime percentage
  ✓ Consecutive failures
  ✓ Consecutive successes
  ✓ Last check timestamp
  ✓ Health status (boolean)

Global:
  ✓ Total incidents recorded
  ✓ Critical incidents
  ✓ Providers disabled (manual)
  ✓ System health score (0-100)
  ✓ Recommendations for ops
```

---

## 🔐 Audit Trail

```
Every incident is:
  ✅ Timestamped (UTC)
  ✅ Attributed to provider
  ✅ Classified by type
  ✅ Severity-scored
  ✅ Recovery-tracked
  ✅ Exportable (JSON/CSV)

24-hour retention minimum
```

---

## 🚀 Next: Integration with Web Research Providers

Once providers are implemented, Guardian will:

1. **Validate** each provider on registration
2. **Monitor** health every minute
3. **Alert** if provider degrades
4. **Suggest** fallback automatically
5. **Log** every incident permanently
6. **Report** to dashboards real-time

---

## 🎓 Philosophy Quote

> "Un ingeniero de mantenimiento que trabaja 24 horas en segundo plano,  
> mientras el motor de trading solo se dedica a analizar y operar.  
> Tito está limpio. Guardián está vigilante."

**Translation:**
> "A maintenance engineer working 24/7 in the background,  
> while the trading engine focuses only on analyzing and operating.  
> Tito is clean. Guardian is watchful."

---

## ✅ Integration Checklist

- [x] SystemGuardian class created
- [x] ProviderHealthStatus type defined
- [x] SystemIncident type defined
- [x] Health check loop defined (needs @Scheduled)
- [x] Incident recording logic
- [x] Fallback suggestion algorithm
- [x] Export/audit features
- [ ] Register Guardian in ResearchModule
- [ ] Inject Guardian into WebResearchService
- [ ] Wire up incident logging in error handlers
- [ ] Create Guardian endpoints in controller
- [ ] Dashboard integration (Prioridad 3)
- [ ] Real-time health monitoring
- [ ] Alert system (if critical incidents)

---

**State:** READY FOR PROVIDERS

Once the 5 providers are implemented, Guardian will automatically start protecting them.
