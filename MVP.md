# 🎯 MVP - TITO METRALLETA v1.0

**Minimum Viable Product**: Definición exacta de cuándo la primera versión está completa.

---

## 📋 ¿QUÉ ES EL MVP?

La versión 1.0 funcional que permite:

1. ✅ **Obtener datos** de mercado
2. ✅ **Analizarlos** contra reglas
3. ✅ **Mostrar recomendación** con explicación
4. ✅ **Registrar resultados** de operaciones

---

## 🎬 FLUJO MVP (Caso de Uso Principal)

```
Usuario → API
   ↓
1. Envía símbolo + estrategia + plan
   (Ej: AAPL, Momentum Intraday, {entry: 150.5, target: 152, stop: 149.5})
   ↓
2. Backend obtiene datos
   DataEngine → Alpha Vantage + Finnhub
   (Precio, volumen, RSI, GEX, tendencia, etc.)
   ↓
3. Backend analiza
   RulesEngine → Evalúa 10 reglas
   (Tendencia, liquidez, volumen, GEX, etc.)
   ↓
4. Backend genera reporte
   ReportEngine → Crea OpportunityReport
   (Decisión: Operar/Esperar/No Operar)
   ↓
5. Backend guarda en BD
   Persiste: Opportunity + Analysis
   ↓
6. Retorna recomendación
   {
     decision: "operar",
     confidence: 87,
     risk: "bajo",
     mainReasons: [...],
     timestamp: "2026-08-23T..."
   }
   ↓
Usuario recibe reporte → Ve si operó → Registra resultado
   ↓
7. Usuarios registra resultado
   POST /api/results
   {
     opportunityId: "uuid",
     result: "ganancia",  // o "pérdida"
     points: 2.5,
     successReasons: [...],
     lessons: [...]
   }
   ↓
8. Backend persiste resultado
   TradeResult guardado
   ↓
9. Backend actualiza estadísticas
   Win rate, efectividad por regla, etc.
```

---

## ✅ FEATURES MVP (LO QUE DEBE HACER)

### Core Functionality

#### 1. Data Retrieval
- ✅ Obtener precio actual
- ✅ Obtener volumen
- ✅ Calcular RSI (14 períodos)
- ✅ Obtener GEX (si disponible)
- ✅ Detectar tendencia (alcista/bajista/lateral)
- ✅ Identificar soportes y resistencias
- ✅ Determinar Premium/Discount
- ✅ Calcular liquidez

**Fonte**: Alpha Vantage + Finnhub APIs

**Error Handling**: Si no hay datos, marca para revisión manual

#### 2. Analysis
- ✅ Evaluar 10 reglas por defecto
  1. Tendencia alcista (25 pts)
  2. Zona Premium (25 pts)
  3. Volumen alto (20 pts)
  4. GEX positivo (20 pts)
  5. RSI no sobrecomprado (10 pts)
  6. Contexto SPY alcista (15 pts)
  7. VIX bajo (10 pts)
  8. Liquidez suficiente (10 pts)
  9. Tiempo al cierre (5 pts)
  10. Precio en nivel importante (15 pts)

- ✅ Calcular puntuación (0-100)
- ✅ Determinar decisión automática
  - ≥85: OPERAR ✅
  - 65-84: ESPERAR ⏳
  - <65: NO OPERAR ❌

- ✅ Asignar nivel de riesgo
  - ≥85: Bajo 🟢
  - 50-84: Medio 🟡
  - <50: Alto 🔴

#### 3. Reporting
- ✅ Generar reporte con:
  - ID único
  - Símbolo analizado
  - Estrategia usada
  - Decisión final
  - Confianza (%)
  - Nivel de riesgo
  - Razones principales (reglas que pasaron)
  - Condiciones de invalidación (reglas que fallaron)
  - Plan: entry, target, stop
  - Timestamp

- ✅ Formatear reporte legible
- ✅ Guardar en BD
- ✅ Retornar vía API

#### 4. Result Recording
- ✅ Endpoint para registrar resultado
- ✅ Aceptar:
  - Opportunity ID
  - Resultado (ganancia/pérdida)
  - Puntos ganados/perdidos
  - Razones de éxito/fracaso
  - Lecciones aprendidas

- ✅ Guardar en BD
- ✅ Actualizar estadísticas

#### 5. Statistics
- ✅ Calcular win rate
- ✅ Calcular promedio de puntos por ganancia
- ✅ Calcular efectividad por regla
- ✅ Generar curva de equity simple

---

## 🔌 ENDPOINTS MVP (API REST)

### 1. Analizar Oportunidad
```
POST /api/analyze
Content-Type: application/json

{
  "symbol": "AAPL",
  "strategy": "Momentum Intraday",
  "plan": {
    "entry": 150.5,
    "target": 152.0,
    "stop": 149.5,
    "notes": "Ruptura de resistencia"
  }
}

Response (200):
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "symbol": "AAPL",
  "strategy": "Momentum Intraday",
  "decision": "operar",
  "confidence": 87,
  "risk": "bajo",
  "mainReasons": [
    "Tendencia Alcista",
    "Volumen Alto",
    "Liquidez Suficiente"
  ],
  "invalidationConditions": [
    "VIX Bajo"
  ],
  "plan": {
    "entry": 150.5,
    "target": 152.0,
    "stop": 149.5
  },
  "createdAt": "2026-08-23T14:30:00Z"
}
```

### 2. Listar Reglas
```
GET /api/rules

Response (200):
{
  "rules": [
    {
      "id": "trend_bullish",
      "name": "Tendencia Alcista",
      "weight": 25,
      "enabled": true,
      "description": "Verifica si tendencia es alcista"
    },
    ...
  ]
}
```

### 3. Ajustar Regla
```
PUT /api/rules/trend_bullish
Content-Type: application/json

{
  "weight": 35,
  "enabled": true
}

Response (200):
{
  "id": "trend_bullish",
  "weight": 35,
  "enabled": true
}
```

### 4. Registrar Resultado
```
POST /api/results
Content-Type: application/json

{
  "opportunityId": "550e8400-e29b-41d4-a716-446655440000",
  "result": "ganancia",
  "points": 2.5,
  "successReasons": [
    "Tendencia se mantuvo alcista",
    "Confirmación de volumen"
  ],
  "failureReasons": [],
  "lessons": [
    "La confirmación de volumen es crítica"
  ]
}

Response (201):
{
  "id": "uuid-resultado",
  "opportunityId": "uuid-oportunidad",
  "result": "ganancia",
  "points": 2.5,
  "recordedAt": "2026-08-23T15:45:00Z"
}
```

### 5. Estadísticas
```
GET /api/stats

Response (200):
{
  "totalAnalyzed": 42,
  "wins": 35,
  "losses": 7,
  "winRate": 83.3,
  "avgPointsPerWin": 2.1,
  "avgPointsPerLoss": -1.5,
  "ruleEffectiveness": {
    "trend_bullish": {
      "occurrences": 40,
      "successes": 36,
      "effectiveness": 90.0
    },
    ...
  },
  "lastUpdated": "2026-08-23T15:45:00Z"
}
```

---

## 💾 BASES DE DATOS MVP

### Tabla: opportunities
```sql
CREATE TABLE opportunities (
  id UUID PRIMARY KEY,
  symbol VARCHAR(10) NOT NULL,
  strategy VARCHAR(100) NOT NULL,
  analysis JSONB NOT NULL,  -- Resultado del análisis completo
  decision VARCHAR(20) NOT NULL,  -- operar, esperar, no_operar
  confidence FLOAT NOT NULL,  -- 0-100
  risk VARCHAR(20) NOT NULL,  -- bajo, medio, alto
  entry FLOAT,
  target FLOAT,
  stop FLOAT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Tabla: trade_results
```sql
CREATE TABLE trade_results (
  id UUID PRIMARY KEY,
  opportunity_id UUID REFERENCES opportunities(id),
  result VARCHAR(20) NOT NULL,  -- ganancia, pérdida
  points FLOAT NOT NULL,
  success_reasons TEXT[] DEFAULT '{}',
  failure_reasons TEXT[] DEFAULT '{}',
  lessons TEXT[] DEFAULT '{}',
  recorded_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🧪 TESTING MVP

### Unit Tests
- ✅ DataEngine: Cada método de obtención de datos
- ✅ RulesEngine: Cada regla evaluada correctamente
- ✅ ReportEngine: Generación de reportes
- ✅ Analyzer: Orquestación completa

**Cobertura**: >80%

### Integration Tests
- ✅ Flujo completo: dato → análisis → reporte
- ✅ Persistencia en BD
- ✅ Endpoints responden correctamente
- ✅ DTOs validan entrada

### E2E Tests
- ✅ POST /api/analyze completo
- ✅ GET /api/rules
- ✅ PUT /api/rules/:id
- ✅ POST /api/results
- ✅ GET /api/stats

---

## 📊 CRITERIOS DE ÉXITO MVP

| Criterio | Requisito | Verificación |
|----------|-----------|--------------|
| **Compilación** | Sin errores | `npm run build` |
| **Tests** | >80% coverage | `npm run test:cov` |
| **Endpoints** | 5 endpoints funcionales | Postman/Insomnia |
| **BD** | Datos persisten | Verificar PostgreSQL |
| **API** | Responde en <500ms | Chrome DevTools |
| **Docs** | Completa | Swagger + README |
| **Seguridad** | JWT en endpoints sensibles | Verificar tokens |
| **Errors** | Manejo apropiado | Probar casos error |

---

## 🎯 NO INCLUYE MVP

❌ Frontend web (Fase 2)  
❌ Dashboard de estadísticas (Fase 2)  
❌ Alertas automáticas (Fase 3)  
❌ ML optimization (Fase 3)  
❌ Trading real (Fase 4)  
❌ Integración con broker (Fase 4)  
❌ Backtesting (Fase 2)  
❌ UI/UX (Fase 2)  

---

## ✅ INCLUYE MVP

✅ 3 motores core (Data, Rules, Report)  
✅ 5 endpoints API  
✅ Persistencia en PostgreSQL  
✅ JWT authentication  
✅ 10 reglas por defecto  
✅ Análisis automático  
✅ Registro de resultados  
✅ Estadísticas básicas  
✅ >80% test coverage  
✅ Documentación completa  

---

## 🚀 CUÁNDO MVP ESTÁ COMPLETO

```
┌─────────────────────────────────┐
│ ✅ Código compila sin errores   │
│ ✅ Tests >80% pasan             │
│ ✅ 5 endpoints funcionan         │
│ ✅ BD persiste datos            │
│ ✅ Documentación actualizada    │
│ ✅ Commits descriptivos         │
│ ✅ Sin breaking changes         │
└─────────────────────────────────┘
           ↓
  MVP v1.0 ESTÁ COMPLETO
  
  Entonces: Listo para Fase 2
```

---

## 📝 CHECKLIST MVP

### Pre-Implementation
- [ ] Leer este documento
- [ ] Leer PHASE_1_GUIDE.md
- [ ] Entender los 3 motores core

### CoreModule
- [ ] DataEngine integrado
- [ ] RulesEngine integrado
- [ ] ReportEngine integrado
- [ ] Analyzer orquestando
- [ ] Tests >80%
- [ ] Commit descriptivo

### DatabaseModule
- [ ] Entities creadas (Opportunity, TradeResult)
- [ ] Migrations aplicadas
- [ ] Repositories funcionales
- [ ] Tests de integridad
- [ ] Commit descriptivo

### ApiModule
- [ ] AnalyzeController + Service
- [ ] RulesController + Service
- [ ] ResultsController + Service
- [ ] StatsController + Service
- [ ] DTOs con validación
- [ ] 5 endpoints testeados
- [ ] Commit descriptivo

### AuthModule
- [ ] JWT Strategy
- [ ] JWT Guard
- [ ] Endpoints protegidos
- [ ] Tests de auth
- [ ] Commit descriptivo

### Final
- [ ] `npm run build` ✅
- [ ] `npm run test:cov` >80% ✅
- [ ] `npm run lint` ✅
- [ ] `npm run start:dev` ✅
- [ ] Documentación completada ✅
- [ ] Todos los tests pasan ✅
- [ ] Commits descriptivos ✅

---

## 🎬 EJEMPLO MVP EN ACCIÓN

```bash
# 1. Backend corriendo
npm run start:dev
# 🚀 Backend corriendo en http://localhost:3000

# 2. Usuario envía análisis
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "AAPL",
    "strategy": "Momentum",
    "plan": {"entry": 150, "target": 155, "stop": 148}
  }'

# 3. Backend retorna reporte
{
  "id": "abc-123",
  "decision": "operar",
  "confidence": 87,
  "risk": "bajo",
  "mainReasons": ["Tendencia Alcista", "Volumen Alto"],
  "createdAt": "2026-08-23T14:30:00Z"
}

# 4. Usuario registra resultado
curl -X POST http://localhost:3000/api/results \
  -H "Content-Type: application/json" \
  -d '{
    "opportunityId": "abc-123",
    "result": "ganancia",
    "points": 2.5,
    "successReasons": ["Tendencia se mantuvo"],
    "lessons": ["Confirmar volumen siempre"]
  }'

# 5. Usuario consulta estadísticas
curl http://localhost:3000/api/stats

# Response:
{
  "totalAnalyzed": 42,
  "wins": 35,
  "winRate": 83.3,
  "ruleEffectiveness": {...}
}

# ✅ MVP FUNCIONA COMPLETAMENTE
```

---

## 📚 DOCUMENTACIÓN GENERADA

Cuando MVP esté completo:
- ✅ README.md con instrucciones
- ✅ MODULES.md con especificaciones
- ✅ CODE_STANDARDS.md aplicado
- ✅ API documentada (Swagger)
- ✅ Ejemplos de uso
- ✅ Troubleshooting

---

**MVP v1.0 = Versión completamente funcional lista para expandir.** 🚀

*Última actualización*: 2026-08-23
