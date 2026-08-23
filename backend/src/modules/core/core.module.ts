import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataEngine } from '../../../src/engines/dataEngine';
import { RulesEngine } from '../../../src/engines/rulesEngine';
import { ReportEngine } from '../../../src/engines/reportEngine';
import { TitoMetralletaAnalyzer } from '../../../src/core/analyzer';

@Module({
  providers: [
    {
      provide: 'DATA_ENGINE',
      useFactory: (configService: ConfigService) => {
        const alphaVantageKey = configService.get<string>('ALPHA_VANTAGE_KEY', '');
        const finnhubKey = configService.get<string>('FINNHUB_KEY', '');
        return new DataEngine(alphaVantageKey, finnhubKey);
      },
      inject: [ConfigService],
    },
    {
      provide: 'RULES_ENGINE',
      useFactory: () => new RulesEngine(),
    },
    {
      provide: 'REPORT_ENGINE',
      useFactory: () => new ReportEngine(),
    },
    {
      provide: 'ANALYZER',
      useFactory: (configService: ConfigService) => {
        const alphaVantageKey = configService.get<string>('ALPHA_VANTAGE_KEY', '');
        const finnhubKey = configService.get<string>('FINNHUB_KEY', '');
        return new TitoMetralletaAnalyzer(alphaVantageKey, finnhubKey);
      },
      inject: [ConfigService],
    },
  ],
  exports: ['DATA_ENGINE', 'RULES_ENGINE', 'REPORT_ENGINE', 'ANALYZER'],
})
export class CoreModule {}
