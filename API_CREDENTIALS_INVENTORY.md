# 🔍 API Credentials & Libraries Inventory

**Date:** 2026-09-09  
**Objective:** Map all credential locations before building central library  
**Status:** DISCOVERY PHASE (no changes yet)

---

## 📍 CURRENT CREDENTIAL LOAD LOCATIONS

### 1. Alpaca Paper Trading

**Location:** `.env.local` files (root + backend)

```
Root:  ./.env.local
├─ ALPACA_API_KEY=PKZJACBLG2RGWLHBJSCXHXXYZB
└─ ALPACA_SECRET_KEY=DqcYBAACZjCzJ6YSWbLBAczi5aRJ4ddu8Azkv2KrxUH6

Backend: ./Agente Tito Metralleta/backend/.env.local
└─ (same credentials)
```

**Loaded By:**
- `backend/src/integrations/alpaca/alpaca.client.ts` (constructor)
- AlpacaClient class:
  ```typescript
  // Line 17-20
  constructor(apiKey: string, apiSecret: string, baseUrl: string = '...') {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    // Used to create axios headers (lines 28, 38)
  }
  ```

**Endpoints:**
- Trading API: `https://paper-api.alpaca.markets`
- Market Data API: `https://data.alpaca.markets`

**Used By:**
- `alpacaAdapter.ts` (main trading adapter)
- `alpacaOptionsAdapter.ts` (options orders)
- Data fetching services
- Crypto execution manager
- Backtest framework

---

### 2. Massive (Polygon.io)

**Location:** `.env.local` (`web/.env.local` for Next.js)

```
web/.env.local
└─ MASSIVE_API_KEY=<server-only, never exposed to client>
```

**Loaded By:**
- Next.js server (app/api/* routes)
- `lib/marketsnack.ts` (client-side fetches)

**Endpoints:**
- Option Chain: `GET /v3/snapshot/options/{ticker}`
- Stock Snapshot: `GET /v2/snapshot/locale/us/markets/stocks/tickers/{ticker}`
- Historical Bars: `GET /v2/aggs/ticker/{ticker}/range/...`

**Used By:**
- Web dashboard (Tito Metralleta web)
- Options flow analysis
- Backtesting
- 0DTE module (SPX intraday)

---

### 3. MarketSnack (Internal)

**Location:** `.env.local`

```
web/.env.local
└─ MARKETSNACK_COOKIE=<session auth, caduca>
```

**Loaded By:**
- `lib/marketsnack.ts` (client → app/api/flow/route.ts)

**Endpoints:**
- Flow Feed: `GET app.marketsnack.com/api/flow_feed?filter[scope]=all&filter[symbol][]=...`

**Used By:**
- Time & Sales data (aggressive buyer/seller tracking)
- Option flow classification (convicción, inusualidad)

---

### 4. Charles Schwab (0DTE Module)

**Location:** `.env.local`

```
web/.env.local
├─ SCHWAB_CLIENT_ID=<OAuth 2.0 client id>
└─ SCHWAB_CLIENT_SECRET=<OAuth 2.0 secret>
```

**Loaded By:**
- `lib/schwab.ts` (0DTE module only)
- OAuth2 client_credentials flow

**Endpoints:**
- Option Chain: proprietary API
- Ranked by volume (for 0DTE)

**Used By:**
- 0DTE strategy (SPX intradía)
- GEX calculation for day expiration

---

### 5. NewsAPI

**Location:** `.env.local`

```
web/.env.local
└─ NEWS_API_KEY=<NewsAPI.org key>
```

**Loaded By:**
- `backend/src/modules/research/providers/news-api.provider.ts`
- Guardian module

**Endpoints:**
- Headlines: `GET /v2/top-headlines`

**Used By:**
- Web research module (news panel)
- Decision context

---

### 6. TradingView Webhook

**Location:** `.env.local`

```
web/.env.local
└─ TRADINGVIEW_WEBHOOK_SECRET=<passphrase for verification>
```

**Loaded By:**
- `app/api/tradingview/route.ts` (POST handler)

**Used By:**
- Alert ingestion & verification
- Indicator context (RSI, ADX, SuperTrend)

---

### 7. FRED/St. Louis Federal Reserve

**Location:** `.env.local`

```
web/.env.local
└─ FRED_API_KEY=<VIX data, public API>
```

**Loaded By:**
- `lib/vixContext.ts` (regime scoring)

**Endpoints:**
- VIX data: `GET /api/series/VIXCLS`

**Used By:**
- Regime detection (equities)
- Market fear index

---

## 🗂️ DIRECTORY STRUCTURE TODAY

```
.
├── .env.local                          (Alpaca only)
├── .env.example                        (template)
├── Agente Tito Metralleta/
│   ├── backend/
│   │   ├── .env.local                  (Alpaca copy)
│   │   ├── .env.example
│   │   ├── src/
│   │   │   ├── integrations/alpaca/
│   │   │   │   ├── alpaca.client.ts    (AlpacaClient class)
│   │   │   │   └── alpaca.types.ts
│   │   │   ├── modules/research/
│   │   │   │   ├── providers/
│   │   │   │   │   ├── news-api.provider.ts
│   │   │   │   │   └── vix.provider.ts
│   │   │   │   └── guardians/
│   │   │   │       └── guardian-secret-masker.ts
│   │   │   └── app.module.ts           (imports all modules)
│   │   └── strategyLibrary/
│   │       ├── execution/
│   │       │   ├── alpacaAdapter.ts    (uses Alpaca)
│   │       │   ├── alpacaOptionsAdapter.ts
│   │       │   └── (other engines)
│   │       └── ...
│   └── web/
│       ├── .env.local                  (Massive, MarketSnack, Schwab, NewsAPI, etc.)
│       ├── .env.example
│       ├── lib/
│       │   ├── marketsnack.ts          (uses MARKETSNACK_COOKIE)
│       │   ├── schwab.ts               (uses SCHWAB_*)
│       │   ├── vixContext.ts           (uses FRED_API_KEY)
│       │   └── (other utilities)
│       ├── app/
│       │   ├── api/
│       │   │   ├── flow/route.ts       (SSE, uses MarketSnack)
│       │   │   ├── chain/route.ts      (uses Massive)
│       │   │   ├── tradingview/route.ts (uses TradingView secret)
│       │   │   └── (other routes)
│       │   └── (pages, components)
│       └── (other Next.js config)
```

---

## 🚨 PROBLEMS IDENTIFIED

### 1. **Scattered Across Multiple .env Files**
- Root `.env.local`: Alpaca only
- `backend/.env.local`: Alpaca (duplicate)
- `web/.env.local`: All others (Massive, MarketSnack, Schwab, NewsAPI, FRED, TradingView)
- ❌ No single source of truth

### 2. **Inconsistent Load Patterns**
- Alpaca: Constructor injection (AlpacaClient)
- Massive: Process.env in route handlers
- MarketSnack: Cookie-based session
- Schwab: OAuth2 client_credentials
- NewsAPI: Direct process.env
- FRED: Direct process.env
- TradingView: Direct process.env
- ❌ No unified pattern

### 3. **No Credential Validation Layer**
- Missing credentials fail at runtime in different places
- No central validation on startup
- No health check for connectivity
- ❌ Errors opaque to user

### 4. **Hard to Add New Brokers**
- IBKR will need: OAuth token endpoint, API key storage, refresh logic
- No standard place to add new credentials
- No migration path
- ❌ Will repeat the mess

### 5. **Secret Management Risk**
- `.env.local` files gitignored but easy to accidentally commit
- MarketSnack cookie caduca without notification
- No rotation/expiry tracking
- No audit trail of credential usage
- ❌ Security gaps

### 6. **No Credential Scoping**
- All code can see all credentials
- No "least privilege" (e.g., MarketSnack flow only needs flow feed, not positions)
- ❌ Attack surface too large

---

## 📋 WHAT NEEDS TO EXIST (Central Library)

```typescript
// CredentialManager — single source of truth
├── Load (from ENV, file, secure store)
├── Validate (on startup, per broker)
├── Refresh (tokens, sessions)
├── Scope (per module: flow, orders, positions)
├── Audit (log credential usage)
└── Rotate (key expiry, manual refresh)

// Per-Broker Adapter
├── BrokerConfig (endpoints, auth method, scopes)
├── CredentialStore (load/refresh/rotate logic)
├── HealthCheck (verify connectivity)
└── ErrorHandler (clear messaging on failure)

// Modules register with:
├── Required credentials
├── Scopes (flow, orders, positions, etc.)
└── Fallback (if credential fails)
```

---

## 🎯 PLAN OUTLINE (TO IMPLEMENT S66+)

### Phase 1: Centralize (1-2 hours)
- Create `backend/src/config/credentials/`
- `CredentialManager` class (load, validate, scope)
- Migrate Alpaca → central manager
- Zero changes to behavior (same .env files)

### Phase 2: Unify Load Pattern (1-2 hours)
- Create `BrokerAdapter` base class
- Migrate Alpaca, Massive, MarketSnack, Schwab, NewsAPI, FRED
- Single pattern for all brokers

### Phase 3: Add Validation & Health (1 hour)
- Startup validation (missing credentials → clear error)
- Health check per broker (connectivity on app start)
- Credential expiry warnings

### Phase 4: Token Refresh & Rotation (1-2 hours)
- OAuth refresh handlers (Schwab, IBKR, TradingView)
- Automatic refresh on expiry
- Manual rotation command

### Phase 5: Audit & Scoping (1 hour)
- Log credential access
- Per-module scoping (flow reader can't touch positions)
- Deny unknown credentials at registration

### Phase 6: Integrate IBKR (1 hour)
- Register IBKR with central manager
- Automatic OAuth refresh
- Health check for paper mode

---

## 📊 EFFORT ESTIMATE

```
Phase 1 (Centralize):     2 hours  ✓ No risk (backward compat)
Phase 2 (Unify):          2 hours  ✓ No behavior change
Phase 3 (Validate):       1 hour   ✓ Early error detection
Phase 4 (Refresh):        2 hours  ✓ Reliability improvement
Phase 5 (Audit/Scope):    1 hour   ✓ Security improvement
Phase 6 (IBKR):           1 hour   ✓ Ready to go

TOTAL:                    9 hours
```

---

## 🔑 KEY DECISIONS

### Single .env or Multiple?
- **Recommendation:** Keep separate (root for secrets, web/ for app config)
- **Reason:** Alpaca (backend only) vs Massive (frontend). Clear separation.

### Runtime or Startup Validation?
- **Recommendation:** Startup + periodic health checks
- **Reason:** Fail fast, detect credential issues before trading

### Constructor Injection or Service Locator?
- **Recommendation:** Service Locator (CredentialManager.get())
- **Reason:** Dynamic credential refresh, easier testing, DI overkill

### Credential Rotation Strategy?
- **Recommendation:** Manual rotation + automatic refresh (OAuth)
- **Reason:** Secure but not over-engineered (no key rotation for static keys)

---

## ✅ NO CHANGES YET

✓ This is inventory only  
✓ No code moved  
✓ No borres anything  
✓ Ready for user approval to proceed to Phase 1

---

**Next:** Review this inventory. Approve plan. Proceed to Phase 1 (Centralize) in S66+
