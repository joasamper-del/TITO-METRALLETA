import { Test, TestingModule } from '@nestjs/testing';
import { RulesService } from './rules.service';

describe('RulesService', () => {
  let service: RulesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RulesService,
        {
          provide: 'RULES_ENGINE',
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<RulesService>(RulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return all rules', () => {
    const rules = service.getRules();
    expect(rules).toHaveLength(10);
    expect(rules[0]).toHaveProperty('id');
    expect(rules[0]).toHaveProperty('name');
    expect(rules[0]).toHaveProperty('weight');
    expect(rules[0]).toHaveProperty('enabled');
  });

  it('should update a rule', () => {
    const updated = service.updateRule('trend_bullish', { weight: 35 });
    expect(updated.weight).toBe(35);
    expect(updated.id).toBe('trend_bullish');
  });

  it('should throw error for non-existent rule', () => {
    expect(() => {
      service.updateRule('non_existent', { weight: 10 });
    }).toThrow();
  });
});
