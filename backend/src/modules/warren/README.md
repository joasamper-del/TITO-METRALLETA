# Warren Buffett Jr. Module

Independent value investing system, running parallel to Tito Metralleta.

## Architecture

### Shared (Read-Only)
- **Data Fetchers** (`core/data-fetchers/`) — Real market data (Alpaca, FRED, Massive)
- **Audit Trail** (`core/audit-trail/`) — Logging infrastructure
- **PostgreSQL** — Separate schema (`warren_*` tables)

### Isolated (Warren-Only)
- **Rules Engine** (`warren/rules-engine/`) — Value screening criteria
- **Strategies** (`warren/strategies/`) — Investment selection logic
- **Execution** (`warren/execution/`) — Order placement, risk gates
- **Decision Pipeline** — Independent from Tito

## Directory Structure

```
warren/
├── strategies/           # Value investing strategies
│   ├── dcf.strategy.ts  # Discounted cash flow valuation
│   └── ...
├── rules-engine/        # Warren-specific rules
│   ├── warren-rules.ts
│   └── ...
├── execution/           # Independent execution engine
│   ├── warren-executor.ts
│   ├── risk-gates.ts
│   └── ...
├── controllers/         # API endpoints (/warren/*)
│   ├── warren.controller.ts
│   └── ...
├── database/            # Warren-specific entities
│   ├── warren-opportunity.entity.ts
│   ├── warren-trade.entity.ts
│   └── ...
├── warren.module.ts     # Module definition
└── README.md
```

## Safety Guarantees

✅ Warren CANNOT:
- Access Tito's decision logic
- Modify Tito's risk gates
- Execute Tito's strategies
- Share execution engine

✅ Warren CAN:
- Read market data (shared data fetchers)
- Log to audit trail (infrastructure)
- Use same PostgreSQL (separate schema)
- Access core interfaces (read-only)

## Development

Each component:
1. Isolated in `warren/*` folder
2. Independent from Tito
3. Zero cross-dependencies
4. Tests validate isolation
