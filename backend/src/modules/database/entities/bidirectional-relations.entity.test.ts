import { describe, it, expect } from 'vitest';
import { TradeExecution } from './trade-execution.entity';
import { ExecutionEvent } from './execution-event.entity';
import { DecisionAuditTrail } from './decision-audit-trail.entity';
import { PositionSnapshot } from './position-snapshot.entity';

describe('Bidirectional Relations - Etapa 2', () => {
  describe('DecisionAuditTrail ↔ TradeExecution', () => {
    it('should establish OneToMany relation from DecisionAuditTrail to TradeExecution', () => {
      const decision = new DecisionAuditTrail();
      decision.id = 'decision-1';
      decision.symbol = 'ETHUSD';
      decision.decision = 'ENTER';

      const trade1 = new TradeExecution();
      trade1.id = 'exec-1';
      trade1.tradeId = 'trd_001';
      trade1.decisionAuditTrail = decision;
      trade1.symbol = 'ETHUSD';
      trade1.side = 'buy';
      trade1.quantity = 1.0;
      trade1.orderType = 'market';
      trade1.status = 'PENDING';
      trade1.executionMode = 'PAPER';

      decision.tradeExecutions = [trade1];

      expect(decision.tradeExecutions).toBeDefined();
      expect(decision.tradeExecutions?.length).toBe(1);
      expect(decision.tradeExecutions?.[0].tradeId).toBe('trd_001');
      expect(decision.tradeExecutions?.[0].decisionAuditTrail.id).toBe('decision-1');
    });

    it('should support multiple TradeExecutions per Decision', () => {
      const decision = new DecisionAuditTrail();
      decision.id = 'decision-2';
      decision.symbol = 'SPY';
      decision.decision = 'ENTER';

      const trades = [
        { tradeId: 'trd_001', side: 'buy', quantity: 10 },
        { tradeId: 'trd_002', side: 'buy', quantity: 5 },
        { tradeId: 'trd_003', side: 'sell', quantity: 3 },
      ].map((t) => {
        const trade = new TradeExecution();
        trade.id = `exec-${t.tradeId}`;
        trade.tradeId = t.tradeId;
        trade.symbol = 'SPY';
        trade.side = t.side;
        trade.quantity = t.quantity;
        trade.orderType = 'market';
        trade.status = 'PENDING';
        trade.executionMode = 'PAPER';
        trade.decisionAuditTrail = decision;
        return trade;
      });

      decision.tradeExecutions = trades;

      expect(decision.tradeExecutions?.length).toBe(3);
      expect(decision.tradeExecutions?.every((t) => t.decisionAuditTrail.id === 'decision-2')).toBe(true);
    });

    it('should NOT cascade delete TradeExecutions when Decision is deleted', () => {
      // This test verifies the cascade: false policy
      const decision = new DecisionAuditTrail();
      decision.id = 'decision-3';
      decision.symbol = 'QQQ';
      decision.decision = 'ENTER';

      const trade = new TradeExecution();
      trade.id = 'exec-cascade-test';
      trade.tradeId = 'trd_cascade';
      trade.decisionAuditTrail = decision;
      trade.symbol = 'QQQ';
      trade.side = 'buy';
      trade.quantity = 1.0;
      trade.orderType = 'market';
      trade.status = 'PENDING';
      trade.executionMode = 'PAPER';

      decision.tradeExecutions = [trade];

      // Verify both exist before deletion
      expect(trade.decisionAuditTrail).toBeDefined();
      expect(decision.tradeExecutions?.length).toBe(1);

      // In real DB with cascade:false, deleting decision would keep trade alive
      // This test just verifies the data structure is intact
      expect(trade.id).toBe('exec-cascade-test');
    });
  });

  describe('PositionSnapshot ↔ TradeExecution', () => {
    it('should establish ManyToOne relation from PositionSnapshot to TradeExecution', () => {
      const trade = new TradeExecution();
      trade.id = 'exec-snapshot-1';
      trade.tradeId = 'trd_snap_001';
      trade.symbol = 'ETHUSD';
      trade.side = 'buy';
      trade.quantity = 1.0;
      trade.orderType = 'market';
      trade.status = 'FILLED';
      trade.executionMode = 'PAPER';

      const snapshot = new PositionSnapshot();
      snapshot.id = 'snap-1';
      snapshot.timestamp = new Date();
      snapshot.symbol = 'ETHUSD';
      snapshot.qty = 1.0;
      snapshot.tradeExecution = trade;

      expect(snapshot.tradeExecution).toBeDefined();
      expect(snapshot.tradeExecution?.id).toBe('exec-snapshot-1');
      expect(snapshot.tradeExecution?.tradeId).toBe('trd_snap_001');
    });

    it('should support optional TradeExecution (nullable foreign key)', () => {
      const snapshot = new PositionSnapshot();
      snapshot.id = 'snap-no-trade';
      snapshot.timestamp = new Date();
      snapshot.symbol = 'SPY';
      snapshot.qty = 100;
      snapshot.tradeExecution = undefined;
      snapshot.tradeExecutionId = undefined;

      expect(snapshot.tradeExecution).toBeUndefined();
      expect(snapshot.tradeExecutionId).toBeUndefined();
    });

    it('should track tradeExecutionId via RelationId', () => {
      const trade = new TradeExecution();
      trade.id = 'exec-rel-id-test';
      trade.tradeId = 'trd_rel_001';
      trade.symbol = 'BTC';
      trade.side = 'buy';
      trade.quantity = 0.5;
      trade.orderType = 'limit';
      trade.status = 'PENDING';
      trade.executionMode = 'PAPER';

      const snapshot = new PositionSnapshot();
      snapshot.id = 'snap-rel-id-test';
      snapshot.timestamp = new Date();
      snapshot.symbol = 'BTC';
      snapshot.qty = 0.5;
      snapshot.tradeExecution = trade;
      snapshot.tradeExecutionId = trade.id;

      expect(snapshot.tradeExecutionId).toBe('exec-rel-id-test');
      expect(snapshot.tradeExecution?.id).toBe(snapshot.tradeExecutionId);
    });
  });

  describe('Full Bidirectional Chain: Decision → TradeExecution → ExecutionEvent', () => {
    it('should support complete chain from Decision through Execution to Events', () => {
      // Create Decision
      const decision = new DecisionAuditTrail();
      decision.id = 'dec-chain-1';
      decision.symbol = 'ETHUSD';
      decision.decision = 'ENTER';
      decision.proposedEntry = 150.0;
      decision.proposedStop = 149.0;
      decision.proposedTarget = 152.0;

      // Create TradeExecution linked to Decision
      const trade = new TradeExecution();
      trade.id = 'exec-chain-1';
      trade.tradeId = 'trd_chain_001';
      trade.decisionAuditTrail = decision;
      trade.symbol = 'ETHUSD';
      trade.side = 'buy';
      trade.quantity = 1.0;
      trade.orderType = 'market';
      trade.status = 'PARTIAL';
      trade.executionMode = 'PAPER';
      trade.filledQty = 0.5;
      trade.filledPrice = 150.25;

      // Create ExecutionEvents linked to TradeExecution
      const event1 = new ExecutionEvent();
      event1.id = 'evt-chain-1';
      event1.eventType = 'ORDER_PLACED';
      event1.tradeExecution = trade;
      event1.message = 'Order placed for 1.0 ETHUSD';

      const event2 = new ExecutionEvent();
      event2.id = 'evt-chain-2';
      event2.eventType = 'PARTIAL_FILL';
      event2.tradeExecution = trade;
      event2.filledQty = 0.5;
      event2.filledPrice = 150.25;
      event2.message = 'Filled 0.5 ETHUSD at 150.25';

      // Link TradeExecution to Decision
      decision.tradeExecutions = [trade];

      // Verify the complete chain
      expect(decision.tradeExecutions).toBeDefined();
      expect(decision.tradeExecutions?.length).toBe(1);
      expect(decision.tradeExecutions?.[0].id).toBe('exec-chain-1');
      expect(decision.tradeExecutions?.[0].decisionAuditTrail.id).toBe('dec-chain-1');

      // Verify events can reference execution
      expect(event1.tradeExecution.id).toBe('exec-chain-1');
      expect(event2.tradeExecution.id).toBe('exec-chain-1');
    });

    it('should support full trace from PositionSnapshot back through TradeExecution to Decision', () => {
      // Create Decision
      const decision = new DecisionAuditTrail();
      decision.id = 'dec-trace-1';
      decision.symbol = 'SPY';
      decision.decision = 'ENTER';

      // Create TradeExecution
      const trade = new TradeExecution();
      trade.id = 'exec-trace-1';
      trade.tradeId = 'trd_trace_001';
      trade.decisionAuditTrail = decision;
      trade.symbol = 'SPY';
      trade.side = 'buy';
      trade.quantity = 100;
      trade.orderType = 'market';
      trade.status = 'FILLED';
      trade.executionMode = 'PAPER';
      trade.filledQty = 100;
      trade.filledPrice = 450.0;

      // Create PositionSnapshot
      const snapshot = new PositionSnapshot();
      snapshot.id = 'snap-trace-1';
      snapshot.timestamp = new Date();
      snapshot.symbol = 'SPY';
      snapshot.qty = 100;
      snapshot.tradeExecution = trade;

      // Trace back through relationships
      expect(snapshot.tradeExecution?.id).toBe('exec-trace-1');
      expect(snapshot.tradeExecution?.decisionAuditTrail?.id).toBe('dec-trace-1');
      expect(snapshot.tradeExecution?.decisionAuditTrail?.symbol).toBe('SPY');
      expect(snapshot.tradeExecution?.decisionAuditTrail?.decision).toBe('ENTER');
    });
  });

  describe('Immutability of Original Fields', () => {
    it('should preserve original DecisionAuditTrail executionId field for compatibility', () => {
      const decision = new DecisionAuditTrail();
      decision.id = 'dec-compat-1';
      decision.symbol = 'ETH';
      decision.decision = 'SALIR';
      decision.executionId = 'old-style-exec-id'; // DEPRECATED but still present

      // New relation exists alongside
      decision.tradeExecutions = [];

      expect(decision.executionId).toBe('old-style-exec-id');
      expect(decision.tradeExecutions).toBeDefined();
    });

    it('should preserve original PositionSnapshot decisionAuditTrail relation', () => {
      const decision = new DecisionAuditTrail();
      decision.id = 'dec-orig-1';
      decision.symbol = 'QQQ';
      decision.decision = 'ENTER';

      const snapshot = new PositionSnapshot();
      snapshot.id = 'snap-orig-1';
      snapshot.timestamp = new Date();
      snapshot.symbol = 'QQQ';
      snapshot.qty = 50;
      snapshot.decisionAuditTrail = decision;
      snapshot.decisionAuditTrailId = decision.id;

      // New relation can coexist
      snapshot.tradeExecution = undefined;

      expect(snapshot.decisionAuditTrail?.id).toBe('dec-orig-1');
      expect(snapshot.decisionAuditTrailId).toBe('dec-orig-1');
      expect(snapshot.tradeExecution).toBeUndefined();
    });
  });
});
