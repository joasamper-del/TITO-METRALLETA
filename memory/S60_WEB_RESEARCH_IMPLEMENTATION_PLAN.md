# 🚀 Session 60 - Web Research Implementation Plan
**Estructura:** Simple y accionable  
**Objetivo:** Tito investiga → valida → explica antes de operar  
**Estado:** LISTO PARA IMPLEMENTAR

---

## 🎯 Visión

**ANTES (Hoy):**
```
Precio ↗ → Indicador técnico ✅ → Proponer operación
```

**DESPUÉS (Con investigación):**
```
Indicador técnico ✅ 
  ↓
¿Hay noticias relevantes? / ¿Evento próximo? / ¿Earnings cerca?
  ↓
Investigación web + datos fundamentales
  ↓
Análisis cruzado (técnico + mercado + research)
  ↓
Explicar razones (con citas)
  ↓
Proponer operación CONTRASTADA
```

---

## 📋 PRIORIDAD UNO: Motor de Investigación Web

### Objetivo
Implementar búsqueda de:
- ✅ Noticias recientes por ticker
- ✅ Calendario económico del día
- ✅ Eventos clave (earnings, splits, regulación)
- ✅ Datos fundamentales básicos (fuentes oficiales)

### Especificación Técnica

#### 1.1 WebResearchService (Nueva clase)
```typescript
// backend/src/modules/research/web-research.service.ts

interface WebResearchContext {
  ticker: string;
  timeframe?: 'today' | '1week' | '1month';
  focusAreas?: ('news' | 'earnings' | 'economics' | 'fundamentals')[];
}

interface ResearchResult {
  ticker: string;
  news: NewsItem[];           // Últimas noticias
  economicEvents: EconomicEvent[]; // Calendario del día
  upcomingEvents: {
    earnings?: Date;
    splits?: Date;
    dividerDate?: Date;
    regulatoryEvents?: string[];
  };
  fundamentals: {
    pe?: number;              // De fuente oficial
    dividend?: number;
    marketCap?: number;
    source: 'yahoo' | 'sec' | 'google' | 'cached';
    freshness: 'realtime' | 'today' | 'stale';
  };
  timestamp: Date;
  sources: SourceCitation[];  // Dónde vinieron los datos
}

interface SourceCitation {
  type: 'news' | 'official' | 'calendar' | 'market';
  outlet: string;             // Reuters, SEC, Yahoo, etc.
  url: string;
  date: Date;
  reliability: 'high' | 'medium' | 'low';
}

export class WebResearchService {
  // Ejecutar investigación completa
  async investigate(context: WebResearchContext): Promise<ResearchResult>;
  
  // Componentes individuales
  async searchNews(ticker: string): Promise<NewsItem[]>;
  async getEconomicCalendar(): Promise<EconomicEvent[]>;
  async checkUpcomingEvents(ticker: string): Promise<UpcomingEvents>;
  async getFundamentals(ticker: string): Promise<FundamentalData>;
  
  // Validación
  async verifySources(result: ResearchResult): Promise<VerificationScore>;
}
```

#### 1.2 Integración de Datos

**Fuentes por tipo:**

| Tipo | Fuente Principal | Fallback | Costo | Latencia |
|------|------------------|----------|-------|----------|
| **News** | NewsAPI | MarketWatch RSS | $50/mo | 5-15min |
| **Economic Calendar** | Investing.com | TradingEconomics | Free | Realtime |
| **Earnings Calendar** | Yahoo Finance | SEC Edgar | Free | Realtime |
| **Fundamentals** | SEC Edgar | Yahoo Finance | Free | EOD |
| **Market Data** | Massive (ya integrado) | Alpaca | ✅ | Realtime |

#### 1.3 Configuración ENV

```bash
# .env.local

# NEWS API
NEWS_API_KEY=your_key_here
NEWS_API_BASE=https://newsapi.org/v2

# ECONOMIC CALENDAR (si es pago)
ECONOMIC_CALENDAR_KEY=optional

# SEC EDGAR (free)
SEC_API_BASE=https://data.sec.gov/api/xbrl

# YAHOO FINANCE (free, no auth)
YAHOO_FINANCE_BASE=finance.yahoo.com
```

### Deliverables

**Tests:** 15/15 mínimo
```
✅ News search por ticker
✅ Economic calendar parsing
✅ Earnings detection
✅ Fundamental extraction
✅ Source validation
✅ Data freshness check
✅ Fallback chain (si API 1 falla)
✅ Error handling (no operation sin datos)
✅ Caching (no repetir búsquedas)
✅ Rate limiting compliance
✅ Citation formatting
✅ Timezone handling
✅ Multi-language parsing
✅ Stale data detection
✅ Confidence scoring
```

**Esfuerzo estimado:** 1-2 semanas

---

## 📋 PRIORIDAD DOS: Pre-Operación Checklist

### Objetivo
Antes de proponer cualquier operación, Tito pregunta automáticamente:
```
"¿Hay noticias relevantes? 
 ¿Hay un evento próximo? 
 ¿Hay un reporte de ganancias cerca?"
```

### Implementación

#### 2.1 PreOperationValidator (Nueva clase)
```typescript
// backend/strategyLibrary/execution/preOperationValidator.ts

export class PreOperationValidator {
  constructor(
    private researchService: WebResearchService,
    private decisionAuditService: DecisionAuditService
  ) {}

  /**
   * ANTES de ejecutar/proponer trade:
   * - Obtiene research context
   * - Evalúa riesgos de investigación
   * - Decide: PROCEED vs HOLD vs CONTRADICT
   */
  async validateTradeProposal(
    proposal: TradeProposal
  ): Promise<{
    approved: boolean;
    reasoning: string;
    researchContext: ResearchResult;
    risks: RiskFactor[];
  }> {
    // 1. Investigar el ticker
    const research = await this.researchService.investigate({
      ticker: proposal.symbol,
      timeframe: 'today',
      focusAreas: ['news', 'earnings', 'economics']
    });

    // 2. Evaluar riesgos
    const risks = this.evaluateResearchRisks(research, proposal);

    // 3. Decidir
    const approved = this.makeDecision(research, risks, proposal);

    // 4. Registrar decisión PRE-OPERACIÓN
    await this.decisionAuditService.logPreOperationCheck({
      proposal,
      research,
      risks,
      approved,
      timestamp: new Date()
    });

    return {
      approved,
      reasoning: this.buildReasoning(research, risks),
      researchContext: research,
      risks
    };
  }

  private evaluateResearchRisks(
    research: ResearchResult,
    proposal: TradeProposal
  ): RiskFactor[] {
    const risks: RiskFactor[] = [];

    // Riesgo 1: Earnings próximo
    if (research.upcomingEvents.earnings) {
      const daysUntilEarnings = Math.ceil(
        (research.upcomingEvents.earnings.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilEarnings <= 5) {
        risks.push({
          type: 'earnings_imminent',
          severity: daysUntilEarnings === 0 ? 'critical' : 'high',
          description: `Earnings in ${daysUntilEarnings} days`,
          recommendation: 'HOLD - Esperar earnings para reducir volatilidad'
        });
      }
    }

    // Riesgo 2: Noticias negativas recientes
    const negativeNews = research.news.filter(n => 
      n.sentiment === 'negative' && this.isRecent(n.publishedAt, 24) // últimas 24h
    );
    if (negativeNews.length > 0) {
      risks.push({
        type: 'negative_news',
        severity: negativeNews.length > 2 ? 'high' : 'medium',
        description: `${negativeNews.length} negative articles in last 24h`,
        articles: negativeNews,
        recommendation: 'CAUTION - Verificar que propuesta tiene edge después de noticias'
      });
    }

    // Riesgo 3: Evento económico del día
    if (research.economicEvents.length > 0) {
      const highImpact = research.economicEvents.filter(e => e.impact === 'high');
      if (highImpact.length > 0) {
        risks.push({
          type: 'economic_event',
          severity: 'high',
          description: `${highImpact.length} high-impact events today`,
          events: highImpact,
          recommendation: 'CAUTION - Esperar después de eventos económicos'
        });
      }
    }

    // Riesgo 4: Datos fundamentales stale
    if (research.fundamentals.freshness === 'stale') {
      risks.push({
        type: 'stale_fundamentals',
        severity: 'low',
        description: 'Fundamental data is >7 days old',
        recommendation: 'INFO - Buscar datos más frescos'
      });
    }

    return risks;
  }

  private makeDecision(
    research: ResearchResult,
    risks: RiskFactor[],
    proposal: TradeProposal
  ): boolean {
    // Lógica de decisión:
    const criticalRisks = risks.filter(r => r.severity === 'critical');
    
    // CRITICAL: SIEMPRE rechazar si hay riesgos críticos
    if (criticalRisks.length > 0) {
      return false; // HOLD
    }

    // HIGH: Evaluar si el trade tiene suficiente edge
    const highRisks = risks.filter(r => r.severity === 'high');
    if (highRisks.length > 0) {
      // Solo proceder si confidence del trade es >= 75%
      return proposal.confidence >= 0.75;
    }

    // MEDIUM: Proceder con cautela
    // BAJA: Proceder normalmente
    return true;
  }

  private buildReasoning(
    research: ResearchResult,
    risks: RiskFactor[]
  ): string {
    let reasoning = `Research context for ${research.ticker}:\n`;
    reasoning += `  News articles: ${research.news.length}\n`;
    reasoning += `  Economic events today: ${research.economicEvents.length}\n`;
    
    if (research.upcomingEvents.earnings) {
      reasoning += `  Earnings: ${research.upcomingEvents.earnings.toDateString()}\n`;
    }
    
    if (risks.length > 0) {
      reasoning += `\nRisks identified:\n`;
      risks.forEach(r => {
        reasoning += `  - ${r.type}: ${r.recommendation}\n`;
      });
    }
    
    return reasoning;
  }

  private isRecent(date: Date, hours: number): boolean {
    return (Date.now() - date.getTime()) < (hours * 60 * 60 * 1000);
  }
}
```

#### 2.2 Integración en OperationManager

```typescript
// strategyLibrary/execution/operationManager.ts (MODIFICADO)

export class OperationManager {
  constructor(
    private preValidator: PreOperationValidator,
    private executionEngine: ExecutionEngine,
    ...
  ) {}

  async proposeOperation(signal: TradingSignal): Promise<ProposalResult> {
    // Paso 0: PRE-OPERACIÓN CHECK (NUEVO)
    const preOp = await this.preValidator.validateTradeProposal({
      symbol: signal.symbol,
      direction: signal.direction,
      confidence: signal.confidence,
      // ... otros campos
    });

    if (!preOp.approved) {
      return {
        status: 'HELD',
        reason: preOp.reasoning,
        researchContext: preOp.researchContext,
        risks: preOp.risks
      };
    }

    // Paso 1-5: Proceso normal de operación
    const result = await this.executeNormalFlow(signal, preOp);
    
    return result;
  }
}
```

### Deliverables

**Tests:** 12/12 mínimo
```
✅ Detects earnings within 5 days
✅ Flags negative news (24h window)
✅ Detects economic events
✅ Identifies stale data
✅ Calculates risk severity
✅ Makes HOLD decision on critical risk
✅ Makes CAUTION decision on high risk
✅ Allows PROCEED on low/medium risk
✅ Generates human-readable reasoning
✅ Logs to audit trail
✅ Handles multiple risks
✅ Timezone edge cases
```

**Esfuerzo estimado:** 1 semana

---

## 📋 PRIORIDAD TRES: "Contexto del Mercado" Panel Block

### Objetivo
Mostrar en `/strategy` dashboard un bloque que diga:

```
┌─────────────────────────────────────────┐
│ CONTEXTO DEL MERCADO (SPY)              │
├─────────────────────────────────────────┤
│ 📰 Noticias recientes:                  │
│   • FED aprueba alza de 0.5%            │
│     Reuters (2024-09-07 14:30 UTC)      │
│   • Datos empleo mejor esperado         │
│     Bloomberg (2024-09-06 10:15 UTC)    │
│                                         │
│ 📅 Eventos próximos:                    │
│   • Earnings: 2024-09-15 (8 días)       │
│   • Fed Meeting: 2024-09-18             │
│   • Economic data: Today 10:30 (CPI)    │
│                                         │
│ 💹 Fundamentales:                       │
│   • P/E: 20.5x (vs 18.5 hist)           │
│     Fuente: Yahoo Finance (EOD)         │
│   • Dividend: 1.8% (oficial)            │
│     Fuente: SEC filing                  │
│                                         │
│ ⚠️ Riesgos identificados:               │
│   • Earnings inminentes (8 días)        │
│     Recomendación: CAUTION              │
│   • Evento económico hoy (CPI)          │
│     Impacto: HIGH                       │
│                                         │
│ ✅ Fuentes verificadas: 5               │
│ 🔄 Última actualización: 3 min atrás    │
└─────────────────────────────────────────┘
```

### Implementación

#### 3.1 Frontend Component
```typescript
// web/src/components/MarketContextBlock.tsx

interface MarketContextBlockProps {
  ticker: string;
  researchContext: ResearchResult;
  risks: RiskFactor[];
  onRefresh?: () => void;
}

export function MarketContextBlock({
  ticker,
  researchContext,
  risks,
  onRefresh
}: MarketContextBlockProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh?.();
    setRefreshing(false);
  };

  return (
    <div className="market-context-block">
      {/* Sección Noticias */}
      <section className="news-section">
        <h4>📰 Noticias recientes</h4>
        {researchContext.news.slice(0, 3).map(article => (
          <article key={article.id} className={`sentiment-${article.sentiment}`}>
            <p>{article.title}</p>
            <small>{article.outlet} ({formatDate(article.publishedAt)})</small>
          </article>
        ))}
      </section>

      {/* Sección Eventos */}
      <section className="events-section">
        <h4>📅 Eventos próximos</h4>
        {researchContext.upcomingEvents.earnings && (
          <div className="event">
            <span>Earnings: {formatDate(researchContext.upcomingEvents.earnings)}</span>
            <span className="days-away">({daysUntil(researchContext.upcomingEvents.earnings)} días)</span>
          </div>
        )}
        {researchContext.economicEvents.map(event => (
          <div key={event.id} className={`event impact-${event.impact}`}>
            <span>{event.name}</span>
            <span>{formatTime(event.time)}</span>
          </div>
        ))}
      </section>

      {/* Sección Fundamentales */}
      <section className="fundamentals-section">
        <h4>💹 Fundamentales</h4>
        <div className="metric">
          <span>P/E: {researchContext.fundamentals.pe}x</span>
          <span className="source">({researchContext.fundamentals.source})</span>
        </div>
        <div className="metric">
          <span>Dividend: {researchContext.fundamentals.dividend}%</span>
        </div>
      </section>

      {/* Sección Riesgos */}
      <section className="risks-section">
        <h4>⚠️ Riesgos identificados</h4>
        {risks.map(risk => (
          <div key={risk.type} className={`risk severity-${risk.severity}`}>
            <p><strong>{risk.type}:</strong> {risk.description}</p>
            <p className="recommendation">{risk.recommendation}</p>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="context-footer">
        <span>✅ {researchContext.sources.length} fuentes verificadas</span>
        <span>🔄 Última actualización: {formatTimeAgo(researchContext.timestamp)}</span>
        <button onClick={handleRefresh} disabled={refreshing}>
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
      </footer>
    </div>
  );
}
```

#### 3.2 API Endpoint
```typescript
// backend/src/modules/api/controllers/research.controller.ts

@Controller('api/research')
export class ResearchController {
  constructor(private webResearch: WebResearchService) {}

  @Get(':ticker/context')
  async getMarketContext(@Param('ticker') ticker: string) {
    return await this.webResearch.investigate({
      ticker,
      timeframe: 'today',
      focusAreas: ['news', 'earnings', 'economics', 'fundamentals']
    });
  }

  @Get(':ticker/risks')
  async getResearchRisks(@Param('ticker') ticker: string) {
    const research = await this.webResearch.investigate({
      ticker,
      timeframe: 'today'
    });
    return this.evaluateRisks(research);
  }
}
```

### Deliverables

**Tests:** 8/8 mínimo
```
✅ Renders market context block
✅ Displays news articles with sentiment
✅ Shows upcoming events in order
✅ Formats fundamentals correctly
✅ Lists risks with severity
✅ Source citations visible
✅ Refresh button works
✅ Responsive layout
```

**Esfuerzo estimado:** 1 semana (frontend + backend)

---

## 📋 PRIORIDAD CUATRO: Secuencia Pre-Operación Completa

### Objetivo
Antes de CUALQUIER operación, ejecutar:

```
1. OBTENER    → Research data
2. ANALIZAR   → Technical + Market
3. INVESTIGAR → News + Events + Fundamentals
4. CRUZAR     → Cross-validate data
5. EXPLICAR   → Generate reasoning with sources
6. REGISTRAR  → Audit trail
```

### Implementación

#### 4.1 OperationSequence Orchestrator
```typescript
// strategyLibrary/execution/operationSequence.ts

export class OperationSequenceOrchestrator {
  constructor(
    private dataService: DataService,
    private analyzer: Analyzer,
    private researchService: WebResearchService,
    private validator: DataValidator,
    private auditService: DecisionAuditService
  ) {}

  /**
   * SECUENCIA COMPLETA PRE-OPERACIÓN
   * Objetivo: No sugerir trade solo por indicador técnico
   * sino porque fue validado cruzadamente
   */
  async executePreOperationSequence(
    signal: TradingSignal
  ): Promise<OperationValidationResult> {
    const startTime = Date.now();
    
    // ─────────────────────────────────────────
    // 1️⃣ OBTENER: Recolectar datos
    // ─────────────────────────────────────────
    const data = await this.step1_ObtenerDatos(signal);

    // ─────────────────────────────────────────
    // 2️⃣ ANALIZAR: Análisis técnico + mercado
    // ─────────────────────────────────────────
    const analysis = await this.step2_Analizar(signal, data);

    // ─────────────────────────────────────────
    // 3️⃣ INVESTIGAR: Research (news + fundamentals)
    // ─────────────────────────────────────────
    const research = await this.step3_Investigar(signal);

    // ─────────────────────────────────────────
    // 4️⃣ CRUZAR: Validación cruzada
    // ─────────────────────────────────────────
    const crossValidation = await this.step4_Cruzar(
      analysis,
      research,
      signal
    );

    // ─────────────────────────────────────────
    // 5️⃣ EXPLICAR: Generar reasoning con citas
    // ─────────────────────────────────────────
    const explanation = this.step5_Explicar(
      analysis,
      research,
      crossValidation
    );

    // ─────────────────────────────────────────
    // 6️⃣ REGISTRAR: Auditoría completa
    // ─────────────────────────────────────────
    await this.step6_Registrar({
      signal,
      data,
      analysis,
      research,
      crossValidation,
      explanation,
      executionTime: Date.now() - startTime
    });

    return {
      approved: crossValidation.approved,
      reasoning: explanation,
      sources: this.compileSources(data, research),
      executionTime: Date.now() - startTime
    };
  }

  // ─────────────────────────────────────────
  // PASO 1: OBTENER
  // ─────────────────────────────────────────
  private async step1_ObtenerDatos(
    signal: TradingSignal
  ): Promise<CollectedData> {
    return {
      marketData: await this.dataService.getMarketData(signal.symbol),
      technicalIndicators: await this.dataService.getTechnicalIndicators(signal.symbol),
      historicalData: await this.dataService.getHistoricalBars(signal.symbol, 100),
      portfolioPosition: await this.dataService.getPosition(signal.symbol),
      timestamp: new Date()
    };
  }

  // ─────────────────────────────────────────
  // PASO 2: ANALIZAR
  // ─────────────────────────────────────────
  private async step2_Analizar(
    signal: TradingSignal,
    data: CollectedData
  ): Promise<AnalysisResult> {
    return {
      technical: this.analyzer.analyzeTechnical({
        indicators: data.technicalIndicators,
        historicalData: data.historicalData,
        signal
      }),
      market: this.analyzer.analyzeMarket({
        currentPrice: data.marketData.price,
        volume: data.marketData.volume,
        vix: data.marketData.vix
      }),
      riskReward: this.analyzer.calculateRiskReward({
        position: data.portfolioPosition,
        signal
      }),
      confidence: this.analyzer.assessConfidence(signal)
    };
  }

  // ─────────────────────────────────────────
  // PASO 3: INVESTIGAR
  // ─────────────────────────────────────────
  private async step3_Investigar(
    signal: TradingSignal
  ): Promise<ResearchResult> {
    return await this.researchService.investigate({
      ticker: signal.symbol,
      timeframe: 'today',
      focusAreas: ['news', 'earnings', 'economics', 'fundamentals']
    });
  }

  // ─────────────────────────────────────────
  // PASO 4: CRUZAR
  // ─────────────────────────────────────────
  private async step4_Cruzar(
    analysis: AnalysisResult,
    research: ResearchResult,
    signal: TradingSignal
  ): Promise<CrossValidationResult> {
    const validations: ValidationCheck[] = [];

    // Validación 1: ¿El análisis técnico se mantiene después de investigar?
    const technicalStability = this.validator.checkTechnicalStability(
      analysis,
      research
    );
    validations.push({
      type: 'technical_stability',
      passed: technicalStability,
      reason: technicalStability 
        ? 'Technical setup valid despite news context'
        : 'Technical setup contradicted by research'
    });

    // Validación 2: ¿Hay eventos que invaliden el trade?
    const eventValidation = this.validator.checkCriticalEvents(research);
    validations.push({
      type: 'critical_events',
      passed: !eventValidation.hasCriticalRisk,
      reason: eventValidation.reason
    });

    // Validación 3: ¿Los fundamentales apoyan la dirección?
    const fundamentalValidation = this.validator.checkFundamentals(
      research,
      signal.direction
    );
    validations.push({
      type: 'fundamentals_alignment',
      passed: fundamentalValidation.aligned,
      reason: fundamentalValidation.reason
    });

    // Decisión final: ¿Todos los checks pasan?
    const approved = validations.every(v => v.passed);

    return {
      approved,
      validations,
      confidence: this.calculateCrossValidationConfidence(validations)
    };
  }

  // ─────────────────────────────────────────
  // PASO 5: EXPLICAR
  // ─────────────────────────────────────────
  private step5_Explicar(
    analysis: AnalysisResult,
    research: ResearchResult,
    crossValidation: CrossValidationResult
  ): ExplanationResult {
    let explanation = '';
    explanation += `ANALYSIS:\n`;
    explanation += `  Technical: ${analysis.technical.summary}\n`;
    explanation += `  Market: ${analysis.market.summary}\n`;
    explanation += `  Risk/Reward: ${analysis.riskReward.ratio.toFixed(2)}\n\n`;

    explanation += `RESEARCH CONTEXT:\n`;
    explanation += `  Recent news: ${research.news.length} articles\n`;
    explanation += `  Upcoming events: ${research.upcomingEvents}\n`;
    explanation += `  Economic calendar: ${research.economicEvents.length} events today\n\n`;

    explanation += `CROSS-VALIDATION:\n`;
    crossValidation.validations.forEach(v => {
      explanation += `  ✓ ${v.type}: ${v.passed ? '✅' : '❌'} - ${v.reason}\n`;
    });

    explanation += `\nSOURCES:\n`;
    research.sources.forEach(source => {
      explanation += `  • ${source.outlet} (${source.type}): ${source.date.toISOString()}\n`;
    });

    return {
      summary: explanation,
      sources: research.sources
    };
  }

  // ─────────────────────────────────────────
  // PASO 6: REGISTRAR
  // ─────────────────────────────────────────
  private async step6_Registrar(context: PreOperationContext): Promise<void> {
    await this.auditService.logPreOperationSequence({
      signal: context.signal,
      steps: {
        obtener: { timestamp: context.data.timestamp },
        analizar: { confidence: context.analysis.confidence },
        investigar: { sources: context.research.sources.length },
        cruzar: { validations: context.crossValidation.validations },
        explicar: { summary: context.explanation.summary },
        registrar: { timestamp: new Date() }
      },
      totalExecutionTime: context.executionTime,
      approved: context.crossValidation.approved
    });
  }

  private compileSources(data: CollectedData, research: ResearchResult): SourceCitation[] {
    const sources: SourceCitation[] = [];
    
    sources.push({
      type: 'market',
      outlet: 'Alpaca Markets',
      url: 'https://alpaca.markets',
      date: data.timestamp,
      reliability: 'high'
    });

    sources.push(...research.sources);
    
    return sources;
  }
}
```

#### 4.2 Integración en Strategy Dashboard
```typescript
// GET /api/strategy/proposal?symbol=SPY

{
  signal: { ... },
  
  preOperationSequence: {
    step1_obtener: { ... },
    step2_analizar: { ... },
    step3_investigar: { ... },
    step4_cruzar: { ... },
    step5_explicar: { ... },
    step6_registrar: { timestamp: ... }
  },
  
  approved: true,
  reasoning: "Trade approved because...",
  sources: [ ... ]
}
```

### Deliverables

**Tests:** 20/20 mínimo
```
✅ All 6 steps execute in order
✅ Data collected correctly
✅ Technical analysis matches signal
✅ Research investigation complete
✅ Cross-validation logic correct
✅ Critical events block trade
✅ Earnings block trade if imminent
✅ Explanation includes all sources
✅ Audit trail recorded
✅ Execution time < 10 seconds
✅ Error handling all steps
✅ Fallback if research fails
✅ Caching working
✅ No duplicates in sources
✅ Timezone handling correct
✅ Multi-ticker support
✅ Real data integration
✅ Mock data fallback
✅ Rate limiting respected
✅ Performance optimized
```

**Esfuerzo estimado:** 2-3 semanas

---

## 🎯 PLAN FINAL: Orden de Implementación

### Recomendación: Start con PRIORIDAD 1

**Razón:** Es el foundation que necesitan todas las demás prioridades.

### Timeline Propuesto

```
SEMANA 1 (PRIORIDAD 1):
  - WebResearchService + tests (15/15)
  - Integración APIs (News, Calendar, SEC)
  - Environment config
  - Esfuerzo: ~50 horas

SEMANA 2 (PRIORIDAD 2):
  - PreOperationValidator + tests (12/12)
  - Risk evaluation logic
  - Decisión maker
  - Esfuerzo: ~40 horas

SEMANA 3 (PRIORIDAD 3):
  - Frontend MarketContextBlock
  - ResearchController API
  - Tests (8/8)
  - Esfuerzo: ~35 horas

SEMANA 4-5 (PRIORIDAD 4):
  - OperationSequenceOrchestrator
  - 6-step flow
  - Integration testing
  - Tests (20/20)
  - Esfuerzo: ~60 horas

TOTAL: ~4-5 semanas, ~185 horas
```

---

## ✅ Punto Clave

**No es necesario AI perfecta.** El objetivo es:

> **Ninguna operación se sugiera solo porque un indicador técnico se movió, sino porque fue contrastada con investigación + datos + validación cruzada.**

Eso es exactamente lo que estas 4 prioridades logran.

---

## 🔴 DECISION REQUERIDA

¿En qué **PRIORIDAD** quieres empezar?

- [ ] **PRIORIDAD 1** (Motor web) ← Recomendado
- [ ] **PRIORIDAD 2** (Pre-op check)
- [ ] **PRIORIDAD 3** (Panel)
- [ ] **PRIORIDAD 4** (Secuencia completa)
- [ ] **Todas a la vez** (5 semanas, full team)

Una vez decides, procedo directamente con la implementación sin delays.

