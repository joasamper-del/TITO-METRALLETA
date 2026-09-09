# 🔧 Interactive Brokers Setup Guide

**Status:** Pre-implementation checklist  
**Estimated Time:** 8 hours total  
**Session:** N+1 (After current options infrastructure completion)

---

## 📋 PHASE 1: Account Setup (5 minutes)

### Step 1.1: Create IBKR Account

```
1. Go to: https://www.interactivebrokers.com
2. Sign up for PAPER TRADING account
3. Verification takes ~2 hours
4. No funding required (paper account)
```

**Required Info:**
- Email
- Phone number
- Proof of identity (ID/passport)
- Address

**Expected Result:**
```
Account ID: DU123456 (or similar)
Account Type: Paper Trading
Status: ACTIVE
```

### Step 1.2: Enable API Access

```
1. Login to IBKR account
2. Go to: Settings → API → Settings
3. Enable: "Enable API from this account"
4. Generate: API key (save securely)
5. Set permissions: Positions, Orders, Account
```

**Generate Credentials:**
- Account ID: `DU123456`
- API Key: `ghp_xxxx...` (GitHub-style token format)
- API Secret: (if required)

---

## 📝 PHASE 2: Credential Storage (10 minutes)

### Step 2.1: Update .env.local

Add to `.env.local`:

```ini
# Interactive Brokers (Paper Trading)
IBKR_ENABLED=false                    # Set to true when ready
IBKR_ACCOUNT_ID=DU123456             # Your account ID
IBKR_API_KEY=your_api_key_here       # From IBKR settings
IBKR_BASE_URL=https://api.ibkr.cloud # Default endpoint

# Feature Flags
OPTIONS_ENABLED=true
USE_IBKR_FOR_OPTIONS=false           # Enable after testing
```

### Step 2.2: Verify Credentials

```bash
# Test connection
node backend/test-ibkr-connection.js

# Expected output:
# ✅ IBKR credentials loaded
# ✅ Account information retrieved
# ✅ Paper trading enabled
```

---

## 🔌 PHASE 3: IBKR Adapter Integration (2 hours)

### Step 3.1: Complete IBKrAdapter Implementation

**Currently:** Skeleton code exists  
**Needed:** Full authentication + order execution

```typescript
// File: backend/strategyLibrary/execution/ibkrAdapter.ts

Areas to implement:
├─ OAuth token exchange
├─ API connection pooling
├─ Multi-leg order API calls
├─ Error handling & retry logic
├─ Greeks data fetching
└─ Position management
```

### Step 3.2: Add IBKR Authentication

```typescript
// New file: backend/strategyLibrary/execution/ibkrAuth.ts

// Implement:
class IBKrAuth {
  async getAccessToken()        // OAuth flow
  async refreshToken()          // Token refresh
  async validateCredentials()   // Verify access
  async setAccountContext()     // Set active account
}
```

### Step 3.3: Implement Order Execution

```typescript
// Extend IBKrAdapter with:

async placeOrder() {
  // Convert multi-leg order
  // Send to IBKR API
  // Handle responses
  // Track order status
}

async getGreeks() {
  // Fetch real Greeks from IBKR
  // Cache for 60 seconds
  // Return: {delta, gamma, theta, vega, rho}
}
```

---

## 🧪 PHASE 4: Testing (2 hours)

### Step 4.1: Unit Tests

```bash
npm test -- ibkrAdapter.test.ts
# Target: 20+ tests covering auth, orders, Greeks
```

**Test Cases:**
- ✅ OAuth token exchange
- ✅ Order placement validation
- ✅ Multi-leg spread orders
- ✅ Greeks calculation
- ✅ Error handling
- ✅ Paper trading mode

### Step 4.2: Integration Tests

```bash
# Test with actual IBKR paper account
node backend/test-ibkr-integration.js

# Expected:
# ✅ Account connected
# ✅ Can fetch positions
# ✅ Can fetch options chains
# ✅ Order validation passes
```

### Step 4.3: BearPutSpreadStrategy Test

```bash
# Execute actual put spread on paper trading
node backend/test-ibkr-bear-put.js

# Expected:
# ✅ Order submitted to IBKR
# ✅ Order filled in paper account
# ✅ Position tracked
# ✅ Greeks displayed
```

---

## 🎯 PHASE 5: Broker Router Integration (2 hours)

### Step 5.1: Update ExecutionEngine

```typescript
// Modify: backend/strategyLibrary/execution/executionEngine.ts

// Replace stub routing with smart broker selection:
async executeStrategy(strategy: string) {
  // Detect strategy type
  const isOptionsStrategy = ["BearPutSpreadStrategy", "WheelStrategy"].includes(strategy);
  
  if (isOptionsStrategy) {
    if (!env.IBKR_ENABLED) {
      return this.queueForIBKR(strategy);
    }
    return this.ibkr.placeBearPutSpread(...);  // ✅ Use IBKR
  }
  
  return this.alpaca.placeOCOOrder(...);  // ✅ Use Alpaca
}
```

### Step 5.2: Add Fallback Logic

```typescript
// If IBKR is down, fallback to Alpaca
async executeWithFallback(strategy: string) {
  try {
    if (isOptionsStrategy) {
      return await this.ibkr.execute(...);
    }
  } catch (error) {
    console.warn("IBKR failed, using Alpaca...");
    return await this.alpaca.execute(...);
  }
}
```

### Step 5.3: Update Feature Flags

```ini
# .env.local
OPTIONS_ENABLED=true          # Enable options
IBKR_ENABLED=true             # Use IBKR adapter
IBKR_FALLBACK_TO_ALPACA=true  # Fallback if IBKR down
```

---

## ✅ VALIDATION CHECKLIST

### Pre-Implementation
- [ ] IBKR paper account created
- [ ] API credentials generated
- [ ] .env.local configured
- [ ] Credentials tested
- [ ] Git branch created (feature/ibkr-integration)

### Implementation Phase
- [ ] IBKrAuth class implemented
- [ ] OAuth token exchange working
- [ ] placeOrder() fully implemented
- [ ] getGreeks() integrated
- [ ] Error handling complete

### Testing Phase
- [ ] Unit tests: 20+ PASS
- [ ] Integration tests: ALL PASS
- [ ] Live paper order: EXECUTED
- [ ] Greeks validation: CORRECT
- [ ] Position tracking: WORKING

### Integration Phase
- [ ] ExecutionEngine routing updated
- [ ] Fallback logic working
- [ ] Feature flags configured
- [ ] BearPutSpreadStrategy tested with IBKR
- [ ] WheelStrategy tested with IBKR

### Documentation
- [ ] README updated with IBKR setup
- [ ] API docs documented
- [ ] Error codes catalogued
- [ ] Troubleshooting guide created

---

## 📊 IMPLEMENTATION TIMELINE

```
Session N+1 (8 hours total):

Hour 1:    Phase 1 (Account Setup) + Phase 2 (Credentials)
Hour 2-3:  Phase 3 (IBKrAdapter Implementation)
Hour 4-5:  Phase 4 (Testing)
Hour 6-7:  Phase 5 (Broker Router)
Hour 8:    Final validation + documentation

RESULT: BearPutSpreadStrategy fully operational with IBKR ✅
```

---

## 🔍 TROUBLESHOOTING

### Common Issues

#### "Invalid API Key"
```
Solution:
1. Verify API key copied correctly (no spaces)
2. Check API key hasn't expired
3. Re-generate key in IBKR settings
4. Verify account hasn't been locked
```

#### "Account not found"
```
Solution:
1. Verify account ID format (DU123456)
2. Check account is ACTIVE
3. Verify API is enabled for this account
4. Re-authenticate
```

#### "Order rejected"
```
Solution:
1. Verify strike prices are valid
2. Check option chain exists
3. Validate expiration date
4. Check buying power
5. Verify paper trading mode
```

#### "Greeks data unavailable"
```
Solution:
1. Verify option exists in chain
2. Check data feed subscription
3. Wait for data cache refresh (60s)
4. Fall back to Black-Scholes estimate
```

---

## 🚀 SUCCESS CRITERIA

Session N+1 is complete when:

```
✅ IBKR account: CREATED & ACTIVE
✅ API access: WORKING
✅ IBKrAdapter: FULLY IMPLEMENTED
✅ Tests: 20+ PASS
✅ Live order: EXECUTED on paper
✅ Greeks: REAL DATA retrieved
✅ BearPutSpreadStrategy: LIVE on IBKR
✅ Documentation: COMPLETE
✅ Git: MERGED to main
```

---

## 📞 REFERENCE LINKS

- **IBKR Signup:** https://www.interactivebrokers.com
- **IBKR API Docs:** https://ibkr-docs.cloud.ibkr.com
- **IBKR OAuth:** https://ibkr-docs.cloud.ibkr.com/auth/
- **Options API:** https://ibkr-docs.cloud.ibkr.com/trading/options/

---

## 🎯 NEXT IMMEDIATE STEPS

**Before Session N+1:**
1. Signup for IBKR paper account (2 hours)
2. Wait for approval email
3. Enable API access
4. Generate credentials
5. Update .env.local
6. Test connection

**At Start of Session N+1:**
1. Read this entire guide
2. Create branch: `feature/ibkr-integration`
3. Begin Phase 3 implementation
4. Run tests as you go
5. Target: 8 hours completion

---

**📌 Status: READY FOR NEXT SESSION**

All prerequisites documented. Ready to execute when you are.
