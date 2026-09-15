# S70 CHECKPOINT 1: Gates 1-3 (Market Health, Risk Boundary, Decision Audit)

**Timeline:** Days 1-3  
**Status:** 🟡 PENDING VICTOR APPROVAL  
**Authorized by:** Víctor (solo documentación, sin código)  
**For decision:** Jay  

---

## 📋 OBJETIVO

Implementar y validar los **primeros 3 gates de SEATBELT:**
1. **Gate 1 (Market Health):** ¿Mercado sano? ¿Quote fresca? ¿Spread OK?
2. **Gate 2 (Risk Boundary):** ¿Tamaño posición OK? ¿Riesgo $ dentro límites?
3. **Gate 3 (Decision Audit):** ¿Auditoría de decisión justifica? ¿Confianza ≥60%?

**Líneas totales:** +1,690 líneas nuevas (solo Gates 1-3)

---

## 📂 ARCHIVOS A MODIFICAR

### NUEVOS (11 archivos)

#### Servicios (4 servicios, +780 líneas)

**1. `backend/src/modules/seatbelt/services/gate1-market-health.service.ts`** (+180 líneas)

```typescript
// NUEVA CLASE
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class Gate1MarketHealthService {
  constructor(
    private alpacaService: AlpacaService,
    private configService: ConfigService,
  ) {}

  /**
   * Validar que el mercado está sano:
   * - Quote disponible y fresca (< 5 segundos)
   * - Bid/Ask spread razonable
   * - Mercado operando (no cerrado/suspenso)
   */
  async validate(symbol: string, maxSpreadBps: number = 20): Promise<GateResult> {
    try {
      const quote = await this.getQuoteWithTimeout(symbol, 5000);
      
      if (!quote) {
        return { valid: false, reason: 'Quote not available', gate: 'gate1' };
      }

      if (this.isQuoteStale(quote)) {
        return { valid: false, reason: 'Quote stale (> 5s)', gate: 'gate1' };
      }

      const spreadBps = this.calculateSpread(quote);
      if (spreadBps > maxSpreadBps) {
        return { 
          valid: false, 
          reason: `Spread too wide: ${spreadBps} bps > ${maxSpreadBps} max`, 
          gate: 'gate1' 
        };
      }

      if (!this.isMarketOpen(quote)) {
        return { valid: false, reason: 'Market closed or suspended', gate: 'gate1' };
      }

      return { valid: true, reason: 'Market healthy', gate: 'gate1' };
    } catch (error) {
      return { 
        valid: false, 
        reason: `Market check error: ${error.message}`, 
        gate: 'gate1' 
      };
    }
  }

  private async getQuoteWithTimeout(symbol: string, timeoutMs: number): Promise<Quote> {
    return Promise.race([
      this.alpacaService.getQuote(symbol),
      this.timeout(timeoutMs),
    ]);
  }

  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Quote timeout')), ms)
    );
  }

  private isQuoteStale(quote: Quote): boolean {
    const ageMs = Date.now() - quote.timestamp.getTime();
    return ageMs > 5000;
  }

  private calculateSpread(quote: Quote): number {
    // Spread en basis points
    return ((quote.ask - quote.bid) / quote.bid) * 10000;
  }

  private isMarketOpen(quote: Quote): boolean {
    return quote.status === 'OPEN' || quote.status === 'EXTENDED';
  }
}
```

**Propósito:** Verificar que el mercado está disponible y liquido antes de ejecutar.

---

**2. `backend/src/modules/seatbelt/services/gate2-risk-boundary.service.ts`** (+200 líneas)

```typescript
// NUEVA CLASE
import { Injectable } from '@nestjs/common';

@Injectable()
export class Gate2RiskBoundaryService {
  /**
   * Validar que la posición respeta límites de riesgo:
   * - Tamaño posición <= máximo configurado
   * - $ Risk = (qty × price × slippage) <= presupuesto
   * - Drawdown acumulado <= umbral
   * - Balance suficiente
   */
  async validate(
    order: Order,
    account: Account,
    config: SeatbeltConfig,
  ): Promise<GateResult> {
    // Validación 1: Tamaño posición
    const sizeCheck = this.validatePositionSize(order.qty, config);
    if (!sizeCheck.valid) {
      return { valid: false, reason: sizeCheck.reason, gate: 'gate2' };
    }

    // Validación 2: Riesgo $
    const riskCheck = this.validateRiskAmount(order, config);
    if (!riskCheck.valid) {
      return { valid: false, reason: riskCheck.reason, gate: 'gate2' };
    }

    // Validación 3: Drawdown
    const drawdownCheck = this.validateDrawdown(account, config);
    if (!drawdownCheck.valid) {
      return { valid: false, reason: drawdownCheck.reason, gate: 'gate2' };
    }

    // Validación 4: Balance
    const balanceCheck = this.validateBalance(order, account);
    if (!balanceCheck.valid) {
      return { valid: false, reason: balanceCheck.reason, gate: 'gate2' };
    }

    return { valid: true, reason: 'Risk boundaries respected', gate: 'gate2' };
  }

  private validatePositionSize(qty: number, config: SeatbeltConfig): { valid: boolean; reason?: string } {
    if (qty > config.MAX_POSITION_SIZE_CRYPTO) {
      return {
        valid: false,
        reason: `Position size ${qty} > max ${config.MAX_POSITION_SIZE_CRYPTO}`,
      };
    }
    return { valid: true };
  }

  private validateRiskAmount(order: Order, config: SeatbeltConfig): { valid: boolean; reason?: string } {
    const riskDollars = order.qty * order.price * 0.02; // 2% slippage
    if (riskDollars > config.MAX_RISK_PER_TRADE) {
      return {
        valid: false,
        reason: `Risk $${riskDollars} > max $${config.MAX_RISK_PER_TRADE}`,
      };
    }
    return { valid: true };
  }

  private validateDrawdown(account: Account, config: SeatbeltConfig): { valid: boolean; reason?: string } {
    const drawdownPct = ((account.startBalance - account.balance) / account.startBalance) * 100;
    if (drawdownPct > config.MAX_DRAWDOWN_PCT) {
      return {
        valid: false,
        reason: `Drawdown ${drawdownPct}% > max ${config.MAX_DRAWDOWN_PCT}%`,
      };
    }
    return { valid: true };
  }

  private validateBalance(order: Order, account: Account): { valid: boolean; reason?: string } {
    const requiredBalance = order.qty * order.price * 1.1; // 10% buffer
    if (account.balance < requiredBalance) {
      return {
        valid: false,
        reason: `Insufficient balance: ${account.balance} < ${requiredBalance} required`,
      };
    }
    return { valid: true };
  }
}
```

**Propósito:** Garantizar que el trade respeta límites de riesgo del trader.

---

**3. `backend/src/modules/seatbelt/services/gate3-decision-audit.service.ts`** (+150 líneas)

```typescript
// NUEVA CLASE
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { DecisionAuditTrail } from '../../audit-trail/entities/decision-audit-trail.entity';

@Injectable()
export class Gate3DecisionAuditService {
  constructor(
    @InjectRepository(DecisionAuditTrail)
    private decisionRepo: Repository<DecisionAuditTrail>,
  ) {}

  /**
   * Validar que la decisión está justificada:
   * - DecisionAuditTrail existe para este trade
   * - Confidence score >= 60%
   * - Mercado conditions match (price ±2%, VIX ±10%)
   * - Decisión no es antigua (< 5 minutos)
   */
  async validate(
    order: Order,
    tradeId: string,
    currentMarketState: MarketState,
  ): Promise<GateResult> {
    // Paso 1: Buscar DecisionAuditTrail
    const decision = await this.decisionRepo.findOne({
      where: { tradeId },
      order: { createdAt: 'DESC' },
    });

    if (!decision) {
      return {
        valid: false,
        reason: `No DecisionAuditTrail found for tradeId ${tradeId}`,
        gate: 'gate3',
      };
    }

    // Paso 2: Validar confidence
    if (decision.confidenceScore < 60) {
      return {
        valid: false,
        reason: `Confidence ${decision.confidenceScore}% < 60% minimum`,
        gate: 'gate3',
      };
    }

    // Paso 3: Validar que mercado no cambió mucho
    const priceChange = Math.abs(
      (currentMarketState.price - decision.marketSnapshot.price) / decision.marketSnapshot.price
    ) * 100;
    if (priceChange > 2) {
      return {
        valid: false,
        reason: `Market price changed ${priceChange}% > 2% tolerance`,
        gate: 'gate3',
      };
    }

    // Paso 4: Validar que decisión es fresca
    const ageSeconds = (Date.now() - decision.createdAt.getTime()) / 1000;
    if (ageSeconds > 300) { // 5 minutos
      return {
        valid: false,
        reason: `Decision is ${ageSeconds}s old, max 300s`,
        gate: 'gate3',
      };
    }

    return {
      valid: true,
      reason: `Decision justified (confidence ${decision.confidenceScore}%, fresh)`,
      gate: 'gate3',
    };
  }
}
```

**Propósito:** Asegurar que la orden está respaldada por un análisis reciente y confiable.

---

**4. `backend/src/modules/seatbelt/services/seatbelt.service.ts`** (+250 líneas)

```typescript
// ORQUESTADOR DE LOS 5 GATES (implementar solo Gates 1-3 en Checkpoint 1)
import { Injectable } from '@nestjs/common';

export interface SeatbeltResult {
  allGatesPass: boolean;
  gates: GateResult[];
  reason: string;
  timestamp: Date;
}

@Injectable()
export class SeatbeltService {
  constructor(
    private gate1: Gate1MarketHealthService,
    private gate2: Gate2RiskBoundaryService,
    private gate3: Gate3DecisionAuditService,
  ) {}

  /**
   * CHECKPOINT 1: Validar Gates 1-3 únicamente
   */
  async validateCheckpoint1(
    order: Order,
    account: Account,
    currentMarket: MarketState,
    config: SeatbeltConfig,
    tradeId: string,
  ): Promise<SeatbeltResult> {
    const gates: GateResult[] = [];

    // Gate 1: Market Health
    const gate1 = await this.gate1.validate(order.symbol);
    gates.push(gate1);

    // Gate 2: Risk Boundary
    const gate2 = await this.gate2.validate(order, account, config);
    gates.push(gate2);

    // Gate 3: Decision Audit
    const gate3 = await this.gate3.validate(order, tradeId, currentMarket);
    gates.push(gate3);

    const allPass = gates.every(g => g.valid);
    const failedGates = gates.filter(g => !g.valid).map(g => g.gate);

    return {
      allGatesPass: allPass,
      gates,
      reason: allPass ? 'All gates pass' : `Gates failed: ${failedGates.join(', ')}`,
      timestamp: new Date(),
    };
  }
}
```

**Propósito:** Orquestador central que ejecuta validaciones en secuencia.

---

#### Tests (4 files, +650 líneas)

**5. `backend/src/modules/seatbelt/services/gate1-market-health.service.spec.ts`** (+180 líneas)

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { Gate1MarketHealthService } from './gate1-market-health.service';
import { AlpacaService } from '../../alpaca/alpaca.service';

describe('Gate1MarketHealthService', () => {
  let service: Gate1MarketHealthService;
  let alpacaService: AlpacaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Gate1MarketHealthService,
        {
          provide: AlpacaService,
          useValue: {
            getQuote: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<Gate1MarketHealthService>(Gate1MarketHealthService);
    alpacaService = module.get<AlpacaService>(AlpacaService);
  });

  describe('validate', () => {
    it('should return PASS when quote is fresh and spread is tight', async () => {
      // Arrange
      const freshQuote = {
        symbol: 'SPY',
        bid: 450,
        ask: 450.1,
        timestamp: new Date(),
        status: 'OPEN',
      };
      (alpacaService.getQuote as jest.Mock).mockResolvedValue(freshQuote);

      // Act
      const result = await service.validate('SPY', 20);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.reason).toContain('healthy');
    });

    it('should return FAIL when quote is stale', async () => {
      // Arrange
      const staleQuote = {
        symbol: 'SPY',
        timestamp: new Date(Date.now() - 10000), // 10 segundos atrás
        status: 'OPEN',
      };
      (alpacaService.getQuote as jest.Mock).mockResolvedValue(staleQuote);

      // Act
      const result = await service.validate('SPY', 20);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('stale');
    });

    it('should return FAIL when spread is too wide', async () => {
      // Arrange
      const wideSpreadQuote = {
        bid: 450,
        ask: 455, // 1.1% spread = 110 bps
        timestamp: new Date(),
        status: 'OPEN',
      };
      (alpacaService.getQuote as jest.Mock).mockResolvedValue(wideSpreadQuote);

      // Act
      const result = await service.validate('SPY', 20); // 20 bps max

      // Assert
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Spread too wide');
    });

    it('should return FAIL when market is closed', async () => {
      // Arrange
      const closedMarketQuote = {
        bid: 450,
        ask: 450.1,
        timestamp: new Date(),
        status: 'CLOSED',
      };
      (alpacaService.getQuote as jest.Mock).mockResolvedValue(closedMarketQuote);

      // Act
      const result = await service.validate('SPY', 20);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('closed or suspended');
    });

    it('should timeout if Alpaca takes > 5 seconds', async () => {
      // Arrange
      (alpacaService.getQuote as jest.Mock).mockImplementation(
        () => new Promise(r => setTimeout(r, 10000))
      );

      // Act
      const result = await service.validate('SPY', 20);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('error');
    });

    // 10 más tests: edge cases, retry logic, spread boundaries...
  });
});
```

**Tests total:** 15 (quote fresh, stale, wide spread, market closed, timeout, retry, boundaries, etc.)

---

**6. `backend/src/modules/seatbelt/services/gate2-risk-boundary.service.spec.ts`** (+200 líneas)

```typescript
describe('Gate2RiskBoundaryService', () => {
  // 15 tests:
  // - Position size OK / Too large
  // - Risk $ within / exceeds budget
  // - Drawdown within / exceeds threshold
  // - Balance sufficient / insufficient
  // - Edge cases (0 qty, negative balance)
  // - Config boundary conditions
  // - Accumulative risk (multiple positions)
});
```

**Tests total:** 15

---

**7. `backend/src/modules/seatbelt/services/gate3-decision-audit.service.spec.ts`** (+120 líneas)

```typescript
describe('Gate3DecisionAuditService', () => {
  // 10 tests:
  // - DecisionAuditTrail exists / missing
  // - Confidence >= 60% / below
  // - Market price changed < 2% / > 2%
  // - Decision fresh (< 5 min) / stale
  // - Edge cases (VIX change, old decision)
});
```

**Tests total:** 10

---

**8. `backend/src/modules/seatbelt/services/seatbelt.service.spec.ts`** (+150 líneas)

```typescript
describe('SeatbeltService - Checkpoint 1', () => {
  // 12 tests:
  // - All 3 gates PASS
  // - Gate 1 fails → whole SEATBELT fails
  // - Gate 2 fails → whole SEATBELT fails
  // - Gate 3 fails → whole SEATBELT fails
  // - Mixed results (some pass, some fail)
  // - Timeout handling
  // - Bypass detection (evidence must exist)
  // - Result structure (contains all gate details)
});
```

**Tests total:** 12

---

#### Config & Module (3 files, +260 líneas)

**9. `backend/src/modules/seatbelt/seatbelt.module.ts`** (+80 líneas)

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Gate1MarketHealthService } from './services/gate1-market-health.service';
import { Gate2RiskBoundaryService } from './services/gate2-risk-boundary.service';
import { Gate3DecisionAuditService } from './services/gate3-decision-audit.service';
import { SeatbeltService } from './services/seatbelt.service';
import { DecisionAuditTrail } from '../audit-trail/entities/decision-audit-trail.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DecisionAuditTrail])],
  providers: [
    Gate1MarketHealthService,
    Gate2RiskBoundaryService,
    Gate3DecisionAuditService,
    SeatbeltService,
  ],
  exports: [SeatbeltService],
})
export class SeatbeltModule {}
```

**Propósito:** Registro de módulo NestJS, inyección de dependencias.

---

**10. `backend/src/modules/seatbelt/seatbelt.types.ts`** (+120 líneas)

```typescript
export interface GateResult {
  valid: boolean;
  reason: string;
  gate: 'gate1' | 'gate2' | 'gate3' | 'gate4' | 'gate5';
  timestamp?: Date;
}

export interface SeatbeltResult {
  allGatesPass: boolean;
  gates: GateResult[];
  reason: string;
  timestamp: Date;
}

export interface SeatbeltConfig {
  ENABLED: boolean;
  MAX_RISK_PER_TRADE: number; // $
  MAX_ACCOUNT_RISK_PCT: number; // %
  MAX_DRAWDOWN_PCT: number; // %
  MAX_POSITION_SIZE_CRYPTO: number; // contracts
}

export interface MarketState {
  price: number;
  spread: number;
  timestamp: Date;
  vix?: number;
}
```

**Propósito:** TypeScript types compartidos.

---

**11. `backend/src/modules/seatbelt/config/seatbelt.config.ts`** (+60 líneas)

```typescript
export const SEATBELT_CONFIG: SeatbeltConfig = {
  ENABLED: process.env.SEATBELT_ENABLED === 'true', // false during S70
  MAX_RISK_PER_TRADE: parseFloat(process.env.SEATBELT_MAX_RISK_PER_TRADE || '500'),
  MAX_ACCOUNT_RISK_PCT: parseFloat(process.env.SEATBELT_MAX_ACCOUNT_RISK_PCT || '2'),
  MAX_DRAWDOWN_PCT: parseFloat(process.env.SEATBELT_MAX_DRAWDOWN_PCT || '5'),
  MAX_POSITION_SIZE_CRYPTO: parseInt(process.env.SEATBELT_MAX_POSITION_SIZE_CRYPTO || '20'),
};
```

**Propósito:** Configuración centralizada (no tocar durante Checkpoint 1).

---

## ✅ LÍNEAS EXACTAS

| Componente | Líneas | Acumulado |
|-----------|--------|----------|
| Gate 1-3 Servicios | +780 | 780 |
| Tests (4 archivos) | +650 | 1,430 |
| Module + Types + Config | +260 | 1,690 |
| **TOTAL CHECKPOINT 1** | **+1,690** | **+1,690** |

---

## 🔍 RIESGOS IDENTIFICADOS

| Riesgo | Probabilidad | Severidad | Mitigación |
|--------|---|---|---|
| Alpaca timeout > 5s | 2% | Media | Retry 3x con backoff |
| Quote spread varies | 5% | Baja | Config tunable MAX_SPREAD |
| Account balance changes | 1% | Media | Check fresh balance (no cache) |
| Stale DecisionAuditTrail | 3% | Alta | Timestamp check < 5 min |
| TypeORM query fails | 1% | Alta | Fallback: decision missing → FAIL |

---

## ✅ PASS/FAIL CRITERIA

### ✅ CHECKPOINT 1 PASSES IF:

```bash
npm test -- --run gate1 gate2 gate3 seatbelt.service
  → 40/40 tests PASS (100%)

npm run lint -- seatbelt/
  → 0 errors

npm run type-check -- seatbelt/
  → 0 errors
```

### ❌ CHECKPOINT 1 FAILS IF:

```
< 90% tests PASS
OR lint/type errors found
OR integration with AlpacaService breaks
```

---

## 🔄 ROLLBACK STRATEGY

If Checkpoint 1 fails:

```bash
# Revert 4 service commits
git revert [commit1] [commit2] [commit3] [commit4]

# Remove test files
rm -rf backend/src/modules/seatbelt/services/*.spec.ts

# Keep config (no harm)
# Tito unchanged (SEATBELT_ENABLED = false)

# Timeline: 5-10 minutes max
```

---

## 📋 PRE-FLIGHT CONTROL (IFTA/Road Taxes, Registration, Logbook)

### Compliance Checklist

- [ ] **Code License:** Confirm all Gate 1-3 code uses MIT/Apache (consistent with project)
- [ ] **Security:** Guardian-secret-masker running (no secrets in logs)
- [ ] **Documentation:** Each service has JSDoc comments
- [ ] **Test Coverage:** > 90% for gate1-3 (coverage report)
- [ ] **Performance:** Gate 1 timeout < 5s, Gate 2/3 < 1s each
- [ ] **Error Handling:** All exceptions caught, logged, reported
- [ ] **Database:** DecisionAuditTrail foreign key valid
- [ ] **Observability:** Metrics exported (gate result counts)

### Logbook Entries

- [ ] `backend/CHANGELOG.md` entry (not merged yet)
- [ ] `backend/modules/SEATBELT_README.md` created (architecture overview)
- [ ] Commit messages clear and atomic

---

## 📚 EVIDENCE JAY MUST REVIEW

1. **Service Code:** Verify logic is sound (no bypass vectors)
2. **Test Coverage:** 40 tests, 100% passing
3. **Lint/Type Check:** 0 errors
4. **Config Defaults:** Reasonable thresholds for PASS
5. **Error Messages:** Clear, actionable for debugging

---

## 🎯 NEXT STEPS (IF JAY APPROVES)

1. Claude implements Gate 1-3 code
2. Run tests locally: `npm test -- --run gate1 gate2 gate3`
3. Code review: Víctor + Jay approve
4. Merge to main (one commit)
5. PROCEED TO CHECKPOINT 2

---

## ⏹️ STATE AFTER CHECKPOINT 1

- ✅ Gates 1-3 operational (but not active: SEATBELT_ENABLED = false)
- ✅ 40 tests passing, 0 lint errors
- ✅ Code ready for integration with Gates 4-5
- ❌ Tito still blocked (gates 4-5 missing)
- ❌ No trades executed (protection incomplete)

---

**Checkpoint 1 is the foundation. Gates 4-5 follow only if this passes.**

**Status: HOLD — Awaiting Jay's approval to proceed.**
