/**
 * Unit tests for CredentialManager
 * Verify load, validate, get operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CredentialManager } from './manager';
import {
  AlpacaBroker,
  MassiveBroker,
  SchwabBroker,
} from './brokers';
import {
  CredentialMissingError,
  CredentialNotFoundError,
  CredentialFieldMissingError,
} from './utils/errors';

describe('CredentialManager', () => {
  let manager: CredentialManager;

  beforeEach(() => {
    manager = new CredentialManager();
  });

  afterEach(() => {
    // Clean up env vars
    delete process.env.ALPACA_API_KEY;
    delete process.env.ALPACA_SECRET_KEY;
    delete process.env.MASSIVE_API_KEY;
    delete process.env.SCHWAB_CLIENT_ID;
    delete process.env.SCHWAB_CLIENT_SECRET;
  });

  describe('registerBroker', () => {
    it('should register a broker configuration', async () => {
      manager.registerBroker(AlpacaBroker);
      await manager.load();
      const status = manager.status();
      expect(status.brokers).toContainEqual(
        expect.objectContaining({ id: 'alpaca' })
      );
    });

    it('should allow multiple broker registrations', async () => {
      manager.registerBroker(AlpacaBroker);
      manager.registerBroker(MassiveBroker);
      await manager.load();
      const status = manager.status();
      expect(status.brokers.length).toBe(2);
    });
  });

  describe('load', () => {
    it('should load credentials from environment', async () => {
      process.env.ALPACA_API_KEY = 'test_key_123';
      process.env.ALPACA_SECRET_KEY = 'test_secret_456';

      manager.registerBroker(AlpacaBroker);
      await manager.load();

      const alpaca = manager.get('alpaca');
      expect(alpaca.isConfigured).toBe(true);
    });

    it('should mark broker as not configured if required fields missing', async () => {
      // Don't set any env vars
      manager.registerBroker(AlpacaBroker);
      await manager.load();

      const status = manager.status();
      const alpaca = status.brokers.find(b => b.id === 'alpaca');
      expect(alpaca?.configured).toBe(false);
    });

    it('should partially load optional fields', async () => {
      process.env.ALPACA_API_KEY = 'test_key';
      process.env.ALPACA_SECRET_KEY = 'test_secret';

      manager.registerBroker(AlpacaBroker);
      await manager.load();

      const credential = manager.get('alpaca');
      expect(credential.authType).toBe('static_key');
    });
  });

  describe('validate', () => {
    it('should return valid result when all required fields present', async () => {
      process.env.ALPACA_API_KEY = 'key';
      process.env.ALPACA_SECRET_KEY = 'secret';

      manager.registerBroker(AlpacaBroker);
      await manager.load();

      const result = manager.validate();
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should report errors for missing required fields', async () => {
      // Empty env
      manager.registerBroker(AlpacaBroker);
      await manager.load();

      const result = manager.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          brokerId: 'alpaca',
          message: expect.stringContaining('Missing'),
        })
      );
    });

    it('should handle multiple brokers in validation', async () => {
      process.env.ALPACA_API_KEY = 'key';
      process.env.ALPACA_SECRET_KEY = 'secret';
      // MASSIVE_API_KEY not set — should be missing

      manager.registerBroker(AlpacaBroker);
      manager.registerBroker(MassiveBroker);
      await manager.load();

      const result = manager.validate();
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(1);
      expect(result.errors[0].brokerId).toBe('massive');
    });
  });

  describe('get', () => {
    it('should return credential for configured broker', async () => {
      process.env.ALPACA_API_KEY = 'key';
      process.env.ALPACA_SECRET_KEY = 'secret';

      manager.registerBroker(AlpacaBroker);
      await manager.load();

      const credential = manager.get('alpaca');
      expect(credential.id).toBe('alpaca');
      expect(credential.isConfigured).toBe(true);
    });

    it('should throw CredentialNotFoundError for unknown broker', async () => {
      manager.registerBroker(AlpacaBroker);
      await manager.load();

      expect(() => manager.get('unknown_broker')).toThrow(CredentialNotFoundError);
    });

    it('should throw CredentialMissingError for unconfigured broker', async () => {
      manager.registerBroker(AlpacaBroker);
      await manager.load();

      expect(() => manager.get('alpaca')).toThrow(CredentialMissingError);
    });
  });

  describe('getSecret', () => {
    it('should return specific secret value', async () => {
      process.env.ALPACA_API_KEY = 'my_api_key';
      process.env.ALPACA_SECRET_KEY = 'my_secret';

      manager.registerBroker(AlpacaBroker);
      await manager.load();

      const apiKey = manager.getSecret('alpaca', 'ALPACA_API_KEY');
      expect(apiKey).toBe('my_api_key');
    });

    it('should throw CredentialFieldMissingError for missing field', async () => {
      manager.registerBroker(AlpacaBroker);
      await manager.load();

      expect(() => manager.getSecret('alpaca', 'ALPACA_API_KEY')).toThrow(
        CredentialFieldMissingError
      );
    });

    it('should throw CredentialNotFoundError for unknown broker', async () => {
      expect(() => manager.getSecret('unknown', 'SOME_FIELD')).toThrow(
        CredentialNotFoundError
      );
    });
  });

  describe('getSecrets', () => {
    it('should return all secrets for a broker', async () => {
      process.env.ALPACA_API_KEY = 'key123';
      process.env.ALPACA_SECRET_KEY = 'secret456';

      manager.registerBroker(AlpacaBroker);
      await manager.load();

      const secrets = manager.getSecrets('alpaca');
      expect(secrets.ALPACA_API_KEY).toBe('key123');
      expect(secrets.ALPACA_SECRET_KEY).toBe('secret456');
    });

    it('should throw if broker not configured', async () => {
      manager.registerBroker(AlpacaBroker);
      await manager.load();

      expect(() => manager.getSecrets('alpaca')).toThrow(CredentialMissingError);
    });
  });

  describe('status', () => {
    it('should report status of all brokers', async () => {
      process.env.ALPACA_API_KEY = 'key';
      process.env.ALPACA_SECRET_KEY = 'secret';

      manager.registerBroker(AlpacaBroker);
      manager.registerBroker(MassiveBroker);
      await manager.load();

      const status = manager.status();
      expect(status.brokers.length).toBe(2);
      expect(status.brokers[0].configured).toBe(true);
      expect(status.brokers[1].configured).toBe(false);
    });

    it('should set isReady to false if any broker missing', async () => {
      manager.registerBroker(AlpacaBroker);
      manager.registerBroker(MassiveBroker);
      await manager.load();

      const status = manager.status();
      expect(status.isReady).toBe(false);
    });

    it('should set isReady to true if all brokers configured', async () => {
      process.env.ALPACA_API_KEY = 'key';
      process.env.ALPACA_SECRET_KEY = 'secret';
      process.env.MASSIVE_API_KEY = 'massive_key';

      manager.registerBroker(AlpacaBroker);
      manager.registerBroker(MassiveBroker);
      await manager.load();

      const status = manager.status();
      expect(status.isReady).toBe(true);
    });
  });

  describe('isReady', () => {
    it('should return true when all brokers configured', async () => {
      process.env.ALPACA_API_KEY = 'key';
      process.env.ALPACA_SECRET_KEY = 'secret';

      manager.registerBroker(AlpacaBroker);
      await manager.load();

      expect(manager.isReady()).toBe(true);
    });

    it('should return false when any broker missing', async () => {
      manager.registerBroker(AlpacaBroker);
      manager.registerBroker(MassiveBroker);
      await manager.load();

      expect(manager.isReady()).toBe(false);
    });
  });

  describe('getMissing', () => {
    it('should list all unconfigured brokers', async () => {
      manager.registerBroker(AlpacaBroker);
      manager.registerBroker(MassiveBroker);
      manager.registerBroker(SchwabBroker);
      await manager.load();

      const missing = manager.getMissing();
      expect(missing).toContain('alpaca');
      expect(missing).toContain('massive');
      expect(missing).toContain('schwab');
    });

    it('should return empty list when all configured', async () => {
      process.env.ALPACA_API_KEY = 'key';
      process.env.ALPACA_SECRET_KEY = 'secret';

      manager.registerBroker(AlpacaBroker);
      await manager.load();

      const missing = manager.getMissing();
      expect(missing.length).toBe(0);
    });
  });
});
