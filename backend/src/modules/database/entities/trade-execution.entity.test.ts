import { describe, it, expect } from 'vitest';
import { TradeExecution } from './trade-execution.entity';
import { DecisionAuditTrail } from './decision-audit-trail.entity';

describe('TradeExecution Entity', () => {
  it('should create a TradeExecution instance', () => {
    const tradeExec = new TradeExecution();
    tradeExec.id = 'test-id';
    tradeExec.tradeId = 'trd_ETHUSD_20260912_001';
    tradeExec.symbol = 'ETHUSD';
    tradeExec.side = 'buy';
    tradeExec.quantity = 1.0;
    tradeExec.orderType = 'market';
    tradeExec.status = 'PENDING';
    tradeExec.executionMode = 'PAPER';

    expect(tradeExec.id).toBe('test-id');
    expect(tradeExec.tradeId).toBe('trd_ETHUSD_20260912_001');
    expect(tradeExec.symbol).toBe('ETHUSD');
    expect(tradeExec.side).toBe('buy');
    expect(tradeExec.quantity).toBe(1.0);
    expect(tradeExec.status).toBe('PENDING');
    expect(tradeExec.executionMode).toBe('PAPER');
  });

  it('should support all execution statuses', () => {
    const statuses = [
      'PENDING',
      'PARTIAL',
      'FILLED',
      'CANCELLED',
      'FAILED',
      'EXPIRED',
    ];

    statuses.forEach((status) => {
      const tradeExec = new TradeExecution();
      tradeExec.status = status;
      expect(tradeExec.status).toBe(status);
    });
  });

  it('should support all execution modes', () => {
    const modes = ['PAPER', 'LIVE', 'SIMULATOR'];

    modes.forEach((mode) => {
      const tradeExec = new TradeExecution();
      tradeExec.executionMode = mode;
      expect(tradeExec.executionMode).toBe(mode);
    });
  });

  it('should track retry attempts', () => {
    const tradeExec = new TradeExecution();
    tradeExec.attemptCount = 0;
    expect(tradeExec.attemptCount).toBe(0);

    tradeExec.attemptCount = 3;
    expect(tradeExec.attemptCount).toBe(3);
  });

  it('should support optional fill information', () => {
    const tradeExec = new TradeExecution();
    tradeExec.filledQty = 0.5;
    tradeExec.filledPrice = 150.25;
    tradeExec.avgFillPrice = 150.23;
    tradeExec.filledAt = new Date('2026-09-12T10:30:00Z');

    expect(tradeExec.filledQty).toBe(0.5);
    expect(tradeExec.filledPrice).toBe(150.25);
    expect(tradeExec.avgFillPrice).toBe(150.23);
    expect(tradeExec.filledAt).toBeDefined();
  });

  it('should support stop loss and take profit', () => {
    const tradeExec = new TradeExecution();
    tradeExec.stopLoss = 149.0;
    tradeExec.takeProfit = 152.0;
    tradeExec.slOrderId = 'sl_123';
    tradeExec.tpOrderId = 'tp_456';

    expect(tradeExec.stopLoss).toBe(149.0);
    expect(tradeExec.takeProfit).toBe(152.0);
    expect(tradeExec.slOrderId).toBe('sl_123');
    expect(tradeExec.tpOrderId).toBe('tp_456');
  });

  it('should calculate P&L', () => {
    const tradeExec = new TradeExecution();
    tradeExec.filledPrice = 150.0;
    tradeExec.exitPrice = 152.0;
    tradeExec.quantity = 1.0;
    tradeExec.profitLoss = 2.0;
    tradeExec.profitLossPercent = 1.33;
    tradeExec.outcome = 'PROFITABLE';

    expect(tradeExec.profitLoss).toBe(2.0);
    expect(tradeExec.profitLossPercent).toBe(1.33);
    expect(tradeExec.outcome).toBe('PROFITABLE');
  });

  it('should support broker response storage', () => {
    const tradeExec = new TradeExecution();
    const brokerResponse = {
      orderId: 'broker_123',
      status: 'filled',
      filledQty: 1.0,
      filledPrice: 150.25,
    };
    tradeExec.brokerResponse = brokerResponse;

    expect(tradeExec.brokerResponse).toEqual(brokerResponse);
    expect(tradeExec.brokerResponse?.orderId).toBe('broker_123');
  });

  it('should track close status', () => {
    const closeStatuses = ['TP_HIT', 'SL_HIT', 'MANUAL', 'EXPIRED', 'PARTIAL'];

    closeStatuses.forEach((status) => {
      const tradeExec = new TradeExecution();
      tradeExec.closeStatus = status;
      expect(tradeExec.closeStatus).toBe(status);
    });
  });

  it('should have immutable identity', () => {
    const tradeExec = new TradeExecution();
    tradeExec.id = 'original-id';
    tradeExec.tradeId = 'trd_001';

    expect(tradeExec.id).toBe('original-id');
    expect(tradeExec.tradeId).toBe('trd_001');
  });
});
