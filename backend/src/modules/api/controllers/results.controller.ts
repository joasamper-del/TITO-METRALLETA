import { Controller, Post, Body } from '@nestjs/common';
import { ResultsService } from '../services/results.service';
import { CreateResultDto } from '../dto';

@Controller('api/results')
export class ResultsController {
  constructor(private resultsService: ResultsService) {}

  @Post()
  async recordResult(@Body() createResultDto: CreateResultDto) {
    return this.resultsService.recordResult({
      opportunityId: createResultDto.opportunityId,
      result: createResultDto.result,
      points: createResultDto.points,
      successReasons: createResultDto.successReasons,
      failureReasons: createResultDto.failureReasons,
      lessons: createResultDto.lessons,
    });
  }
}
