import { Injectable, Inject } from '@nestjs/common';
import { RulesEngine } from '../../../../src/engines/rulesEngine';

export interface RuleDto {
  id: string;
  name: string;
  weight: number;
  enabled: boolean;
  description: string;
}

@Injectable()
export class RulesService {
  private rules: Map<string, RuleDto> = new Map();

  constructor(@Inject('RULES_ENGINE') private rulesEngine: RulesEngine) {
    this.initializeRules();
  }

  private initializeRules() {
    const defaultRules: RuleDto[] = [
      {
        id: 'trend_bullish',
        name: 'Tendencia Alcista',
        weight: 25,
        enabled: true,
        description: 'Verifica si la tendencia es alcista',
      },
      {
        id: 'premium_zone',
        name: 'Zona Premium',
        weight: 25,
        enabled: true,
        description: 'Precio en zona premium (por encima de promedio)',
      },
      {
        id: 'high_volume',
        name: 'Volumen Alto',
        weight: 20,
        enabled: true,
        description: 'Volumen de trading por encima del promedio',
      },
      {
        id: 'positive_gex',
        name: 'GEX Positivo',
        weight: 20,
        enabled: true,
        description: 'Gamma Exposure positivo',
      },
      {
        id: 'rsi_not_overbought',
        name: 'RSI No Sobrecomprado',
        weight: 10,
        enabled: true,
        description: 'RSI por debajo de 70 (no sobrecomprado)',
      },
      {
        id: 'spy_bullish',
        name: 'Contexto SPY Alcista',
        weight: 15,
        enabled: true,
        description: 'Índice SPY en tendencia alcista',
      },
      {
        id: 'low_vix',
        name: 'VIX Bajo',
        weight: 10,
        enabled: true,
        description: 'Volatilidad baja (VIX < 20)',
      },
      {
        id: 'sufficient_liquidity',
        name: 'Liquidez Suficiente',
        weight: 10,
        enabled: true,
        description: 'Volumen suficiente para trading',
      },
      {
        id: 'time_to_close',
        name: 'Tiempo al Cierre',
        weight: 5,
        enabled: true,
        description: 'Tiempo suficiente antes del cierre de mercado',
      },
      {
        id: 'important_level',
        name: 'Precio en Nivel Importante',
        weight: 15,
        enabled: true,
        description: 'Precio cerca de soporte/resistencia',
      },
    ];

    defaultRules.forEach((rule) => {
      this.rules.set(rule.id, rule);
    });
  }

  getRules(): RuleDto[] {
    return Array.from(this.rules.values());
  }

  getRule(id: string): RuleDto | null {
    return this.rules.get(id) || null;
  }

  updateRule(id: string, updates: Partial<RuleDto>): RuleDto {
    const rule = this.rules.get(id);
    if (!rule) {
      throw new Error(`Rule ${id} not found`);
    }

    const updated = { ...rule, ...updates, id: rule.id };
    this.rules.set(id, updated);
    return updated;
  }

  getRuleEffectiveness(): Record<string, any> {
    return Array.from(this.rules.values()).reduce(
      (acc, rule) => {
        acc[rule.id] = {
          name: rule.name,
          weight: rule.weight,
          enabled: rule.enabled,
          effectiveness: 0,
        };
        return acc;
      },
      {} as Record<string, any>,
    );
  }
}
