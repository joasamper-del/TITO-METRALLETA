import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): { message: string; version: string; status: string } {
    return {
      message: '🎯 Tito Metralleta - Sistema de Análisis de Trading',
      version: '0.1.0',
      status: 'ready',
    };
  }
}
