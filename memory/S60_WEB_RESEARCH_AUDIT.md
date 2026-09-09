# 🔍 Session 60 - Web Research Capability Audit
**Generado:** 2026-09-07  
**Autor:** Cloud / Auditoría Automática  
**Estado:** COMPLETADA

---

## 📊 HALLAZGO CRÍTICO: Tito NO tiene capacidad de investigación en la web

### Auditoría de Capacidades Actuales

#### ✅ **QUÉ SÍ TIENE:**
1. **Análisis técnico** (RSI, ADX, SuperTrend, MA50/MA200)
2. **Datos de mercado** (Alpaca, Massive, FRED, TradingView)
3. **Motor Warren Buffett Jr.** (análisis fundamental)
4. **Auditoría interna** (base de datos, lecciones aprendidas)
5. **Estrategias multi-instrument** (10 validadas)

#### ❌ **QUÉ LE FALTA - CRÍTICO:**
1. **Sin búsqueda web** - No puede investigar en Internet
2. **Sin acceso a noticias** - No puede leer news feeds
3. **Sin extracción de datos de fuentes abiertas** - No puede scrapear
4. **Sin integración a Wikipedia/SEC filings** - No accede a información pública
5. **Sin LLM interno** - No puede analizar textos/investigaciones
6. **Datos fundamentales MANUALES** - Warren necesita que LE PROPORCIONEN ROE, P/E, etc.

### El Problema

Hoy, si Tito quiere analizar una empresa (ej. AAPL), necesita:
```
INPUT manual (usuarios proporcionan):
  ROE: 95%
  P/E: 28x
  FCF: $110B
  Earnings CAGR: 12%
  ...
  
Warren Motor:
  Score = 85 ✅ APPROVED
  
¿Pero de DÓNDE sacó esos números? ← DEL USUARIO
Eso NO es análisis fundamentado.
```

Lo que **DEBERÍA ser:**
```
INPUT: "Analizar AAPL"

TM:
  1. Busca datos financieros en SEC (10-K filing)
  2. Extrae ROE, P/E, FCF del financial statement
  3. Lee noticias recientes sobre AAPL
  4. Busca información de competencia (sector)
  5. Usa Warren Motor con DATOS VERIFICADOS
  
OUTPUT: 
  "AAPL aprobada con score 87
   Razón: ROE 95% (verificado en SEC 10-K),
   P/E 28x (histórico 22x, premium 27% justificado),
   FCF creciendo 15% YoY (fuente: SEC).
   Riesgo: Regulación China (Reuters, 2024-09-01)"
```

---

## 🏗️ ARQUITECTURA RECOMENDADA: WebResearchEngine

### Componentes Requeridos

#### 1. **WebSearchProvider** (búsqueda pública)
```typescript
// Capacidad: Buscar en Internet de forma estructurada
interface WebSearchProvider {
  // Búsqueda general
  search(query: string, filters?: SearchFilters): Promise<SearchResult[]>;
  
  // Búsqueda específica por tipo
  searchNews(ticker: string, days?: number): Promise<NewsArticle[]>;
  searchEarnings(ticker: string): Promise<EarningsInfo[]>;
  searchIndustryReport(sector: string): Promise<IndustryReport[]>;
  searchCompetition(ticker: string): Promise<CompetitorInfo[]>;
  searchRegulation(topic: string): Promise<RegulatoryInfo[]>;
}

// Implementaciones potenciales:
- Google Search API (requiere KEY)
- NewsAPI.com (mercado/tecnología)
- MarketWatch API
- Yahoo Finance scraper (público)
- Seeking Alpha scraper (público)
```

#### 2. **SECFilingParser** (datos oficiales)
```typescript
// Capacidad: Extraer datos de SEC filings automáticamente
interface SECFilingParser {
  // Obtener 10-K/10-Q
  fetch10K(ticker: string, year?: number): Promise<Filing>;
  fetch10Q(ticker: string, quarter?: number): Promise<Filing>;
  
  // Parsear información financiera
  extractFinancials(filing: Filing): Promise<FundamentalMetrics>;
  // ✅ Retorna: ROE, P/E, FCF, Debt/Equity, etc.
  
  // Parsear MD&A (Management Discussion & Analysis)
  extractRisks(filing: Filing): Promise<string[]>;
  extractOpportunities(filing: Filing): Promise<string[]>;
  extractGuidance(filing: Filing): Promise<GuidanceInfo>;
}

// Implementación: Edgar SEC API (gratis, público)
```

#### 3. **ResearchSynthesizer** (análisis integrado)
```typescript
// Capacidad: Combinar datos + análisis + citas
interface ResearchSynthesizer {
  // Ejecutar investigación completa
  conductFullResearch(ticker: string): Promise<ResearchReport>;
  
  // Con requisito: SIEMPRE citar fuentes
  // Diferenciar HECHOS de INFERENCIAS
}

// Ejemplo output:
{
  ticker: "AAPL",
  fundamentals: {
    roe: 95,          // ✅ HECHO: SEC 10-K 2024
    p_e: 28,          // ✅ HECHO: Yahoo Finance (2024-09-07)
    fcf_growth: 15,   // ✅ HECHO: Calculated from SEC data
  },
  riskFactors: [
    "Regulación China",  // ← INFERENCIA (observado en noticias)
    "Dependencia iPhone" // ← HECHO (MD&A 10-K)
  ],
  sources: [
    { type: "SEC", filing: "10-K", date: "2024-01-15", url: "..." },
    { type: "News", outlet: "Reuters", date: "2024-09-01", title: "..." },
    { type: "Market", source: "Yahoo Finance", timestamp: "2024-09-07T15:30Z" }
  ]
}
```

#### 4. **DataVerificationEngine** (validación cruzada)
```typescript
// Capacidad: Verificar que datos sean confiables
interface DataVerificationEngine {
  // Validar que múltiples fuentes coincidan
  crossValidateMetric(
    metric: 'roe' | 'p_e' | 'fcf',
    sources: DataSource[]
  ): Promise<{
    value: number;
    confidence: 'high' | 'medium' | 'low';
    consensus: number; // % de fuentes que coinciden
    outliers: DataSource[];
  }>;
  
  // Verificar freshness de datos
  checkDataFreshness(source: DataSource): Promise<{
    isFresh: boolean;
    daysOld: number;
    recommendation: 'use' | 'verify' | 'reject';
  }>;
}
```

---

## 🔧 Implementación Mínima Viable (MVP)

### Fase 1: Integración SEC (1-2 semanas)

```typescript
// 1. SEC Edgar API (gratis, sin autenticación)
//    - Buscar empresas por ticker
//    - Descargar 10-K/10-Q
//    - Parsear XML (XBRL)

// 2. Integración en Warren Module:
interface WarrenAnalysisRequest {
  ticker: string;
  // ANTES: fundamentalMetrics proporcionadas por usuario
  // DESPUÉS: 
  autoFetchFundamentals?: boolean; // ← NEW
  // Si true: Warren busca SEC → extrae metrics
}

// 3. Output validado:
{
  fundamentals: {
    roe: 95,
    source: "SEC 10-K 2024-01-15",  // ← Cita
    confidence: 0.98                 // ← Métrica
  }
}
```

### Fase 2: News Integration (2-3 semanas)

```typescript
// 1. NewsAPI o MarketWatch RSS
//    - Buscar noticias por ticker
//    - Filtrar por date range
//    - Clasificar por relevancia

// 2. Integración en Confirmation Engine:
interface ConfirmationContext {
  // ANTES: Solo datos técnicos/mercado
  // DESPUÉS:
  recentNews?: NewsItem[];  // ← NEW
  // Ej: "AAPL regulación China", "EU antitrust"
}

// 3. NewsSource en Confirmation:
class NewsConfirmationSource extends ConfirmationSource {
  async evaluate(context: ConfirmationContext): Promise<ConfidenceVote> {
    // Si noticias negativas → reduce confidence
    // Si noticias positivas → aumenta confidence
    // Siempre cita la fuente
  }
}
```

### Fase 3: Web Search + Synthesis (3-4 semanas)

```typescript
// 1. Google Search API / Perplexity API
//    - Queries estructuradas
//    - Extrae respuestas resumidas
//    - Cita URLs

// 2. ResearchReport integrado en /strategy dashboard:
GET /api/strategy/research?ticker=AAPL
→ {
  technicalAnalysis: { ... },
  marketData: { ... },
  fundamentalAnalysis: { 
    data: { ... },
    sources: [ ... ]
  },
  newsContext: { ... },
  webResearch: {           // ← NEW
    industry: "...",
    competitors: "...",
    regulations: "...",
    sources: [ ... ]
  }
}
```

---

## 📋 Servicio Recomendado: Google Search API

### Por qué Google?
- ✅ **Cobertura:** Web completa (noticias, blogs, documentos)
- ✅ **Confiabilidad:** Google ranquea por relevancia
- ✅ **Facilidad:** API simple, documentación clara
- ✅ **Costo:** $5 USD / 1000 búsquedas (muy bajo)
- ✅ **Integración:** Fácil agregar a Node.js/NestJS

### Alternativas
| Servicio | Costo | Cobertura | Calidad | Notas |
|----------|-------|-----------|---------|-------|
| **Google Search** | $5/1k | Completa | Excelente | ✅ RECOMENDADO |
| NewsAPI | Freemium | Noticias | Buena | Solo noticias |
| Perplexity API | $0.003/query | Completa | Excelente | Más caro pero mejor síntesis |
| Seeking Alpha | Freemium | Mercado | Buena | Requiere scraping |
| SEC Edgar | Gratis | Filings | Oficial | Solo documentos |
| Yahoo Finance | Gratis | Mercado | Buena | Requiere scraping |

---

## 🎯 Impacto en Tito

### ANTES (Hoy)
```
Tito → Warren Buffett Jr.
  ↓
  Necesita datos MANUALES del usuario
  ↓
  Score 87 "APPROVED"
  ↓
  ¿De dónde sacó los números? Incertidumbre.
```

### DESPUÉS (Con Web Research)
```
Tito → Web Research Engine
  ↓
  SEC (10-K) → extrae ROE, FCF, Debt/Equity
  News API → ve noticias de regulación
  Search API → investiga competencia
  ↓
  Warren Buffett Jr.
  ↓
  Score 87 "APPROVED"
  Razones citadas:
    - ROE 95% (SEC 10-K 2024, fuente oficial)
    - FCF $110B creciendo 15% (calculado)
    - Regulación China en debate (Reuters, 2024-09-01)
    - Competencia: Samsung 8% FCF growth (News)
  ↓
  ✅ INVESTIGACIÓN FUNDAMENTADA
```

---

## 📊 Panel Actualizado: Estado de Integraciones (v2)

| Servicio | Estado | Calidad | Crítico | Validado | Acción |
|----------|--------|---------|---------|----------|--------|
| Alpaca | ✅ | 95% | SÍ | SÍ | Ninguna |
| Massive | ✅ | 90% | SÍ | SÍ | Ninguna |
| FRED VIX | ✅ | 99% | SÍ | SÍ | Ninguna |
| PostgreSQL | ✅ | 100% | SÍ | SÍ | Ninguna |
| Warren Module | ✅ | 85% | SÍ | SÍ | Agregar auto-fetch SEC |
| **WEB RESEARCH** | ❌ | 0% | **SÍ** | NO | **IMPLEMENTAR MVP** |
| TradingView | 🟡 | 20% | NO | NO | Parser RSI/ADX |
| TVContext | 🟡 | 20% | NO | NO | Integración datos |
| MarketSnack | ⚠️ | 70% | NO | Parcial | Validar cookie |
| Schwab OAuth | ❌ | ? | ? | NO | Validar token |

---

## 📋 Plan de Implementación MVP

### FASE 0: Setup (2-3 días)
```
1. Crear API Key en Google Cloud Console
2. Habilitar Custom Search API
3. Crear tabla `research_sources` en PostgreSQL
4. Agregar env vars: GOOGLE_SEARCH_KEY, SEC_API_URL
```

### FASE 1: SEC Parser (1 semana)
```
1. Implementar SECFilingParser
   - Fetch 10-K/10-Q from Edgar
   - Parse XBRL → FundamentalMetrics
   - Tests: 10/10 min

2. Integración en Warren:
   - autoFetchFundamentals: boolean
   - Test: Warren + SEC en 5 casos reales
```

### FASE 2: News Integration (1 semana)
```
1. NewsProvider (NewsAPI o RSS)
2. NewsConfirmationSource
3. Tests: 8/8 min
4. Dashboard: mostrar news recientes
```

### FASE 3: Web Search (1 semana)
```
1. WebSearchProvider (Google Search API)
2. ResearchSynthesizer
3. Verification Engine
4. /strategy endpoint actualizado
5. Tests: 12/12 min
```

**Total: 3-4 semanas para MVP completo**

---

## 🔴 CRÍTICO: Decisión Requerida

### Opción A: Web Research MVP (Recomendado)
- ✅ Tito analiza empresas de forma fundamentada
- ✅ Cita fuentes (HECHO vs INFERENCIA)
- ✅ Validación cruzada de datos
- ✅ Impacto: Sistema 90%+ completo
- ⏱️ Tiempo: 3-4 semanas
- 💰 Costo: ~$50/mes (Google Search API)

### Opción B: Esperar Integración Completa
- ⚠️ Tito sigue siendo parcial
- ❌ Warren necesita datos manuales
- ❌ Sin investigación en noticias
- ⏱️ Tiempo: Indefinido
- 💰 Costo: 0 (pero funcionalidad = 0)

### Opción C: Hybrid (Parcial)
- ✅ Solo SEC Parser (Fase 1)
- ✅ Automático ROE/P/E/FCF
- ⚠️ Sin noticias ni web search
- ⏱️ Tiempo: 1 semana
- 💰 Costo: $0 (Edgar es gratis)
- 📊 Funcionalidad: 50% de MVP completo

---

## ✅ Conclusión

**Tito Metralleta está en 73% de completitud.**

Para llegar a **90%+**, necesita **Web Research Engine**.

Las 3 acciones identificadas en el diagnóstico anterior se mantienen:
1. 🔴 Validar Schwab OAuth (CRÍTICO)
2. 🟡 Implementar TradingView parser (IMPORTANTE)
3. 🟢 **Agregar Web Research MVP (NUEVO, CRÍTICO)**

**Recomendación:** Priorizar **Web Research MVP** después de validar Schwab OAuth.

---

**Próximos pasos:**
1. Validar Schwab token (S60, esta sesión)
2. Decidir sobre Web Research (Opción A/B/C)
3. Implementar según opción elegida (S61-S63)

