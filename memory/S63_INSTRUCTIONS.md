---
name: s63-instructions
description: S63 Live Validation - GOOGL case study with checklist adherence
metadata:
  type: project
---

# S63 INSTRUCTIONS - GOOGL LIVE VALIDATION

**Objetivo**: Comprobar que Tito puede investigar, decidir y actuar autónomamente con rigor real.

---

## PHASE 1: RESEARCH EXECUTION

Para ticket GOOGL, ejecutar análisis multi-fuente completo:

### Requerimientos de datos por fuente:
- [ ] **SEC/EDGAR**: P/E, EPS, Revenue (10-Q más reciente)
  - Tracking: source='sec-edgar', timestamp=NOW, freshness='LIVE'
  
- [ ] **Investor Relations**: Earnings date, guidance
  - Tracking: source='investor-relations', timestamp=NOW, freshness='LIVE'
  
- [ ] **Earnings Calendar**: Next earnings date
  - Tracking: source='earnings-calendar', timestamp=NOW, freshness='LIVE'
  
- [ ] **News (2+ sources)**: Recent news, sentiment
  - NewsAPI + MarketSnacks (if session active)
  - Tracking: source per article, timestamp, freshness
  
- [ ] **Market Data (Alpaca/Yahoo)**: Price, bid/ask, volume, market cap
  - Tracking: source='alpaca' or 'yahoo', timestamp=NOW, freshness='LIVE'
  
- [ ] **TradingView (when LIVE)**: RSI, ADX, SuperTrend
  - Tracking: source='tradingview', timestamp, freshness='LIVE'
  
- [ ] **VIX Context (FRED)**: Current VIX, regime
  - Tracking: source='fred-vixcls', timestamp, freshness='LIVE'

### Cada dato debe tener:
```
{
  value: <number or string>,
  source: "provider-name",
  timestamp: "ISO 8601",
  freshness: "LIVE|DELAYED|CACHED",
  confidence: 0-100
}
```

---

## PHASE 2: CROSS-VALIDATION

Mínimo 2 fuentes para datos críticos:

### Critical Data Points:
1. **P/E Ratio**
   - Source 1: SEC/EDGAR
   - Source 2: Yahoo Finance
   - If discrepancy > 5%: Log conflict, reduce confidence

2. **Latest Earnings Date**
   - Source 1: Earnings Calendar
   - Source 2: Investor Relations (if available)
   - If mismatch: Log conflict, reduce confidence

3. **Current Price**
   - Source 1: Alpaca
   - Source 2: Yahoo Finance
   - If delta > $0.02: Note and investigate

### Conflict Reporting:
```
{
  dataPoint: "P/E Ratio",
  primarySource: "sec-edgar",
  primaryValue: 25.5,
  secondarySource: "yahoo-finance",
  secondaryValue: 26.2,
  match: false,
  discrepancy: "2.7% delta",
  confidence: 75  // Reduced from 100 due to discrepancy
}
```

**RULE**: Never silently ignore discrepancies. Always report, always reduce confidence.

---

## PHASE 3: DECISION MAKING

After research complete, Tito decides:

### Decision Matrix:
```
Confidence > 75% AND
Risk Score < 30 AND
All critical data LIVE AND
No validation conflicts
  → DECISION: CALL / PUT / WAIT
  
Confidence <= 75% OR
Risk Score >= 30 OR
Stale data OR
Validation conflicts
  → DECISION: NO TRADE
```

### Decision Output:
```
{
  ticker: "GOOGL",
  decision: "CALL | PUT | WAIT | NO TRADE",
  confidence: XX%,
  riskScore: XX/100,
  reasons: [
    "reason 1",
    "reason 2"
  ],
  explanation: "Exact reasoning for this decision",
  timestamp: "ISO 8601",
  evidence: {
    marketData: { ... },
    fundamentals: { ... },
    validations: [ ... ],
    conflicts: [ ... ]
  }
}
```

### Decision Explanations Required:
- **CALL**: Why bullish? Which data supports? Confidence level?
- **PUT**: Why bearish? Which data contradicts bull case? Risk assessment?
- **WAIT**: What's missing? When will we have enough data? Confidence threshold?
- **NO TRADE**: Why risky? Which conflicts prevent action? How much confidence needed?

**RULE**: Explain EXACTLY why Tito took that decision. No vague statements.

---

## PHASE 4: DECISION JOURNAL

Store complete evidence trail:

File: `backend/decision-journal/GOOGL_<timestamp>.json`

```json
{
  "timestamp": "2026-09-08T07:46:00Z",
  "ticker": "GOOGL",
  "phase": "research",
  "decision": "CALL",
  "confidence": 82,
  "riskScore": 18,
  
  "sources": {
    "sec-edgar": {
      "pe-ratio": 25.5,
      "eps": 6.45,
      "revenue": 88.3e9,
      "timestamp": "2026-09-08T07:40:00Z",
      "freshness": "LIVE",
      "success": true
    },
    "investor-relations": {
      "earnings-date": "2026-10-24",
      "guidance": "upside",
      "timestamp": "2026-09-08T07:42:00Z",
      "freshness": "LIVE",
      "success": true
    },
    "news-api": {
      "sentiment": "bullish",
      "articles": 5,
      "timestamp": "2026-09-08T07:35:00Z",
      "freshness": "DELAYED",
      "success": true
    },
    "vix": {
      "value": 18.5,
      "regime": "medium-volatility",
      "timestamp": "2026-09-08T07:45:00Z",
      "freshness": "LIVE",
      "success": true
    }
  },
  
  "validations": [
    {
      "dataPoint": "P/E Ratio",
      "source1": "sec-edgar",
      "value1": 25.5,
      "source2": "yahoo-finance",
      "value2": 25.8,
      "match": true,
      "delta": "1.2%"
    }
  ],
  
  "conflicts": [],
  
  "reasoning": "GOOGL shows strong fundamentals (P/E 25.5, revenue growth 12% YoY) aligned with bullish sentiment (5 positive articles, IR optimistic guidance for Oct earnings). VIX at 18.5 (medium vol) provides reasonable risk environment. No data conflicts. High confidence for bullish call.",
  
  "next_steps": "Execute CALL strategy on Alpaca Paper (0 orders sent yet - validation phase)",
  "ready_for_execution": true
}
```

---

## PHASE 5: NO EXECUTION YET

**Important**: 
- NO orders sent during S63
- Purpose is to prove Tito CAN investigate autonomously
- Validate decision quality with evidence
- Only AFTER S63 passes: Connect to Alpaca Paper

Order of execution:
1. **S63**: Tito investigates GOOGL, decides (CALL/PUT/WAIT/NO TRADE)
2. **After S63 approval**: Connect decision to Alpaca Paper
3. **S64**: First controlled execution test (1-2 orders, paper trading)

---

## PHASE 6: SUCCESS CRITERIA

S63 is successful if:
- [ ] All 7+ data sources queried (source attribution complete)
- [ ] Each data point has timestamp + freshness + confidence
- [ ] Minimum 2 sources for critical data (cross-validated)
- [ ] Conflicts detected and reported (none hidden)
- [ ] Confidence score calculated (0-100%)
- [ ] Risk score calculated (0-100)
- [ ] Final decision made: CALL/PUT/WAIT/NO TRADE
- [ ] Decision reasoning fully documented
- [ ] Evidence trail in decision-journal complete
- [ ] NO orders actually sent to Alpaca (validation only)

---

## PHASE 7: PERMANENT RULE

**The checklist is not a temporary validation tool.**

The **S62 Certification Checklist** becomes a **permanent operational standard** for Tito:
- Every analysis must follow it
- Every source must provide SOURCE + TIMESTAMP + FRESHNESS
- Every conflict must be reported (never silent)
- Every decision must be explained (never vague)
- Every evidence trail must be logged

This is Tito's contract with rigor. Not negotiable.

---

## CRITICAL: THINK → EXECUTE SEQUENCE

**Correct order**:
1. Tito thinks (S63: investigates, decides)
2. Then Tito executes (S64: acts on decision)

**Wrong order** (what we're preventing):
1. Tito has code to execute
2. Later finds out it can't decide properly
3. Chaos ensues

By doing S63 first (proof of intelligent decision-making),
then S64 second (proof of safe execution),
we know Tito is both thoughtful AND disciplined.
