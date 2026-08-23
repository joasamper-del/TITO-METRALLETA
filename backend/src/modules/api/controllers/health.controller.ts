import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return {
      status: 'ok',
      message: '🎯 Tito Metralleta - Sistema de Análisis de Trading',
      timestamp: new Date().toISOString(),
    };
  }
}
