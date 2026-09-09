/**
 * VolumeConfirmation - Valida volumen en 4 capas
 *
 * Teoría: El volumen que acompaña a la acción de precio es crítico.
 * No es solo "volumen > promedio", sino estructura de volumen.
 */

import { MarketData, StrategyName } from "../types/Strategy";

export interface VolumeLayer {
  name: string;
  condition: boolean;
  description: string;
  weight: number;
}

export interface VolumeConfirmationResult {
  isConfirmed: boolean; // Layer1 ✅ Y (Layer2 ✅ O Layer3 ✅)
  layer1: VolumeLayer;
  layer2: VolumeLayer;
  layer3: VolumeLayer;
  layer4: VolumeLayer;
  explanation: string;
  confidence: number; // 0-100
}

export class VolumeConfirmation {
  /**
   * Analiza volumen en 4 capas
   *
   * Flujo:
   * 1. Volumen absoluto > promedio
   * 2. Volumen en precio de entrada > percentil 75
   * 3. Volumen acelerado hacia cierre
   * 4. Volumen en breakout es participado
   *
   * ENTRADA VÁLIDA si: Layer1 ✅ Y (Layer2 ✅ O Layer3 ✅)
   */
  public async analyze(
    marketData: MarketData,
    strategy: StrategyName
  ): Promise<VolumeConfirmationResult> {
    // LAYER 1: Volumen absoluto
    const layer1 = this.evaluateLayer1_VolumeAbsolute(marketData);

    // LAYER 2: Volumen en precio de entrada
    const layer2 = this.evaluateLayer2_VolumeAtPrice(marketData);

    // LAYER 3: Distribución intraday (volumen acelerado)
    const layer3 = this.evaluateLayer3_VolumeDistribution(marketData);

    // LAYER 4: Volumen en breakout
    const layer4 = this.evaluateLayer4_VolumeBreakout(marketData);

    // Decisión
    const isConfirmed = layer1.condition && (layer2.condition || layer3.condition);

    // Explicación
    const explanation = this.buildExplanation(layer1, layer2, layer3, layer4, isConfirmed);

    // Confianza (0-100)
    const confidence = this.calculateConfidence(layer1, layer2, layer3, layer4, isConfirmed);

    return {
      isConfirmed,
      layer1,
      layer2,
      layer3,
      layer4,
      explanation,
      confidence,
    };
  }

  /**
   * LAYER 1: Volumen absoluto
   * Condición: current_vol > avg_30bar_vol × 1.2
   */
  private evaluateLayer1_VolumeAbsolute(marketData: MarketData): VolumeLayer {
    const avgVol = marketData.volumeAvg30 || marketData.volume;
    const condition = marketData.volume > avgVol * 1.2;

    return {
      name: "Volumen Absoluto",
      condition,
      description: `Vol actual ${marketData.volume} vs promedio ${avgVol}`,
      weight: 0.3,
    };
  }

  /**
   * LAYER 2: Volumen en precio de entrada
   * Condición: vol_at_entry_level > percentile_75(vol_history)
   *
   * Nota: En tiempo real esto requeriría histórico de volumen intraday
   * Por ahora simplificamos: si volumen está arriba del promedio
   */
  private evaluateLayer2_VolumeAtPrice(marketData: MarketData): VolumeLayer {
    const avgVol = marketData.volumeAvg30 || marketData.volume;
    // Heurística: Si volumen es 1.5x+ promedio, hay participación en el nivel
    const condition = marketData.volume > avgVol * 1.5;

    return {
      name: "Volumen en Nivel de Precio",
      condition,
      description: `Vol ${marketData.volume} > ${avgVol * 1.5} (1.5x promedio)`,
      weight: 0.25,
    };
  }

  /**
   * LAYER 3: Distribución intraday
   * Condición: vol_últimos_30min > vol_primeros_30min × 1.3
   *
   * Nota: También simplificado (requeriría datos intraday 1m)
   * Heurística: Asumir que si volumen es muy alto, fue acelerado hacia cierre
   */
  private evaluateLayer3_VolumeDistribution(marketData: MarketData): VolumeLayer {
    const avgVol = marketData.volumeAvg30 || marketData.volume;
    // Si volumen >> promedio, probablemente fue acelerado (momentum)
    const condition = marketData.volume > avgVol * 1.8;

    return {
      name: "Aceleración de Volumen",
      condition,
      description: `Vol ${marketData.volume} > ${avgVol * 1.8} (volumen acelerado)`,
      weight: 0.2,
    };
  }

  /**
   * LAYER 4: Volumen en breakout
   * Condición: vol_at_breakout > avg_vol × 1.5
   * (Rotura de resistencia/soporte con participación)
   */
  private evaluateLayer4_VolumeBreakout(marketData: MarketData): VolumeLayer {
    const avgVol = marketData.volumeAvg30 || marketData.volume;
    const condition = marketData.volume > avgVol * 1.5;

    return {
      name: "Volumen en Breakout",
      condition,
      description: `Vol ${marketData.volume} > ${avgVol * 1.5} (breakout participado)`,
      weight: 0.25,
    };
  }

  /**
   * Calcula confianza (0-100) basado en cuántas capas pasaron
   */
  private calculateConfidence(
    layer1: VolumeLayer,
    layer2: VolumeLayer,
    layer3: VolumeLayer,
    layer4: VolumeLayer,
    isConfirmed: boolean
  ): number {
    if (!isConfirmed) return 20; // Mínima si no confirmado

    const passedLayers = [
      layer1.condition,
      layer2.condition,
      layer3.condition,
      layer4.condition,
    ].filter(Boolean).length;

    // Si pasaron 4/4 → 95%
    // Si pasaron 3/4 → 75%
    // Si pasaron 2/4 (min) → 50%
    const baseConfidence = 50 + (passedLayers - 2) * 15;
    return Math.min(95, baseConfidence);
  }

  /**
   * Genera explicación en lenguaje natural
   */
  private buildExplanation(
    layer1: VolumeLayer,
    layer2: VolumeLayer,
    layer3: VolumeLayer,
    layer4: VolumeLayer,
    isConfirmed: boolean
  ): string {
    let text = "Análisis de volumen: ";

    if (isConfirmed) {
      text += "✅ CONFIRMADO. ";
    } else {
      text += "❌ NO CONFIRMADO. ";
    }

    const layers = [layer1, layer2, layer3, layer4];
    const passed = layers.filter((l) => l.condition);
    const failed = layers.filter((l) => !l.condition);

    if (passed.length > 0) {
      text += `Capas OK: ${passed.map((l) => l.name).join(", ")}. `;
    }
    if (failed.length > 0 && !isConfirmed) {
      text += `Capas fallidas: ${failed.map((l) => l.name).join(", ")}.`;
    }

    return text;
  }
}
