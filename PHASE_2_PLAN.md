# Fase 2: Integración Backend-Frontend y Base de Datos

**Duración estimada**: 4-5 sesiones  
**Inicio**: Sesión 3 (2026-08-24)  
**Objetivo**: MVP completamente funcional con datos reales

---

## Fase 2A: Integración Backend-Frontend (Sesión 3)

### Objetivo
Conectar el frontend JavaScript al backend NestJS para que use datos reales en lugar de mock.

### Tareas

#### 2A-1: API Client en Frontend
**Archivo**: `web/api-client.js`

```javascript
class TitoAPI {
  constructor(baseURL = 'http://localhost:3000') {
    this.baseURL = baseURL;
  }

  async analyze(symbol, strategy) {
    // POST /api/analyze
    // Body: { symbol, strategy }
    // Return: { decision, confidence, risk, reasons, plan }
  }

  async addResult(opportunityId, result) {
    // POST /api/results
    // Body: { opportunityId, result, points, lessons }
  }

  async getStats() {
    // GET /api/stats
    // Return: { winRate, effectiveness, totalAnalyses }
  }

  async getRules() {
    // GET /api/rules
    // Return: [ { id, name, weight, effectiveness } ]
  }
}
```

**Especificaciones**:
- ✅ Error handling (timeouts, 500s, network errors)
- ✅ Retry logic con exponential backoff
- ✅ Loading states y spinners
- ✅ Cache de últimos análisis

#### 2A-2: Integración en tito.html
**Cambios**:
- Reemplazar `performAnalysis()` para llamar al backend
- Loading spinner mientras espera
- Mostrar error si falla
- Guardar resultados localmente también

#### 2A-3: Error Handling
- Network timeout → "Servidor no disponible"
- 400 Bad Request → "Símbolo inválido"
- 500 Server Error → "Error en el servidor, reintentar"
- Show retry button

#### 2A-4: Testing Manual
- [ ] Probar analyze con AAPL → debe llamar backend
- [ ] Probar error cuando backend no está disponible
- [ ] Probar timeout (> 10s)
- [ ] Probar watchlist save en BD

**Criterio de Éxito**:
- Frontend hace peticiones HTTP reales al backend
- Errores mostrados claramente al usuario
- Loading states visibles

---

## Fase 2B: Base de Datos PostgreSQL (Sesión 3-4)

### Objetivo
Persistir análisis y resultados en PostgreSQL.

### Tareas

#### 2B-1: Setup PostgreSQL Local
**Instalación**:
```bash
# Windows - usando Docker o instalación local
# Crear base de datos
createdb tito_metralleta

# Usuario
createuser tito_user --password
```

**Variables de entorno** (.env.local):
```
DATABASE_URL=postgresql://tito_user:password@localhost:5432/tito_metralleta
DATABASE_POOL_SIZE=10
DATABASE_POOL_IDLE_TIMEOUT=30000
```

#### 2B-2: Migrations TypeORM
**Crear initial migration**:
```bash
npm run typeorm:migration:create InitialSchema
```

**Migrations necesarias**:
1. CreateOpportunitiesTable
2. CreateTradeResultsTable
3. AddIndexes (symbol, createdAt)
4. AddConstraints (FK)

#### 2B-3: Persistencia en AnalyzeService
**Cambios**:
- Guardar cada análisis como Opportunity
- Registrar metadata: timestamp, IP, device
- Crear índice en symbol + createdAt

```typescript
// analyze.service.ts
async analyze(dto: CreateAnalyzeDto) {
  const analysis = await this.rulesEngine.analyze(...);
  
  // Guardar en BD
  const opportunity = await this.opportunityRepository.save({
    symbol: dto.symbol,
    strategy: dto.strategy,
    analysis,
    decision: analysis.decision,
    confidence: analysis.confidence,
    risk: analysis.riskLevel,
    plan: analysis.plan,
  });

  return { id: opportunity.id, ...analysis };
}
```

#### 2B-4: Query para Histórico
```typescript
// resultados.service.ts
async getAnalysisBySymbol(symbol: string, days: number = 30) {
  return this.opportunityRepository
    .createQueryBuilder('o')
    .where('o.symbol = :symbol', { symbol })
    .andWhere('o.createdAt > :date', {
      date: new Date(Date.now() - days * 86400000)
    })
    .orderBy('o.createdAt', 'DESC')
    .limit(100)
    .getMany();
}
```

**Criterio de Éxito**:
- [ ] PostgreSQL corriendo en localhost
- [ ] Migrations ejecutadas sin errores
- [ ] Análisis se guardan en BD
- [ ] Pueden recuperarse por símbolo

---

## Fase 2C: Autenticación JWT (Sesión 4)

### Objetivo
Agregar autenticación para que cada usuario tenga su propio histórico.

### Tareas

#### 2C-1: Crear User Entity
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string; // hashed

  @Column({ default: 'user' })
  role: 'user' | 'admin';

  @OneToMany(() => Opportunity, o => o.user)
  opportunities: Opportunity[];

  @CreateDateColumn()
  createdAt: Date;
}
```

#### 2C-2: AuthModule
```bash
npm run nest:generate:auth
```

**Servicios**:
- AuthService: register, login, validateToken
- JwtStrategy: validar JWT en requests
- JwtGuard: proteger endpoints

#### 2C-3: Endpoints Auth
```
POST /auth/register
  Body: { email, password }
  Response: { token, user }

POST /auth/login
  Body: { email, password }
  Response: { token, user }

GET /auth/me
  Headers: { Authorization: "Bearer <token>" }
  Response: { user }
```

#### 2C-4: Proteger Endpoints de Análisis
```typescript
@Post('/analyze')
@UseGuards(JwtGuard)
async analyze(
  @Body() dto: CreateAnalyzeDto,
  @Request() req
) {
  // req.user contiene el usuario del token
  return this.analyzeService.analyze(dto, req.user.id);
}
```

**Criterio de Éxito**:
- [ ] Registrar nuevo usuario
- [ ] Login devuelve JWT válido
- [ ] JWT se envía en Authorization header
- [ ] Análisis asociado al usuario

---

## Fase 2D: Datos Reales de Mercado (Sesión 4-5)

### Objetivo
Integrar APIs de datos reales para análisis precisos.

### Tareas

#### 2D-1: Integración Alpha Vantage

**Setup**:
```
ALPHA_VANTAGE_KEY=<clave-api>
```

**DataEngine update**:
```typescript
async fetchMarketData(symbol: string) {
  const url = `https://www.alphavantage.co/query`;
  const params = {
    function: 'TIME_SERIES_DAILY',
    symbol,
    apikey: this.configService.get('ALPHA_VANTAGE_KEY'),
  };

  const data = await axios.get(url, { params });
  return this.parseAlphaVantageData(data);
}
```

**Datos a extraer**:
- Close price último día
- Volume
- Tendencia (últimas 5 velas)
- RSI (Relative Strength Index)
- MACD

#### 2D-2: Integración Finnhub

**Setup**:
```
FINNHUB_KEY=<clave-api>
```

**DataEngine - Finnhub**:
```typescript
async fetchOptions(symbol: string) {
  // Options flow data
  // GEX (Gamma Exposure) data
  // IV (Implied Volatility)
}
```

#### 2D-3: Market Context
```typescript
// Datos de mercado general
async getMarketContext() {
  return {
    spyTrend: await this.getTrend('SPY'),
    qqqTrend: await this.getTrend('QQQ'),
    vixPrice: await this.getVIXPrice(),
    marketSentiment: 'bullish|neutral|bearish'
  };
}
```

#### 2D-4: Caching
```typescript
@Cacheable({ ttl: 60 }) // 1 minuto
async fetchMarketData(symbol: string) {
  // Llamar solo si no está en cache
}
```

**Criterio de Éxito**:
- [ ] Análisis usa datos reales de AAPL, SPY, etc.
- [ ] RSI y MACD se calculan correctamente
- [ ] Market context (SPY/QQQ/VIX) actualizado
- [ ] Cache evita rate-limiting

---

## Fase 2E: Mejoras UX (Sesión 5)

### Objetivo
Mejorar la experiencia de usuario con features adicionales.

### Tareas

#### 2E-1: Dark Mode Toggle
```javascript
// web/theme.js
class ThemeManager {
  toggleDarkMode() {
    localStorage.setItem('theme', 'dark|light');
    document.documentElement.setAttribute('data-theme', theme);
  }
}
```

#### 2E-2: Analytics Dashboard
```typescript
// GET /api/stats
Response: {
  totalAnalyses: 125,
  winRate: 0.68,
  profitFactor: 1.45,
  bestStrategy: 'Momentum',
  topSymbols: ['AAPL', 'MSFT'],
  recentAnalyses: [...]
}
```

#### 2E-3: Exportar Análisis
```typescript
// POST /api/export
Body: { format: 'pdf|csv', filters: {...} }
Response: <file blob>
```

#### 2E-4: Notificaciones
- Email cuando hay decisión "OPERAR"
- Push notification en móvil
- Histórico de notificaciones

**Criterio de Éxito**:
- [ ] Dark mode funciona en todos los navegadores
- [ ] Dashboard muestra estadísticas correctas
- [ ] Puede exportar análisis en PDF
- [ ] Recibe notificaciones

---

## Fase 2F: Testing y Despliegue (Sesión 5)

### Objetivo
Asegurar calidad y hacer que la app esté lista para producción.

### Tareas

#### 2F-1: Tests Backend

**Unit Tests**:
```bash
npm run test
```

Coverage objetivo: > 80%

**Tests a crear**:
- [ ] RulesEngine: evaluación correcta de reglas
- [ ] ReportEngine: generación de reportes
- [ ] AuthService: login, register, validation
- [ ] AnalyzeService: análisis end-to-end

#### 2F-2: Tests Frontend
```bash
npm run test:frontend
```

**Tests a crear**:
- [ ] API client: requests/responses correctos
- [ ] UI: análisis rinde correctamente
- [ ] Error handling: muestra errores
- [ ] Watchlist: agregar/quitar funciona

#### 2F-3: E2E Tests
```bash
npm run test:e2e
```

**Flujos a probar**:
1. Register → Login → Analyze → Save Result
2. View Stats → Export Analysis
3. Mobile responsive design

#### 2F-4: CI/CD Pipeline

**GitHub Actions**:
```yaml
name: CI/CD
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - npm test
      - npm run test:e2e
      - npm run build
  deploy:
    runs-on: ubuntu-latest
    steps:
      - vercel deploy (frontend)
      - render deploy (backend)
```

#### 2F-5: Despliegue

**Frontend - Vercel**:
```bash
vercel deploy --prod
```

**Backend - Render**:
- Conectar repo
- Build: `npm run build`
- Start: `npm run start:prod`
- Environment: DATABASE_URL, ALPHA_VANTAGE_KEY

**Criterio de Éxito**:
- [ ] Tests pasan (> 80% coverage)
- [ ] CI/CD pipeline funciona
- [ ] Frontend desplegado en Vercel
- [ ] Backend desplegado en Render
- [ ] App funciona en producción

---

## Hitos y Entregas

| Semana | Fase | Entrega |
|--------|------|---------|
| 1 | 2A | API integration completa |
| 2 | 2B | PostgreSQL + persistencia |
| 2-3 | 2C | Autenticación JWT |
| 3 | 2D | Datos reales de mercado |
| 4 | 2E | UX improvements |
| 4-5 | 2F | Testing y despliegue |

---

## Dependencias a Instalar

```bash
# Backend adicionales
npm install --save @nestjs/jwt passport-jwt
npm install --save typeorm pg
npm install --save @nestjs/cache-manager cache-manager
npm install --save axios dotenv

# Frontend - opcional (si se necesita)
npm install --save fetch-api-cache
```

---

## Checklist Final Fase 2

- [ ] Backend conectado a PostgreSQL
- [ ] Frontend llamando API real
- [ ] Autenticación JWT implementada
- [ ] Datos reales de Alpha Vantage
- [ ] Tests con > 80% coverage
- [ ] CI/CD pipeline funcionando
- [ ] Aplicación desplegada en producción
- [ ] Documentación actualizada
- [ ] README con instrucciones de setup

---

**Fase 2 Comenzará**: Sesión 3 (2026-08-24)  
**Estimado Completar**: Sesión 5 (2026-08-26)
