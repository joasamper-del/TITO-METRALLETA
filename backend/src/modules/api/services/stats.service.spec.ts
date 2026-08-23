import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StatsService } from './stats.service';
import { TradeResult, Opportunity } from '../../database/entities';
import { Repository } from 'typeorm';

describe('StatsService', () => {
  let service: StatsService;
  let opportunityRepository: Repository<Opportunity>;
  let tradeResultRepository: Repository<TradeResult>;

  const mockOpportunityRepository = {
    find: jest.fn(),
  };

  const mockTradeResultRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StatsService,
        {
          provide: getRepositoryToken(Opportunity),
          useValue: mockOpportunityRepository,
        },
        {
          provide: getRepositoryToken(TradeResult),
          useValue: mockTradeResultRepository,
        },
      ],
    }).compile();

    service = module.get<StatsService>(StatsService);
    opportunityRepository = module.get(getRepositoryToken(Opportunity));
    tradeResultRepository = module.get(getRepositoryToken(TradeResult));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate stats correctly', async () => {
    mockOpportunityRepository.find.mockResolvedValue([]);
    mockTradeResultRepository.find.mockResolvedValue([]);

    const stats = await service.calculateStats();

    expect(stats).toHaveProperty('totalAnalyzed');
    expect(stats).toHaveProperty('wins');
    expect(stats).toHaveProperty('losses');
    expect(stats).toHaveProperty('winRate');
    expect(stats).toHaveProperty('lastUpdated');
  });
});
