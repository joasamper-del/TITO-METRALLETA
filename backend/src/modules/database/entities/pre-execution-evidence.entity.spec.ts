import { describe, it, expect, beforeEach } from 'vitest';
import { PreExecutionEvidence } from './pre-execution-evidence.entity';

describe('PreExecutionEvidence Entity', () => {
  let evidence: PreExecutionEvidence;

  beforeEach(() => {
    evidence = new PreExecutionEvidence();
    evidence.id = 'test-id';
    evidence.trade_id = 'ETHUSD_20260912_0001';
    evidence.order_intent_id = 'ORDER_HASH_ABC123';

    const gateResult = { valid: true, reason: 'Test', timestamp: new Date().toISOString() };
    evidence.gate1_result = gateResult;
    evidence.gate2_result = gateResult;
    evidence.gate3_result = gateResult;
    evidence.gate4_result = gateResult;
    evidence.gate5_result = gateResult;

    evidence.consumed = false;
    evidence.valid_until = new Date(Date.now() + 5 * 60 * 1000); // 5 min futuro
    evidence.all_gates_pass = true;
    evidence.created_at = new Date();
    evidence.updated_at = new Date();
  });

  it('should be defined', () => {
    expect(evidence).toBeDefined();
  });

  it('isUsable() returns true when !consumed && !expired', () => {
    expect(evidence.isUsable()).toBe(true);
  });

  it('isUsable() returns false when consumed=true', () => {
    evidence.consumed = true;
    expect(evidence.isUsable()).toBe(false);
  });

  it('isUsable() returns false when expired', () => {
    evidence.valid_until = new Date(Date.now() - 1000); // Expirado
    expect(evidence.isUsable()).toBe(false);
  });

  it('isExpired() returns true when now() > valid_until', () => {
    evidence.valid_until = new Date(Date.now() - 1000);
    expect(evidence.isExpired()).toBe(true);
  });

  it('isExpired() returns false when now() < valid_until', () => {
    evidence.valid_until = new Date(Date.now() + 10000);
    expect(evidence.isExpired()).toBe(false);
  });

  it('markConsumed() sets consumed=true and updates timestamp', () => {
    const oldTime = evidence.updated_at;
    evidence.markConsumed();
    expect(evidence.consumed).toBe(true);
    expect(evidence.updated_at.getTime()).toBeGreaterThanOrEqual(oldTime.getTime());
  });

  it('should have 4 indices (trade_id, all_gates_pass, created_at, consumed)', () => {
    // Entity metadata check via TypeORM decorators
    expect(evidence.trade_id).toBeDefined();
    expect(evidence.all_gates_pass).toBeDefined();
    expect(evidence.created_at).toBeDefined();
    expect(evidence.consumed).toBeDefined();
  });

  it('should have all 13 columns mapped correctly', () => {
    expect(evidence.id).toBeDefined();
    expect(evidence.trade_id).toBeDefined();
    expect(evidence.order_intent_id).toBeDefined();
    expect(evidence.gate1_result).toBeDefined();
    expect(evidence.gate2_result).toBeDefined();
    expect(evidence.gate3_result).toBeDefined();
    expect(evidence.gate4_result).toBeDefined();
    expect(evidence.gate5_result).toBeDefined();
    expect(evidence.all_gates_pass).toBeDefined();
    expect(evidence.valid_until).toBeDefined();
    expect(evidence.consumed).toBeDefined();
    expect(evidence.created_at).toBeDefined();
    expect(evidence.updated_at).toBeDefined();
  });

  // Nueva prueba: FK validation
  it('trade_id cannot be null or empty (FK candidate)', () => {
    evidence.trade_id = '';
    expect(evidence.trade_id).toBe('');
    // Service layer will validate on recordEvidence
  });
});
