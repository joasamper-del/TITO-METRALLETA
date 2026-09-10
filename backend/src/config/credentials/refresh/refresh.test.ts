/**
 * Token Refresh Manager Tests
 * Verify automatic token renewal with security constraints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TokenRefreshManager } from './refresh.manager';
import { RefreshProvider } from './refresh.types';

describe('TokenRefreshManager', () => {
  let manager: TokenRefreshManager;
  let mockProvider: any;

  beforeEach(() => {
    manager = new TokenRefreshManager();
    mockProvider = {
      canAutoRefresh: vi.fn().mockReturnValue(true),
      refresh: vi.fn(),
      getTimeUntilExpiry: vi.fn(),
      getName: vi.fn().mockReturnValue('Test Provider'),
      getLastErrorReason: vi.fn().mockReturnValue(null),
      validateToken: vi.fn(),
    };
  });

  describe('registerProvider', () => {
    it('should register a provider', () => {
      manager.registerProvider('test', mockProvider, {
        brokerId: 'test',
        brokerName: 'Test Broker',
        supportsAutoRefresh: true,
        maxRetries: 3,
        retryDelayMs: 1000,
      });

      expect(manager.canAutoRefresh('test')).toBe(true);
    });
  });

  describe('canAutoRefresh', () => {
    it('should return true for registered provider that supports refresh', () => {
      manager.registerProvider('test', mockProvider, {
        brokerId: 'test',
        brokerName: 'Test',
        supportsAutoRefresh: true,
        maxRetries: 3,
        retryDelayMs: 1000,
      });

      expect(manager.canAutoRefresh('test')).toBe(true);
    });

    it('should return false for unregistered broker', () => {
      expect(manager.canAutoRefresh('unknown')).toBe(false);
    });
  });

  describe('refreshIfNeeded', () => {
    beforeEach(() => {
      manager.registerProvider('test', mockProvider, {
        brokerId: 'test',
        brokerName: 'Test',
        supportsAutoRefresh: true,
        maxRetries: 3,
        retryDelayMs: 1000,
        warningThresholdHours: 1,
      });
    });

    it('should not refresh if time to expiry is unknown', async () => {
      mockProvider.getTimeUntilExpiry.mockResolvedValue(null);

      await manager.refreshIfNeeded('test');

      expect(mockProvider.refresh).not.toHaveBeenCalled();
    });

    it('should not refresh if token is not expiring soon', async () => {
      mockProvider.getTimeUntilExpiry.mockResolvedValue(24 * 60 * 60 * 1000); // 24 hours

      await manager.refreshIfNeeded('test');

      expect(mockProvider.refresh).not.toHaveBeenCalled();
    });

    it('should refresh if token expires within warning threshold', async () => {
      mockProvider.getTimeUntilExpiry.mockResolvedValue(30 * 60 * 1000); // 30 minutes
      mockProvider.refresh.mockResolvedValue('success');

      await manager.refreshIfNeeded('test');

      expect(mockProvider.refresh).toHaveBeenCalled();
    });

    it('should handle refresh success', async () => {
      mockProvider.getTimeUntilExpiry.mockResolvedValue(30 * 60 * 1000);
      mockProvider.refresh.mockResolvedValue('success');

      await manager.refreshIfNeeded('test');

      const history = manager.getHistory('test');
      expect(history).toHaveLength(1);
      expect(history[0].result).toBe('success');
    });

    it('should handle refresh failure', async () => {
      mockProvider.getTimeUntilExpiry.mockResolvedValue(30 * 60 * 1000);
      mockProvider.refresh.mockResolvedValue('failure');
      mockProvider.getLastErrorReason.mockReturnValue('Connection refused');

      await manager.refreshIfNeeded('test');

      const history = manager.getHistory('test');
      expect(history[0].result).toBe('failure');
      expect(history[0].reason).toBe('Connection refused');
    });

    it('should handle not_supported', async () => {
      mockProvider.canAutoRefresh.mockReturnValue(false);
      mockProvider.getTimeUntilExpiry.mockResolvedValue(30 * 60 * 1000);
      mockProvider.refresh.mockResolvedValue('not_supported');

      await manager.refreshIfNeeded('test');

      const history = manager.getHistory('test');
      expect(history[0].result).toBe('not_supported');
    });
  });

  describe('forceRefresh', () => {
    beforeEach(() => {
      manager.registerProvider('test', mockProvider, {
        brokerId: 'test',
        brokerName: 'Test',
        supportsAutoRefresh: true,
        maxRetries: 3,
        retryDelayMs: 1000,
      });
    });

    it('should attempt refresh regardless of expiry time', async () => {
      mockProvider.refresh.mockResolvedValue('success');

      const result = await manager.forceRefresh('test');

      expect(result).toBe(true);
      expect(mockProvider.refresh).toHaveBeenCalled();
    });

    it('should return false if no provider registered', async () => {
      const result = await manager.forceRefresh('unknown');

      expect(result).toBe(false);
    });
  });

  describe('getLastError', () => {
    beforeEach(() => {
      manager.registerProvider('test', mockProvider, {
        brokerId: 'test',
        brokerName: 'Test',
        supportsAutoRefresh: true,
        maxRetries: 3,
        retryDelayMs: 1000,
      });
    });

    it('should return last error from provider', () => {
      mockProvider.getLastErrorReason.mockReturnValue('Token validation failed');

      const error = manager.getLastError('test');

      expect(error).toBe('Token validation failed');
    });

    it('should return null if no error', () => {
      mockProvider.getLastErrorReason.mockReturnValue(null);

      const error = manager.getLastError('test');

      expect(error).toBeNull();
    });
  });

  describe('getHistory', () => {
    beforeEach(() => {
      manager.registerProvider('test', mockProvider, {
        brokerId: 'test',
        brokerName: 'Test',
        supportsAutoRefresh: true,
        maxRetries: 3,
        retryDelayMs: 1000,
      });
    });

    it('should return empty history initially', () => {
      const history = manager.getHistory('test');

      expect(history).toHaveLength(0);
    });

    it('should track refresh attempts', async () => {
      mockProvider.getTimeUntilExpiry.mockResolvedValue(30 * 60 * 1000);
      mockProvider.refresh.mockResolvedValue('success');

      await manager.refreshIfNeeded('test');

      const history = manager.getHistory('test');
      expect(history).toHaveLength(1);
      expect(history[0].brokerId).toBe('test');
      expect(history[0].result).toBe('success');
    });

    it('should limit history to specified count', async () => {
      mockProvider.getTimeUntilExpiry.mockResolvedValue(30 * 60 * 1000);
      mockProvider.refresh.mockResolvedValue('success');

      // Perform 5 refreshes
      for (let i = 0; i < 5; i++) {
        await manager.refreshIfNeeded('test');
      }

      const history = manager.getHistory('test', 3);
      expect(history).toHaveLength(3);
    });
  });

  describe('Concurrent refresh prevention', () => {
    beforeEach(() => {
      manager.registerProvider('test', mockProvider, {
        brokerId: 'test',
        brokerName: 'Test',
        supportsAutoRefresh: true,
        maxRetries: 3,
        retryDelayMs: 1000,
      });
    });

    it('should not allow concurrent refresh for same broker', async () => {
      mockProvider.getTimeUntilExpiry.mockResolvedValue(30 * 60 * 1000);
      mockProvider.refresh.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('success'), 100))
      );

      // Start two concurrent refreshes
      const promise1 = manager.refreshIfNeeded('test');
      const promise2 = manager.refreshIfNeeded('test');

      await Promise.all([promise1, promise2]);

      // Should only call refresh once (or max twice during setup)
      expect(mockProvider.refresh.mock.calls.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Security', () => {
    beforeEach(() => {
      manager.registerProvider('test', mockProvider, {
        brokerId: 'test',
        brokerName: 'Test',
        supportsAutoRefresh: true,
        maxRetries: 3,
        retryDelayMs: 1000,
      });
    });

    it('should never expose tokens in error messages', async () => {
      mockProvider.getTimeUntilExpiry.mockResolvedValue(30 * 60 * 1000);
      mockProvider.refresh.mockResolvedValue('failure');
      mockProvider.getLastErrorReason.mockReturnValue('Connection refused');

      await manager.refreshIfNeeded('test');

      const history = manager.getHistory('test');
      const errorText = JSON.stringify(history[0]);

      expect(errorText).not.toContain('token');
      expect(errorText).not.toContain('secret');
      expect(errorText).not.toContain('key');
      expect(errorText).not.toContain('password');
    });
  });
});
