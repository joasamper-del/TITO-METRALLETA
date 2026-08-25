#!/bin/bash
# ============================================================================
# Healthcheck 0DTE — Valida APIs sin tocar código
# Uso: bash scripts/validate-0dte.sh [TICKER] [DATE]
# Ejemplo: bash scripts/validate-0dte.sh BTC 2026-08-22
# ============================================================================

set -e

TICKER="${1:-BTC}"
DATE="${2:-$(date +%Y-%m-%d)}"
BASE="${BASE_URL:-http://localhost:3000}"
OUTDIR="data/validation-runs"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

mkdir -p "$OUTDIR"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================"
echo "Healthcheck 0DTE [$TIMESTAMP]"
echo "Ticker: $TICKER | Date: $DATE | Base: $BASE"
echo "========================================"

# Helper: HTTP check
check_api() {
  local name="$1"
  local url="$2"

  echo -n "  ✓ $name... "

  local http=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  local data=$(curl -s "$url")

  if [ "$http" = "200" ]; then
    echo -e "${GREEN}HTTP 200${NC}"
    echo "$data"
  else
    echo -e "${RED}HTTP $http${NC}"
    echo "$data"
    return 1
  fi
}

# 1. Main chain API
echo ""
echo "1️⃣  Chain API:"
CHAIN=$(check_api "/api/0dte" "$BASE/api/0dte?ticker=$TICKER&date=$DATE" || echo '{}')
CHAIN_ROWS=$(echo "$CHAIN" | jq '.table | length // 0' 2>/dev/null || echo "0")
echo "   Rows: $CHAIN_ROWS"

# 2. Flow API
echo ""
echo "2️⃣  Flow API:"
FLOW=$(check_api "/api/0dte/flow" "$BASE/api/0dte/flow?ticker=$TICKER" || echo '{}')
FLOW_CYCLES=$(echo "$FLOW" | jq '.cycles // 0' 2>/dev/null || echo "0")
FLOW_CONTRACTS=$(echo "$FLOW" | jq '.contracts // 0' 2>/dev/null || echo "0")
echo "   Cycles: $FLOW_CYCLES | Contracts: $FLOW_CONTRACTS"

# 3. Eval API
echo ""
echo "3️⃣  Eval API:"
EVAL=$(check_api "/api/0dte/eval" "$BASE/api/0dte/eval?ticker=$TICKER" || echo '{}')
EVAL_MAE=$(echo "$EVAL" | jq '.meanAbsErrorPct // null' 2>/dev/null)
echo "   MAE: $EVAL_MAE"

# 4. Discover API
echo ""
echo "4️⃣  Discover API:"
DISC=$(check_api "/api/0dte/discover" "$BASE/api/0dte/discover" || echo '{}')
DISC_COUNT=$(echo "$DISC" | jq '.candidates | length // 0' 2>/dev/null || echo "0")
echo "   Candidates: $DISC_COUNT"

# 5. Save report
echo ""
echo "5️⃣  Saving report..."

cat > "$OUTDIR/run-${TICKER}-${DATE}-${TIMESTAMP}.json" << EOF
{
  "timestamp": "$TIMESTAMP",
  "ticker": "$TICKER",
  "date": "$DATE",
  "base_url": "$BASE",
  "results": {
    "chain": {
      "rows": $CHAIN_ROWS,
      "data": $CHAIN
    },
    "flow": {
      "cycles": $FLOW_CYCLES,
      "contracts": $FLOW_CONTRACTS,
      "data": $FLOW
    },
    "eval": {
      "mae": $EVAL_MAE,
      "data": $EVAL
    },
    "discover": {
      "candidates": $DISC_COUNT,
      "data": $DISC
    }
  }
}
EOF

echo "   ✅ Saved: $OUTDIR/run-${TICKER}-${DATE}-${TIMESTAMP}.json"

# 6. Quick verdict
echo ""
echo "📊 Quick Check:"
if [ "$CHAIN_ROWS" -gt 0 ]; then
  echo -e "   ${GREEN}✓ Chain has data ($CHAIN_ROWS rows)${NC}"
else
  echo -e "   ${YELLOW}⚠ Chain is empty${NC}"
fi

if [ "$FLOW_CONTRACTS" -gt 0 ]; then
  echo -e "   ${GREEN}✓ Flow has contracts ($FLOW_CONTRACTS)${NC}"
else
  echo -e "   ${YELLOW}⚠ Flow is empty (might be no trades yet)${NC}"
fi

echo ""
echo "========================================"
echo "✅ Healthcheck complete"
echo "========================================"
