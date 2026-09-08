import { InvestorRelationsProvider } from './investor-relations.provider';

describe('InvestorRelationsProvider', () => {
  let provider: InvestorRelationsProvider;

  beforeEach(() => {
    provider = new InvestorRelationsProvider();
  });

  describe('getIrData', () => {
    it('should return error for unknown ticker', async () => {
      const result = await provider.getIrData('UNKNOWN');
      expect(result.success).toBe(false);
      expect(result.error).toContain('IR URL not found');
    });

    it('should extract IR data with source attribution', async () => {
      const result = await provider.getIrData('GOOGL');
      expect(result.ticker).toBe('GOOGL');
      expect(result.company).toContain('Alphabet');
    });

    it('should include timestamps in all metrics', async () => {
      const result = await provider.getIrData('GOOGL');
      expect(result.nextEarningsDate.timestamp).toBeDefined();
      expect(result.guidance.timestamp).toBeDefined();
      expect(result.lastUpdate.timestamp).toBeDefined();
    });

    it('should assign freshness status', async () => {
      const result = await provider.getIrData('GOOGL');
      if (result.nextEarningsDate.date) {
        expect(['LIVE', 'DELAYED', 'CACHED', 'STALE']).toContain(result.nextEarningsDate.freshness);
      }
    });

    it('should track source as investor-relations', async () => {
      const result = await provider.getIrData('GOOGL');
      expect(result.nextEarningsDate.source).toBe('investor-relations');
      expect(result.guidance.source).toBe('investor-relations');
      expect(result.lastUpdate.source).toBe('investor-relations');
    });
  });
});
