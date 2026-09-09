import { Controller, Post, Body } from '@nestjs/common';
import { AnalyzeService } from '../services/analyze.service';
import { CreateAnalyzeDto } from '../dto';

@Controller('api/analyze')
export class AnalyzeController {
  constructor(private analyzeService: AnalyzeService) {}

  @Post()
  async analyze(@Body() createAnalyzeDto: CreateAnalyzeDto) {
    return this.analyzeService.analyze({
      symbol: createAnalyzeDto.symbol,
      strategy: createAnalyzeDto.strategy,
      plan: {
        entry: createAnalyzeDto.plan.entry,
        target: createAnalyzeDto.plan.target,
        stop: createAnalyzeDto.plan.stop,
        notes: createAnalyzeDto.plan.notes,
      },
    });
  }
}
