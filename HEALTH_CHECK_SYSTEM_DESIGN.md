# 🏥 Health Check System — DISEÑO ANTES DE PHASE 2

**Date:** 2026-09-09  
**Purpose:** Credential + Connection health verification before ANY market operation  
**Status:** ⏳ AWAITING APPROVAL BEFORE IMPLEMENTATION

---

## 🎯 OBJETIVO

Garantizar que Tito NUNCA llega al mercado con una fuente crítica sin credenciales o sin conexión. Preflight check obligatorio en cada sesión operativa.

**Regla permanente:** 
```
operación_de_mercado() {
  PREFLIGHT_CHECK();  // ← OBLIGATORIO
  if (fuente_crítica.salud === ROJO) {
    ABORTAR_OPERACIÓN("fuente X no disponible");
    REPORTAR_EXACTAMENTE_QUÉ_FALLÓ;
    return;  // ← Nunca improvisar
  }
  proceder_a_operar();
}
```

---

## 📊 SISTEMA DE SALUD (4 Estados)

### 🟢 VERDE = LISTO
```
✓ Credenciales configuradas
✓ Conexión verificada
✓ Token válido (no expira pronto)
✓ Responde a health check
```
**Acción:** Proceder normalmente

### 🟡 AMARILLO = ATENCIÓN REQUERIDA
```
⚠ Token expira en < 24h
⚠ Última conexión fue hace > 1h
⚠ Conexión lenta (latencia > 5s)
⚠ Cuota próxima a límite
```
**Acción:** Log warning, permitir operación pero registrar, preparar refresh

### 🔴 ROJO = BLOQUEADO
```
✗ Credenciales faltando
✗ Conexión rechazada (401/403/500)
✗ Token expirado
✗ No hay respuesta
✗ Quota exceeded
```
**Acción:** ABORTAR operación, reportar exactamente qué falló

### ⚪ GRIS = DESCONOCIDO
```
? Fuente no configurada todavía
? Verificación nunca ejecutada
? Estado pendiente
```
**Acción:** Registrar como no verificada, requiere acción del usuario

---

## 🏗️ ARQUITECTURA

### Folder Structure

```
backend/src/config/credentials/
├── health/
│   ├── index.ts
│   ├── types.ts                      ← HealthStatus, HealthResult
│   ├── checker.ts                    ← HealthChecker class
│   ├── checks/
│   │   ├── alpaca.check.ts           ← Alpaca-specific checks
│   │   ├── massive.check.ts
│   │   ├── schwab.check.ts
│   │   ├── etc.
│   │   └── index.ts
│   ├── reporter.ts                   ← HealthReport class
│   └── health.service.ts             ← NestJS service
├── manager.ts                        ← Updated: integrate health checks
└── ...
```

### Type Definitions

```typescript
// health/types.ts

export type HealthStatus = 'green' | 'yellow' | 'red' | 'gray';

export interface HealthCheck {
  id: string;                           // 'alpaca_creds', 'alpaca_conn', etc.
  broker: string;                       // 'alpaca'
  checkName: string;                    // 'Credentials', 'Connection', 'Token'
  status: HealthStatus;
  message: string;                      // Human-readable
  lastChecked: Date;
  nextCheck?: Date;
}

export interface HealthResult {
  timestamp: Date;
  overallStatus: HealthStatus;          // RED if any CRITICAL is RED
  checks: HealthCheck[];
  blockedSources: string[];             // ['alpaca', ...] if RED
  readyToOperate: boolean;              // true only if no RED critical
  report: string;                       // Formatted for display
}

export interface HealthCheckConfig {
  id: string;
  broker: string;
  critical: boolean;                    // If RED, block operations?
  interval: number;                     // Check every N seconds
  timeout: number;                      // Fail if check takes > N ms
  checker: () => Promise<HealthStatus>;
}
```

### Health Checker Implementation

```typescript
// health/checker.ts

export class HealthChecker {
  private checks: Map<string, HealthCheckConfig> = new Map();
  private lastResults: Map<string, HealthCheck> = new Map();

  register(config: HealthCheckConfig): void {
    this.checks.set(config.id, config);
  }

  async checkAll(): Promise<HealthResult> {
    const results: HealthCheck[] = [];
    
    for (const [id, config] of this.checks) {
      try {
        const status = await Promise.race([
          config.checker(),
          this.timeout(config.timeout)
        ]);

        results.push({
          id: config.id,
          broker: config.broker,
          checkName: config.id.split('_')[1],
          status,
          message: this.statusToMessage(status),
          lastChecked: new Date(),
        });
      } catch (error) {
        results.push({
          id: config.id,
          broker: config.broker,
          checkName: config.id.split('_')[1],
          status: 'red',
          message: `Check failed: ${error.message}`,
          lastChecked: new Date(),
        });
      }
    }

    // Determine overall status
    const criticalRed = results
      .filter(r => r.status === 'red' && this.isCritical(r.id))
      .map(r => r.broker);

    const overallStatus = criticalRed.length > 0 ? 'red' : 
                         results.some(r => r.status === 'yellow') ? 'yellow' : 'green';

    return {
      timestamp: new Date(),
      overallStatus,
      checks: results,
      blockedSources: criticalRed,
      readyToOperate: overallStatus !== 'red',
      report: this.formatReport(results, criticalRed),
    };
  }

  private statusToMessage(status: HealthStatus): string {
    switch (status) {
      case 'green': return '✓ Healthy';
      case 'yellow': return '⚠ Warning (refresh soon)';
      case 'red': return '✗ Failed (blocked)';
      case 'gray': return '? Unknown';
    }
  }

  private formatReport(checks: HealthCheck[], blocked: string[]): string {
    let report = '';
    
    // Group by broker
    const byBroker = new Map<string, HealthCheck[]>();
    for (const check of checks) {
      if (!byBroker.has(check.broker)) byBroker.set(check.broker, []);
      byBroker.get(check.broker)!.push(check);
    }

    for (const [broker, brokerChecks] of byBroker) {
      const emoji = blocked.includes(broker) ? '🔴' : 
                    brokerChecks.some(c => c.status === 'yellow') ? '🟡' : '🟢';
      report += `\n${emoji} ${broker}\n`;
      
      for (const check of brokerChecks) {
        report += `   ${check.status === 'green' ? '✓' : check.status === 'red' ? '✗' : '⚠'} ${check.checkName}: ${check.message}\n`;
      }
    }

    return report;
  }

  private isCritical(checkId: string): boolean {
    const config = this.checks.get(checkId);
    return config?.critical ?? true;
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Check timeout')), ms)
    );
  }
}
```

### Preflight Hook

```typescript
// health/preflight.guard.ts

export class PreflightGuard {
  constructor(
    private credentialMgr: CredentialManager,
    private healthChecker: HealthChecker,
  ) {}

  async verify(): Promise<void> {
    // Validate credentials first
    const credResult = this.credentialMgr.validate();
    if (!credResult.isValid) {
      throw new PreflightError(
        `Missing credentials: ${credResult.errors.map(e => e.message).join(', ')}`
      );
    }

    // Then check health
    const healthResult = await this.healthChecker.checkAll();
    
    if (!healthResult.readyToOperate) {
      throw new PreflightError(
        `Blocked sources: ${healthResult.blockedSources.join(', ')}\n${healthResult.report}`
      );
    }

    console.log(healthResult.report);  // Show status
  }
}

// Usage in trading operation:
export async function startTrading(userId: string) {
  const preflight = new PreflightGuard(credMgr, healthChecker);
  
  try {
    await preflight.verify();  // ← OBLIGATORIO
  } catch (error) {
    logger.error(`Preflight failed: ${error.message}`);
    // ABORT — never proceed
    return { success: false, reason: error.message };
  }

  // Proceed with trading...
}
```

---

## ✅ SPECIFIC CHECKS PER BROKER

### Alpaca
- **Credentials** (critical=true): API key + secret configured
- **Connection** (critical=true): Can reach paper-api.alpaca.markets
- **Account** (critical=false): Can fetch account info (validates auth)
- **Token** (critical=false): Check if token expires in < 24h

### Massive
- **Credentials** (critical=true): API key configured
- **Connection** (critical=true): Can reach api.massive.com
- **RateLimit** (critical=false): Calls remaining > 100

### Schwab
- **Credentials** (critical=true): Client ID + secret configured
- **OAuth** (critical=true): Can get access token
- **Token** (critical=false): Expires in > 1h

### NewsAPI, FRED, TradingView
- **Credentials**: API key configured
- **Connection**: Can reach endpoint
- **RateLimit** (if applicable): Quota not exceeded

---

## 📈 UI/Logging Display

### Console Output Example

```
🏥 PREFLIGHT CHECK
═══════════════════════════════════════════════════════════════

🟢 alpaca
   ✓ Credentials: configured
   ✓ Connection: OK (22ms)
   ✓ Account: DU123456 ($100,500 equity)
   ⚠ Token: Expires in 23h (refresh recommended)

🟢 massive
   ✓ Credentials: configured
   ✓ Connection: OK (145ms)
   ⚠ RateLimit: 4,500 / 5,000 calls remaining

🟡 schwab
   ⚠ Token: Expires in 2h (refresh SOON)
   ✓ Connection: OK
   ✓ OAuth: Valid

🟡 tradingview
   ⚠ Webhook: No tests in last 24h (may be inactive)

🔴 marketsnack
   ✗ Credentials: MISSING (MARKETSNACK_COOKIE not configured)
   ✗ BLOCKED: Cannot proceed without MarketSnack flow data

═══════════════════════════════════════════════════════════════
❌ READY TO OPERATE: FALSE

Blocked sources: marketsnack

Action: Configure MARKETSNACK_COOKIE and retry.
```

---

## 🔄 INTEGRATION WITH CREDENTIALMANAGER

CredentialManager **already has** validators. HealthChecker **adds connectivity**.

```
┌─────────────────────────────────────────┐
│ PREFLIGHT CHECK (before market open)    │
├─────────────────────────────────────────┤
│                                         │
│ 1. CredentialManager.validate()         │
│    └─ Are fields present? (gray check)  │
│                                         │
│ 2. HealthChecker.checkAll()             │
│    ├─ Connection test                   │
│    ├─ Token expiry check                │
│    ├─ Rate limit check                  │
│    └─ Account access check              │
│                                         │
│ 3. PreflightGuard.verify()              │
│    └─ Aggregate & report                │
│                                         │
│ IF blocked_sources.length > 0:          │
│    ABORT & REPORT EXACTLY WHAT FAILED   │
│ ELSE:                                   │
│    PROCEED TO MARKET                    │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📋 FILES TO CHANGE (Phase 2 prep)

**New Files (Health System):**
```
backend/src/config/credentials/health/
├── types.ts
├── checker.ts
├── reporter.ts
├── health.service.ts
├── preflight.guard.ts
└── checks/
    ├── alpaca.check.ts
    ├── massive.check.ts
    ├── schwab.check.ts
    ├── etc.
    └── index.ts
```

**Modified Files:**
```
backend/src/app.module.ts
  └─ Register HealthChecker service

backend/src/config/credentials/manager.ts
  └─ Add getHealth() method

backend/strategyLibrary/execution/start.autonomous.operation.ts
  └─ Call preflight before market operations

backend/src/modules/core/core.module.ts
  └─ Import/expose health checker
```

---

## 🎯 APPROVAL CHECKLIST

Before Phase 2, confirm:

- [ ] Understand 4-state system (green/yellow/red/gray)
- [ ] Agree with critical vs non-critical checks
- [ ] Agree that RED + CRITICAL = ABORT operation
- [ ] Agree with preflight before market operations
- [ ] Agree with console report format (or suggest changes)
- [ ] Ready to implement health checks per broker

---

## 🚫 THIS IS NOT PHASE 2 YET

This is **DESIGN REVIEW ONLY**. No code written, no checks implemented.

When you approve this design, I will:
1. Show you how it integrates with Phase 1 code
2. Implement health checks for each broker
3. Wire up preflight guard
4. Test everything

---

## 📝 QUESTIONS FOR APPROVAL

1. **Check frequency:** How often should health checks run?
   - Once on startup? ✓
   - Every 5 min? Every 30 min?
   
2. **Non-critical sources:** If NewsAPI fails (red), should Tito still operate?
   - Yes (proceed) or No (abort)?

3. **Token refresh:** When token is YELLOW (expiring soon), should Tito:
   - Auto-refresh? Warn but proceed? Abort?

4. **Logging:** Should health status be logged to file for audit trail?

---

**Status:** ⏳ WAITING FOR YOUR APPROVAL OF THIS DESIGN

When ready, reply: **"Apruebo diseño Health Check. Procede a Phase 2."** and I'll integrate it with the credentials manager.

---

This becomes a **permanent system rule:** Never operate without preflight verification. This prevents the Alpaca surprise from ever happening again.
