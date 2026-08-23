# 🏗️ ESPECIFICACIÓN DE MÓDULOS

Documentación detallada de cada módulo de Tito Metralleta.

---

## 1️⃣ CORE MODULE (`backend/src/modules/core`)

**Responsabilidad**: Orquestar y exponer los 3 motores de Tito Metralleta.

### Componentes

#### DataEngine
- **Clase**: `DataEngine`
- **Ubicación**: `src/engines/dataEngine.ts` (core existente)
- **Responsabilidad**: Obtener datos de mercado
- **Métodos principales**:
  - `getMarketData(symbol)` → MarketData
  - `getMarketContext()` → MarketContext (SPY, QQQ, VIX)

#### RulesEngine
- **Clase**: `RulesEngine`
- **Ubicación**: `src/engines/rulesEngine.ts` (core existente)
- **Responsabilidad**: Evaluar reglas y calcular puntuación
- **Métodos principales**:
  - `analyzeData(data, context)` → AnalysisResult
  - `addRule(rule)` → void
  - `setRuleWeight(id, weight)` → void

#### ReportEngine
- **Clase**: `ReportEngine`
- **Ubicación**: `src/engines/reportEngine.ts` (core existente)
- **Responsabilidad**: Generar reportes y registrar resultados
- **Métodos principales**:
  - `generateReport(analysis, plan)` → OpportunityReport
  - `recordTradeResult(report, result, reasons, lessons)` → TradeResult

#### Analyzer (Coordinador)
- **Clase**: `TitoMetralletaAnalyzer`
- **Ubicación**: `src/core/analyzer.ts` (core existente)
- **Responsabilidad**: Orquestar los 3 motores
- **Métodos principales**:
  - `analyzeOpportunity(symbol, strategy, plan)` → OpportunityReport

### Implementación en NestJS

```typescript
@Module({
  providers: [
    {
      provide: 'DATA_ENGINE',
      useFactory: (configService) => 
        new DataEngine(configService.get('ALPHA_VANTAGE_KEY'), ...),
      inject: [ConfigService],
    },
    // Similar para RULES_ENGINE, REPORT_ENGINE, ANALYZER
  ],
  exports: ['DATA_ENGINE', 'RULES_ENGINE', 'REPORT_ENGINE', 'ANALYZER'],
})
export class CoreModule {}
```

### Testing

**Unitarios**:
- Cada motor puede testearse independientemente
- Mock de APIs externas

**Integración**:
- Analyzer orquestando los 3 motores
- Flow completo: dato → análisis → reporte

### Documentación

- **Cómo usar**: Ver ejemplos en `src/index.ts` (core)
- **API**: Especificada en `API_SPEC.md`

---

## 2️⃣ DATABASE MODULE (`backend/src/modules/database`)

**Responsabilidad**: Persistencia de datos con TypeORM.

### Entities

#### Opportunity
```typescript
@Entity('opportunities')
export class Opportunity {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column('varchar', { length: 10 }) symbol: string;
  @Column('text') analysis: string; // JSON
  @Column('varchar', { length: 20 }) decision: string;
  @Column('float') confidence: number;
  @CreateDateColumn() createdAt: Date;
  @OneToMany(() => TradeResult, result => result.opportunity)
  results: TradeResult[];
}
```

#### TradeResult
```typescript
@Entity('trade_results')
export class TradeResult {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Opportunity, opp => opp.results)
  opportunity: Opportunity;
  @Column('varchar', { length: 10 }) result: string;
  @Column('float') points: number;
  @Column('text', { array: true, nullable: true }) successReasons: string[];
  @CreateDateColumn() recordedAt: Date;
}
```

### Repositories

- `OpportunityRepository` - CRUD de oportunidades
- `TradeResultRepository` - Registrar y consultar resultados

### Migrations

TypeORM auto-sincroniza en desarrollo.

### Testing

- Mock de base de datos en tests
- Tests de integridad de datos

---

## 3️⃣ AUTH MODULE (`backend/src/modules/auth`)

**Responsabilidad**: Autenticación y autorización.

### JWT Strategy

```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  validate(payload: any) {
    return { userId: payload.sub, email: payload.email };
  }
}
```

### JWT Guard

Protege endpoints:
```typescript
@UseGuards(JwtAuthGuard)
@Get('/protected')
protectedEndpoint() { }
```

### Testing

- Mock JWT en tests
- Test de tokens válidos/inválidos
- Test de expiración

---

## 4️⃣ API MODULE (`backend/src/modules/api`)

**Responsabilidad**: Endpoints REST que exponen funcionalidad.

### Controladores

#### AnalyzeController
```
POST /api/analyze
  Body: { symbol, strategy, plan }
  Response: { id, decision, confidence, reasons }
```

#### RulesController
```
GET /api/rules
  Response: [{ id, name, weight, enabled }]

PUT /api/rules/:id
  Body: { weight, enabled }
  Response: { updated rule }
```

#### ResultsController
```
POST /api/results
  Body: { opportunityId, result, reasons, lessons }
  Response: { TradeResult }

GET /api/results
  Query: { opportunityId?, symbol?, limit=20 }
  Response: [{ TradeResult }]
```

#### StatsController
```
GET /api/stats
  Response: { winRate, avgPoints, rulesEffectiveness }
```

### Servicios

- `AnalyzeService` - Orquestar análisis
- `RulesService` - Gestionar reglas
- `ResultsService` - Registrar resultados
- `StatsService` - Calcular estadísticas

### DTOs (Data Transfer Objects)

```typescript
export class AnalyzeDto {
  @IsString() symbol: string;
  @IsString() strategy: string;
  @IsObject() plan: { entry: number; target: number; stop: number };
}
```

### Testing

- Tests unitarios de servicios
- Tests de endpoints con datos mock
- Tests de validación de DTOs

---

## 🔄 Dependencias Entre Módulos

```
API Module
  ├── usa CoreModule (para análisis)
  ├── usa DatabaseModule (para persistencia)
  └── usa AuthModule (para seguridad)

CoreModule
  └── usa ConfigModule (para API keys)

DatabaseModule
  └── usa TypeORM (conexión BD)

AuthModule
  └── usa JwtModule (tokens)
```

**Regla**: No hay dependencia circular.

---

## 📊 Matriz de Checklist

Para cada módulo implementado:

| Aspecto | Check |
|---------|-------|
| Código escrito | ✅ |
| Tests unitarios | ✅ |
| Tests de integración | ✅ |
| Cobertura >80% | ✅ |
| Documentación actualizada | ✅ |
| DTOs validados | ✅ |
| Error handling | ✅ |
| Commit descriptivo | ✅ |

---

## 🚀 Orden de Implementación

1. **CoreModule** - Integrar motores existentes
2. **DatabaseModule** - Crear entities y repositories
3. **AuthModule** - JWT strategy y guards
4. **API Module** - Endpoints y servicios

---

*Última actualización*: 2026-08-23
