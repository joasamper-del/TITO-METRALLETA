# Phase 1: Centralizar Credenciales — REGLAS Y ARQUITECTURA

**Date:** 2026-09-09  
**Phase:** 1 of 6  
**Status:** APPROVAL REQUIRED BEFORE EXECUTION  

---

## 🎯 OBJETIVO PHASE 1

Crear una interfaz central única para todas las credenciales. **Cero cambios de comportamiento.** Alpaca y todos los demás siguen funcionando exactamente igual.

---

## 🚨 REGLAS NO NEGOCIABLES

### Regla 1: NO BORRES
- ✓ Crearás carpeta nueva `backend/src/config/credentials/`
- ✓ Mirarás el código existente (Alpaca, MarketSnack, etc.)
- ✗ NO borraes nada hasta que FUNCIONE exactamente igual

### Regla 2: NO MUESTRES SECRETOS
- ✗ Nunca escripas credenciales en chat
- ✗ Nunca loguees valores de keys (solo "loaded: ✓" o "missing: ✗")
- ✓ Solo nombres de credenciales (ALPACA_API_KEY, not value)

### Regla 3: MANTÉN ALPACA FUNCIONANDO
- ✓ Después de Phase 1, `alpacaAdapter.ts` sigue funcionando sin cambios
- ✓ Las pruebas de Alpaca siguen pasando
- ✗ Si algo falla, revertir inmediatamente

### Regla 4: ARQUITECTURA PRIMERO
- ✓ Diseño debe ser aprobado por el usuario ANTES de escribir código
- ✓ Interfaces TypeScript definidas
- ✓ Cero migración de credenciales hasta que architecture se apruebe

### Regla 5: FALLA SEGURA
- ✓ Si falta credencial: error CLARO (no silencioso)
- ✓ Error debe mencionar qué credencial falta y dónde buscar
- ✗ Nunca improvisar con defaults o valores null

### Regla 6: REGISTRA TIPO DE AUTH
- ✓ Cada credencial declara: `type: 'static_key' | 'oauth2' | 'cookie' | 'bearer'`
- ✓ Cada credencial declara: `scope: 'flow' | 'orders' | 'positions' | 'market_data'`
- ✓ Validar consistencia

---

## 📐 ARQUITECTURA PROPUESTA

### Folder Structure

```
backend/src/config/credentials/
├── index.ts                      ← Export CredentialManager
├── types.ts                      ← Interfaces
├── manager.ts                    ← CredentialManager class
├── brokers/
│   ├── alpaca.broker.ts          ← Alpaca config
│   ├── massive.broker.ts         ← Massive config
│   ├── marketsnack.broker.ts     ← MarketSnack config
│   ├── schwab.broker.ts          ← Schwab config
│   ├── newsapi.broker.ts         ← NewsAPI config
│   ├── fred.broker.ts            ← FRED config
│   ├── tradingview.broker.ts     ← TradingView config
│   └── ibkr.broker.ts            ← IBKR (future)
└── utils/
    ├── validation.ts             ← Validate credentials
    ├── errors.ts                 ← Error messages
    └── logger.ts                 ← Audit logging
```

### Types Definitions

```typescript
// types.ts

export type AuthType = 'static_key' | 'oauth2' | 'cookie' | 'bearer' | 'client_credentials';
export type Scope = 'flow' | 'orders' | 'positions' | 'market_data' | 'news' | 'alerts';

export interface BrokerCredential {
  id: string;                              // 'alpaca', 'massive', etc.
  name: string;                            // Display name
  authType: AuthType;                      // How it authenticates
  scopes: Scope[];                         // What it can access
  endpoints: {
    trading?: string;
    marketData?: string;
    [key: string]: string | undefined;
  };
  requiredFields: string[];                // ['ALPACA_API_KEY', 'ALPACA_SECRET_KEY']
  optionalFields?: string[];               // Fields that may not be present
  isConfigured: boolean;                   // All required fields loaded?
  error?: string;                          // Why not configured (if isConfigured = false)
}

export interface CredentialStore {
  [brokerId: string]: {
    data: Record<string, string>;          // {ALPACA_API_KEY: '...', ALPACA_SECRET_KEY: '...'}
    credential: BrokerCredential;
    loadedAt: Date;
    expiresAt?: Date;                      // For OAuth tokens
  };
}

export interface CredentialManager {
  // Load all from .env
  load(): Promise<void>;
  
  // Get credential by broker id
  get(brokerId: string): BrokerCredential;
  
  // Get raw secret (only internally, never expose)
  getSecret(brokerId: string, fieldName: string): string | null;
  
  // Validate all on startup
  validate(): ValidationResult;
  
  // Report what's configured
  status(): StatusReport;
}

export interface ValidationResult {
  isValid: boolean;
  errors: {
    brokerId: string;
    fieldName: string;
    error: string;
  }[];
  warnings: {
    brokerId: string;
    warning: string;
  }[];
}

export interface StatusReport {
  timestamp: Date;
  brokers: {
    id: string;
    configured: boolean;
    error?: string;
    authType: AuthType;
    scopes: Scope[];
  }[];
}
```

### Manager Implementation Pattern

```typescript
// manager.ts (pseudocode, not full implementation)

export class CredentialManager {
  private store: CredentialStore = {};
  private brokers: BrokerCredential[] = [];

  constructor() {
    this.registerBroker(AlpacaBroker);
    this.registerBroker(MassiveBroker);
    this.registerBroker(MarketSnackBroker);
    this.registerBroker(SchwabBroker);
    // etc.
  }

  async load(): Promise<void> {
    // Read from process.env
    // For each registered broker, load its required fields
    // If field missing: set isConfigured = false, error = message
    // NEVER crash here
  }

  validate(): ValidationResult {
    const errors = [];
    const warnings = [];
    
    for (const broker of this.brokers) {
      // Check all required fields present
      // Check all fields have non-empty values
      // Check auth type consistency
      // Report clearly what's missing
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  get(brokerId: string): BrokerCredential {
    const entry = this.store[brokerId];
    if (!entry) {
      throw new CredentialNotFoundError(`Broker ${brokerId} not configured`);
    }
    if (!entry.credential.isConfigured) {
      throw new CredentialMissingError(
        `Broker ${brokerId}: missing ${entry.credential.requiredFields.join(', ')}. ` +
        `Add them to .env.local and restart.`
      );
    }
    return entry.credential;
  }

  // INTERNAL ONLY — never exposed
  private getSecret(brokerId: string, fieldName: string): string {
    const entry = this.store[brokerId];
    if (!entry?.data[fieldName]) {
      throw new CredentialFieldMissingError(
        `${brokerId}.${fieldName} not configured`
      );
    }
    return entry.data[fieldName];
  }

  status(): StatusReport {
    return {
      timestamp: new Date(),
      brokers: this.brokers.map(b => ({
        id: b.id,
        configured: b.isConfigured,
        error: b.error,
        authType: b.authType,
        scopes: b.scopes,
      })),
    };
  }
}
```

### Broker Config Example

```typescript
// brokers/alpaca.broker.ts

export const AlpacaBroker: BrokerCredential = {
  id: 'alpaca',
  name: 'Alpaca Paper Trading',
  authType: 'static_key',
  scopes: ['orders', 'positions', 'market_data'],
  endpoints: {
    trading: 'https://paper-api.alpaca.markets',
    marketData: 'https://data.alpaca.markets',
  },
  requiredFields: ['ALPACA_API_KEY', 'ALPACA_SECRET_KEY'],
  optionalFields: [],
  isConfigured: false,
  error: undefined,
};
```

### Usage in Code (After Phase 1)

```typescript
// Before (OLD):
const client = new AlpacaClient(
  process.env.ALPACA_API_KEY!,
  process.env.ALPACA_SECRET_KEY!
);

// After (NEW) — still works exactly the same:
const credMgr = Container.get(CredentialManager);
const alpaca = credMgr.get('alpaca');
const client = new AlpacaClient(
  credMgr.getSecret('alpaca', 'ALPACA_API_KEY'),
  credMgr.getSecret('alpaca', 'ALPACA_SECRET_KEY')
);

// Or even simpler (if we add factory):
const client = Container.get(AlpacaClient);  // Already injected with credentials
```

---

## ✅ PHASE 1 DELIVERABLES

### Code (New)
- ✓ `backend/src/config/credentials/index.ts` (export manager)
- ✓ `backend/src/config/credentials/types.ts` (interfaces)
- ✓ `backend/src/config/credentials/manager.ts` (main class)
- ✓ `backend/src/config/credentials/brokers/*.ts` (7 broker configs)
- ✓ `backend/src/config/credentials/utils/validation.ts` (startup check)
- ✓ `backend/src/config/credentials/utils/errors.ts` (error classes)

### Code (Modified — MINIMAL)
- ✓ `backend/src/app.module.ts` — register CredentialManager provider (1 line)
- ✓ `backend/scripts/startup.ts` (or similar) — call `credMgr.validate()` on boot (2 lines)

### Code (NOT TOUCHED)
- ✗ `alpacaAdapter.ts` (no changes, still works)
- ✗ `alpacaClient.ts` (no changes, still works)
- ✗ `app/api/flow/route.ts` (no changes, still works)
- ✗ All other existing code

### .env Files
- ✓ NO changes to `.env.local` files (read same keys)
- ✓ Optionally add `.env.example` notes (for future)

### Tests
- ✓ `backend/src/config/credentials/manager.test.ts` (unit tests)
  - Mock credential load
  - Test validation (missing field)
  - Test validation (all present)
  - Test status reporting
  - Test error messages

### Documentation
- ✓ `PHASE1_CENTRAL_CREDENTIALS_DESIGN.md` (this file)
- ✓ Add comments to CredentialManager explaining each method

---

## 🔄 EXECUTION STEPS (When Approved)

### Step 1: Create Folder & Types (30 min)
```bash
mkdir -p backend/src/config/credentials/{brokers,utils}
# Create: types.ts, errors.ts
```

### Step 2: Implement Manager (1 hour)
```bash
# Create: manager.ts (main class)
# Implement: load(), get(), validate(), status()
```

### Step 3: Register Brokers (30 min)
```bash
# Create: brokers/*.ts (7 files)
# Each file: static config + required/optional fields
```

### Step 4: Validation Utils (30 min)
```bash
# Create: utils/validation.ts (check required fields)
# Create: utils/logger.ts (audit log)
```

### Step 5: DI Setup (15 min)
```bash
# Edit: app.module.ts (register CredentialManager)
# Edit: startup script (call validate())
```

### Step 6: Test (1 hour)
```bash
# Create: manager.test.ts (comprehensive tests)
# Run: npm test -- credentials
# All tests PASS
```

### Step 7: Verify Alpaca Still Works (15 min)
```bash
# Run: npm test -- alpacaAdapter.test.ts
# Verify: All Alpaca tests still PASS
```

### Step 8: Commit (5 min)
```bash
git add backend/src/config/credentials/
git commit -m "feat(credentials): centralize all API credentials — Phase 1

- CredentialManager loads from .env
- 7 brokers registered with auth type & scope
- Validation on startup (fail-safe)
- Alpaca, Massive, MarketSnack, Schwab, NewsAPI, FRED, TradingView
- Zero changes to existing code
- All tests pass

No credential movement yet — just new manager in place."
```

---

## 📋 APPROVAL CHECKLIST

Before we proceed, confirm:

- [ ] Understand the architecture (manager + brokers + utils)
- [ ] Agree with rules (no delete, no secrets in chat, keep Alpaca working)
- [ ] Agree with folder structure
- [ ] Agree with Phase 1 scope (manager only, no credential movement)
- [ ] Agree with delivery: ~4 hours, 7 new files, 1 modified file (app.module.ts)
- [ ] Ready to proceed when all confirmations are done

---

## ⚠️ IF YOU DON'T APPROVE

If anything in this design doesn't work for you:

- [ ] What should change?
- [ ] What concerns do you have?
- [ ] What would make you comfortable?

**We will NOT touch any credentials or code until you explicitly say "approved".**

---

**Status:** ⏳ WAITING FOR YOUR APPROVAL

When ready, reply: **"Apruebo Phase 1. Procede."** and we start immediately.
