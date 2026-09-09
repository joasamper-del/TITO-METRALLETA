/**
 * GuardianSecretMasker Unit Tests
 *
 * Verify that all secrets are properly masked with zero exposure.
 */

import { GuardianSecretMasker } from './guardian-secret-masker';

describe('GuardianSecretMasker', () => {
  let masker: GuardianSecretMasker;

  beforeEach(() => {
    masker = new GuardianSecretMasker();
  });

  describe('maskSecrets', () => {
    it('should mask API keys', () => {
      const input = 'apiKey: PKZJACBLG2RGWLHBJSCXHXXYZB is secret';
      const result = masker.maskSecrets(input);
      expect(result).not.toContain('PKZJACBLG2RGWLHBJSCXHXXYZB');
      expect(result).toContain('***MASKED_');
    });

    it('should mask tokens', () => {
      const input = 'authorization: Bearer abc123xyz789token';
      const result = masker.maskSecrets(input);
      expect(result).not.toContain('abc123xyz789token');
      expect(result).toContain('***MASKED_');
    });

    it('should mask passwords', () => {
      const input = 'password: Joa$03111974@postgres';
      const result = masker.maskSecrets(input);
      expect(result).not.toContain('Joa$03111974');
      expect(result).toContain('***MASKED_');
    });

    it('should mask cookies', () => {
      const input = 'cookie: ab8c6663270b4b8ab1600b0c690cfb59=session123';
      const result = masker.maskSecrets(input);
      expect(result).not.toContain('ab8c6663270b4b8ab1600b0c690cfb59');
      expect(result).toContain('***MASKED_');
    });

    it('should mask URLs with credentials', () => {
      const input = 'URL: postgresql://user:pass123@localhost:5432/db';
      const result = masker.maskSecrets(input);
      expect(result).not.toContain('pass123');
      expect(result).toContain('***MASKED_');
    });

    it('should handle empty strings', () => {
      const result = masker.maskSecrets('');
      expect(result).toBe('');
    });

    it('should handle strings with no secrets', () => {
      const input = 'This is safe data with no secrets';
      const result = masker.maskSecrets(input);
      expect(result).toBe(input);
    });
  });

  describe('maskSecretsInObject', () => {
    it('should mask secret fields in objects', () => {
      const obj = {
        username: 'user',
        apiKey: 'secret123',
        password: 'pass456',
      };
      const result = masker.maskSecretsInObject(obj);
      expect(result.apiKey).toBe('***MASKED***');
      expect(result.password).toBe('***MASKED***');
      expect(result.username).toBe('user'); // not a secret field
    });

    it('should mask nested objects', () => {
      const obj = {
        provider: {
          apiKey: 'key123',
          credentials: {
            token: 'token456',
          },
        },
      };
      const result = masker.maskSecretsInObject(obj);
      expect(result.provider.apiKey).toBe('***MASKED***');
      expect(result.provider.credentials.token).toBe('***MASKED***');
    });

    it('should mask arrays', () => {
      const obj = {
        keys: ['key1', 'key2'],
        apiKeys: ['secret1', 'secret2'],
      };
      const result = masker.maskSecretsInObject(obj);
      expect(result.apiKeys[0]).toBe('***MASKED***');
      expect(result.keys[0]).toBe('key1'); // not secret field
    });

    it('should handle null and undefined', () => {
      expect(masker.maskSecretsInObject(null)).toBe(null);
      expect(masker.maskSecretsInObject(undefined)).toBe(undefined);
    });
  });

  describe('findSecrets', () => {
    it('should detect API keys', () => {
      const input = 'apiKey: PKZJACBLG2RGWLHBJSCXHXXYZB';
      const found = masker.findSecrets(input);
      expect(found.length).toBeGreaterThan(0);
      expect(found[0].type).toContain('API');
    });

    it('should detect multiple secrets', () => {
      const input = 'apiKey: secret1 and token: secret2 and password: secret3';
      const found = masker.findSecrets(input);
      expect(found.length).toBeGreaterThanOrEqual(2);
    });

    it('should return empty array for safe input', () => {
      const input = 'This is completely safe data';
      const found = masker.findSecrets(input);
      expect(found.length).toBe(0);
    });
  });

  describe('Integration: Realistic Scenarios', () => {
    it('should mask error messages', () => {
      const errorMsg = 'Failed to connect to Alpaca: API key PKZJACBLG2RGWLHBJSCXHXXYZB timeout';
      const masked = masker.maskSecrets(errorMsg);
      expect(masked).not.toContain('PKZJACBLG2RGWLHBJSCXHXXYZB');
    });

    it('should mask database URLs', () => {
      const dbUrl = 'postgresql://enterprisedb:Joa$03111974@127.0.0.1:5432/tito';
      const masked = masker.maskSecrets(dbUrl);
      expect(masked).not.toContain('Joa$03111974');
      expect(masked).not.toContain('enterprisedb');
    });

    it('should mask environment output', () => {
      const envOutput = `
        ALPACA_KEY=PKZJACBLG2RGWLHBJSCXHXXYZB
        MASSIVE_API_KEY=P_OHpvIVYT3V3aJrQnprDwOT_pMU4ce4
        NEWSAPI_KEY=abc123xyz
        DATABASE_URL=postgresql://user:pass@host:5432/db
      `;
      const masked = masker.maskSecrets(envOutput);
      expect(masked).not.toContain('PKZJACBLG2RGWLHBJSCXHXXYZB');
      expect(masked).not.toContain('P_OHpvIVYT3V3aJrQnprDwOT_pMU4ce4');
      expect(masked).not.toContain('pass');
    });
  });
});
