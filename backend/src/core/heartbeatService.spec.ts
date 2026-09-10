/**
 * HeartbeatService Test Suite
 * 4 Test Suites con 8 casos de prueba total
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HeartbeatService } from './heartbeatService';
import * as fs from 'fs';

describe('HeartbeatService', () => {
  let service: HeartbeatService;
  const testHeartbeatFile = 'data/heartbeat.jsonl';

  beforeEach(() => {
    // Limpiar archivo de test previo
    try {
      if (fs.existsSync(testHeartbeatFile)) {
        fs.unlinkSync(testHeartbeatFile);
      }
    } catch (err) {
      // Ignorar
    }

    service = new HeartbeatService();
  });

  afterEach(() => {
    vi.clearAllTimers();
    // Limpiar
    try {
      if (fs.existsSync(testHeartbeatFile)) {
        fs.unlinkSync(testHeartbeatFile);
      }
    } catch (err) {
      // Ignorar
    }
  });

  // ========== TEST SUITE 1: Beat Recording ==========
  describe('TEST SUITE 1: Beat Recording', () => {
    it('TEST 1.1: beat() escribe a heartbeat.jsonl', () => {
      // ACT
      service.beat('test_context');

      // ASSERT
      expect(fs.existsSync(testHeartbeatFile)).toBe(true);

      const content = fs.readFileSync(testHeartbeatFile, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());

      // Segunda línea (primera es heartbeat_start)
      const beatLine = JSON.parse(lines[1]);
      expect(beatLine.event).toBe('beat');
      expect(beatLine.context).toBe('test_context');
      expect(beatLine.timestamp).toBeDefined();
    });

    it('TEST 1.2: Múltiples beats se acumulan', () => {
      // ACT
      service.beat('a');
      service.beat('b');
      service.beat('c');

      // ASSERT
      const content = fs.readFileSync(testHeartbeatFile, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());

      // heartbeat_start + 3 beats = 4 líneas
      expect(lines.length).toBeGreaterThanOrEqual(4);

      const beats = lines.slice(1).map(l => JSON.parse(l));
      const contexts = beats.map(b => b.context).filter(c => c);
      expect(contexts).toContain('a');
      expect(contexts).toContain('b');
      expect(contexts).toContain('c');
    });
  });

  // ========== TEST SUITE 2: Error Recording ==========
  describe('TEST SUITE 2: Error Recording', () => {
    it('TEST 2.1: criticalError() registra error', () => {
      // ACT
      service.criticalError('Test error message');

      // ASSERT
      expect(fs.existsSync(testHeartbeatFile)).toBe(true);

      const content = fs.readFileSync(testHeartbeatFile, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());

      // Buscar error en las líneas
      const errorLine = lines.find(l => {
        try {
          const parsed = JSON.parse(l);
          return parsed.event === 'critical_error';
        } catch (e) {
          return false;
        }
      });

      expect(errorLine).toBeDefined();
      const error = JSON.parse(errorLine!);
      expect(error.error).toBe('Test error message');
    });
  });

  // ========== TEST SUITE 3: Alive Detection ==========
  describe('TEST SUITE 3: Alive Detection', () => {
    it('TEST 3.1: isAlive() retorna true si reciente', () => {
      // ACT
      service.beat('test');
      const result = service.isAlive();

      // ASSERT
      expect(result).toBe(true);
    });

    it('TEST 3.2: isAlive() retorna false si timeout (1 min)', () => {
      // SETUP con fake timers
      vi.useFakeTimers();

      // ACT
      service.beat('test');

      // Avanzar 61 segundos (más que maxAllowedMs = 60000ms)
      vi.advanceTimersByTime(61000);
      const result = service.isAlive();

      // ASSERT
      expect(result).toBe(false);

      vi.useRealTimers();
    });

    it('TEST 3.3: Timeout configurable', () => {
      // SETUP con fake timers
      vi.useFakeTimers();

      // ACT
      service.beat('test');

      // Avanzar 59 segundos (menos que 60s)
      vi.advanceTimersByTime(59000);
      const result1 = service.isAlive();

      // Avanzar 2 segundos más (total 61s, más que 60s)
      vi.advanceTimersByTime(2000);
      const result2 = service.isAlive();

      // ASSERT
      expect(result1).toBe(true);
      expect(result2).toBe(false);

      vi.useRealTimers();
    });

    it('TEST 3.4: Beat reset el timeout', () => {
      // SETUP con fake timers
      vi.useFakeTimers();

      // ACT
      service.beat('first');

      // Avanzar 50 segundos
      vi.advanceTimersByTime(50000);
      expect(service.isAlive()).toBe(true);

      // Beat nuevamente
      service.beat('second');

      // Avanzar 50 segundos más (total sería 100s, pero beat reset el reloj)
      vi.advanceTimersByTime(50000);
      const result = service.isAlive();

      // ASSERT: Debe seguir vivo (solo 50s desde segundo beat)
      expect(result).toBe(true);

      vi.useRealTimers();
    });
  });

  // ========== TEST SUITE 4: Shutdown Recording ==========
  describe('TEST SUITE 4: Shutdown Recording', () => {
    it('TEST 4.1: shutdown() registra razón', () => {
      // ACT
      service.shutdown('SIGTERM received');

      // ASSERT
      expect(fs.existsSync(testHeartbeatFile)).toBe(true);

      const content = fs.readFileSync(testHeartbeatFile, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());

      const shutdownLine = lines.find(l => {
        try {
          const parsed = JSON.parse(l);
          return parsed.event === 'shutdown';
        } catch (e) {
          return false;
        }
      });

      expect(shutdownLine).toBeDefined();
      const shutdown = JSON.parse(shutdownLine!);
      expect(shutdown.reason).toBe('SIGTERM received');
      expect(shutdown.uptime).toBeDefined();
    });
  });

  // ========== TEST SUITE 5: Status Report ==========
  describe('TEST SUITE 5: Status Report', () => {
    it('TEST 5.1: getStatus() retorna objeto completo', () => {
      // ACT
      service.beat('test');
      const status = service.getStatus();

      // ASSERT
      expect(status.alive).toBe(true);
      expect(status.lastBeat).toBeDefined();
      expect(status.uptime).toBeGreaterThan(0);
      expect(status.pid).toBeDefined();
    });
  });
});
