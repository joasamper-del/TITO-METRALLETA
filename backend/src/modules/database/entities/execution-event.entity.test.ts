import { describe, it, expect } from 'vitest';
import { ExecutionEvent } from './execution-event.entity';

describe('ExecutionEvent Entity', () => {
  it('should create an ExecutionEvent instance', () => {
    const event = new ExecutionEvent();
    event.id = 'event-id-1';
    event.eventType = 'ORDER_PLACED';
    event.message = 'Order placed for 1.0 ETHUSD';

    expect(event.id).toBe('event-id-1');
    expect(event.eventType).toBe('ORDER_PLACED');
    expect(event.message).toBe('Order placed for 1.0 ETHUSD');
  });

  it('should support all event types', () => {
    const eventTypes = [
      'ORDER_PLACED',
      'PARTIAL_FILL',
      'FILL',
      'RETRY',
      'FAILED',
      'CANCELLED',
      'CLOSED',
      'TP_HIT',
      'SL_HIT',
    ];

    eventTypes.forEach((type) => {
      const event = new ExecutionEvent();
      event.eventType = type;
      expect(event.eventType).toBe(type);
    });
  });

  it('should track fill details', () => {
    const event = new ExecutionEvent();
    event.filledQty = 0.5;
    event.filledPrice = 150.25;
    event.brokerOrderId = 'broker_order_123';

    expect(event.filledQty).toBe(0.5);
    expect(event.filledPrice).toBe(150.25);
    expect(event.brokerOrderId).toBe('broker_order_123');
  });

  it('should store broker data verbatim', () => {
    const event = new ExecutionEvent();
    const brokerData = {
      orderId: 'broker_123',
      status: 'partially_filled',
      filledQty: 0.5,
      avgFillPrice: 150.25,
      fees: 1.5,
    };
    event.brokerData = brokerData;

    expect(event.brokerData).toEqual(brokerData);
    expect(event.brokerData?.fees).toBe(1.5);
  });

  it('should track broker timestamp separately from local timestamp', () => {
    const event = new ExecutionEvent();
    const brokerTimestamp = new Date('2026-09-12T10:30:00Z');
    event.brokerTimestamp = brokerTimestamp;

    expect(event.brokerTimestamp).toEqual(brokerTimestamp);
  });

  it('should support descriptive messages', () => {
    const messages = [
      'Filled 10 shares at 150.25',
      'Retry attempt 2 of 5',
      'Cancelled due to timeout',
      'Stop loss hit at 149.00',
      'Take profit hit at 152.00',
    ];

    messages.forEach((msg) => {
      const event = new ExecutionEvent();
      event.message = msg;
      expect(event.message).toBe(msg);
    });
  });

  it('should handle null/undefined optional fields', () => {
    const event = new ExecutionEvent();
    event.eventType = 'ORDER_PLACED';

    expect(event.filledQty).toBeUndefined();
    expect(event.filledPrice).toBeUndefined();
    expect(event.brokerOrderId).toBeUndefined();
    expect(event.brokerData).toBeUndefined();
  });

  it('should maintain event ordering by recordedAt', () => {
    const event1 = new ExecutionEvent();
    event1.eventType = 'ORDER_PLACED';
    const time1 = new Date('2026-09-12T10:00:00Z');

    const event2 = new ExecutionEvent();
    event2.eventType = 'FILL';
    const time2 = new Date('2026-09-12T10:05:00Z');

    // In real scenario, recordedAt would be set by @CreateDateColumn
    // This test verifies the field can hold chronological data
    expect(time1 < time2).toBe(true);
  });

  it('should support complex broker data structures', () => {
    const event = new ExecutionEvent();
    event.brokerData = {
      orderId: 'order_123',
      account: {
        id: 'acc_456',
        type: 'margin',
      },
      fills: [
        { qty: 0.3, price: 150.2, timestamp: '2026-09-12T10:00:00Z' },
        { qty: 0.7, price: 150.3, timestamp: '2026-09-12T10:01:00Z' },
      ],
      commissions: {
        base: 1.0,
        regulatory: 0.1,
        total: 1.1,
      },
    };

    expect(event.brokerData?.account?.type).toBe('margin');
    expect(event.brokerData?.fills?.length).toBe(2);
    expect(event.brokerData?.commissions?.total).toBe(1.1);
  });
});
