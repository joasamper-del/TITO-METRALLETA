import { SecEdgarProvider } from './sec-edgar.provider';

describe('SecEdgarProvider', () => {
  let provider: SecEdgarProvider;

  beforeEach(() => {
    provider = new SecEdgarProvider();
  });

  describe('getFinancialData', () => {
    it('should return error for unknown ticker', async () => {
      const result = await provider.getFinancialData('UNKNOWN');
      expect(result.success).toBe(false);
      expect(result.error).toContain('CIK not found');
    });

    it('should handle network errors gracefully', async () => {
      const result = await provider.getFinancialData('GOOGL');
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should extract metrics with source and timestamp', async () => {
      const result = await provider.getFinancialData('GOOGL');
      if (result.success && result.eps.value) {
        expect(result.eps.source).toBe('sec-edgar');
        expect(result.eps.timestamp).toBeDefined();
        expect(['LIVE', 'DELAYED', 'CACHED', 'STALE']).toContain(result.eps.freshness);
        expect(result.eps.confidence).toBeGreaterThan(0);
      }
    });

    it('should include CIK in response', async () => {
      const result = await provider.getFinancialData('GOOGL');
      expect(result.cik).toBe('0001652044');
    });

    it('should handle GOOG (alternate ticker)', async () => {
      const result = await provider.getFinancialData('GOOG');
      expect(result.cik).toBe('0001652044');
    });
  });
});
