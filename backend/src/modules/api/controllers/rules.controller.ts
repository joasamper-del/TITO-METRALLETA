import { Controller, Get, Put, Param, Body } from '@nestjs/common';
import { RulesService } from '../services/rules.service';

@Controller('api/rules')
export class RulesController {
  constructor(private rulesService: RulesService) {}

  @Get()
  getRules() {
    return {
      rules: this.rulesService.getRules(),
    };
  }

  @Put(':id')
  updateRule(
    @Param('id') id: string,
    @Body() updates: { weight?: number; enabled?: boolean },
  ) {
    return this.rulesService.updateRule(id, updates);
  }
}
