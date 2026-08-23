# 📐 ESTÁNDARES DE CÓDIGO

Guía de convenciones y estándares para mantener código consistente.

---

## 📝 Nombres y Convenciones

### Clases
```typescript
// ✅ Correcto: PascalCase
export class DataEngine { }
export class AnalyzeService { }

// ❌ Incorrecto
export class data_engine { }
export class analyzeService { }
```

### Funciones y Métodos
```typescript
// ✅ Correcto: camelCase, verbo descriptivo
async analyzeOpportunity(symbol: string): Promise<Report> { }
private calculateScore(): number { }

// ❌ Incorrecto
async analyze_opportunity(): void { }
private calc(): any { }
```

### Variables
```typescript
// ✅ Correcto: camelCase, nombre descriptivo
const marketData: MarketData = await fetchMarketData();
const winRate: number = 0.75;

// ❌ Incorrecto
const md = await fetchMarketData();
const wr = 0.75;
```

### Constantes
```typescript
// ✅ Correcto: UPPER_SNAKE_CASE
const MAX_CONFIDENCE = 100;
const DEFAULT_TIMEOUT = 5000;

// ❌ Incorrecto
const maxConfidence = 100;
const MAX-CONFIDENCE = 100;
```

---

## 📦 Estructura de Archivos

### Carpetas
```
module-name/
├── controllers/
│   └── analyze.controller.ts       # Recibe requests
├── services/
│   └── analyze.service.ts          # Lógica de negocio
├── dtos/
│   └── analyze.dto.ts              # Validación de datos
├── entities/
│   └── opportunity.entity.ts       # Modelos de BD
├── repositories/
│   └── opportunity.repository.ts   # Acceso a datos
├── guards/
│   └── jwt.guard.ts                # Autorización
└── module.ts                       # Declaración del módulo
```

### Nombres de Archivos
```typescript
// ✅ Correcto: kebab-case con sufijo
analyze.controller.ts
analyze.service.ts
analyze.dto.ts
jwt.guard.ts
opportunity.entity.ts

// ❌ Incorrecto
AnalyzeController.ts
analyze_service.ts
analyzeDTO.ts
```

---

## 📌 Tipado Fuerte (TypeScript)

### Siempre Especificar Tipos
```typescript
// ✅ Correcto
async analyzeOpportunity(symbol: string): Promise<Report> {
  const data: MarketData = await this.dataEngine.getMarketData(symbol);
  return report;
}

// ❌ Incorrecto (implicit any)
async analyzeOpportunity(symbol) {
  const data = await this.dataEngine.getMarketData(symbol);
  return report;
}
```

### Return Types en Funciones
```typescript
// ✅ Correcto
function calculateScore(data: MarketData): number {
  return Math.round(data.confidence * 100);
}

// ❌ Incorrecto
function calculateScore(data: MarketData) {
  return Math.round(data.confidence * 100);
}
```

### Genéricos Explícitos
```typescript
// ✅ Correcto
const results: Promise<Report[]> = this.analyzeMany(symbols);
const config: Map<string, number> = new Map();

// ❌ Incorrecto
const results = this.analyzeMany(symbols);
const config = new Map();
```

---

## 🎯 Inyección de Dependencias (NestJS)

### Constructor Injection
```typescript
// ✅ Correcto
@Injectable()
export class AnalyzeService {
  constructor(
    private readonly dataEngine: DataEngine,
    private readonly rulesEngine: RulesEngine,
    private readonly reportEngine: ReportEngine,
  ) {}
}

// ❌ Incorrecto (manual instantiation)
export class AnalyzeService {
  private dataEngine = new DataEngine();
}
```

### Module Exports
```typescript
// ✅ Correcto: Exportar servicios
@Module({
  providers: [AnalyzeService],
  exports: [AnalyzeService], // Otros módulos pueden usar
})
export class ApiModule {}

// ❌ Incorrecto: No exportar
@Module({
  providers: [AnalyzeService], // Otros no pueden usar
})
```

---

## ✅ Validación y Error Handling

### DTOs con class-validator
```typescript
// ✅ Correcto
export class AnalyzeDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsNumber()
  @Min(0)
  @Max(1000)
  entry: number;
}

// ❌ Incorrecto (sin validación)
export class AnalyzeDto {
  symbol: string;
  entry: number;
}
```

### Error Handling
```typescript
// ✅ Correcto
try {
  const data = await this.dataEngine.getMarketData(symbol);
  if (!data) {
    throw new BadRequestException('Symbol not found');
  }
  return data;
} catch (error) {
  this.logger.error(`Failed to analyze ${symbol}`, error);
  throw new InternalServerErrorException('Analysis failed');
}

// ❌ Incorrecto (silent failure)
try {
  const data = await this.dataEngine.getMarketData(symbol);
  return data;
} catch (error) {
  console.log('error'); // No loguear en producción
  return null;
}
```

---

## 📝 Comentarios

### NO necesita comentarios
```typescript
// ✅ Código autoexplicativo (no necesita comentario)
const winRate = (successfulTrades / totalTrades) * 100;
const isValidScore = score >= MIN_CONFIDENCE_THRESHOLD;

// ❌ Código que necesitaría comentario (mal)
const wr = (st / tt) * 100; // Esto necesita explicación
```

### SÍ necesita comentarios
```typescript
// ✅ Por qué (no el qué)
// RSI uses 14 periods by default (industry standard for options trading)
const RSI_PERIOD = 14;

// ✅ Workaround temporal
// TODO: Remove when Alpha Vantage adds support for options Greeks
const gexPlaceholder = 0;

// ✅ Comportamiento no obvio
// Firebase client must be initialized before first use (async initialization)
await firebaseClient.initialize();
```

---

## 🧪 Testing

### Archivo de Test
```typescript
// ✅ Correcto: .spec.ts
analyze.service.spec.ts
analyze.controller.spec.ts

// ❌ Incorrecto
analyze.test.ts
analyze_test.ts
```

### Estructura de Test
```typescript
// ✅ Correcto: Describe/It organizados
describe('AnalyzeService', () => {
  describe('analyzeOpportunity', () => {
    it('should return report with correct decision', () => {
      // Arrange
      const symbol = 'AAPL';
      
      // Act
      const result = service.analyzeOpportunity(symbol);
      
      // Assert
      expect(result.decision).toBe('operar');
    });
  });
});

// ❌ Incorrecto
it('test', () => {
  // Difícil de entender qué se prueba
});
```

---

## 🎨 Formato de Código

### Prettier (Automático)
```bash
npm run format
```

### ESLint (Validación)
```bash
npm run lint
npm run lint -- --fix  # Auto-fix cuando sea posible
```

### Máximo de Líneas por Archivo
- Controllers: 200 líneas
- Services: 300 líneas
- Entities: 100 líneas

Si excedes, divide en múltiples archivos.

---

## 🔐 Seguridad

### Nunca en Código
```typescript
// ❌ NUNCA
const API_KEY = 'sk-abc123...';
const PASSWORD = 'admin123';

// ✅ SIEMPRE
const apiKey = process.env.API_KEY;
const password = process.env.DB_PASSWORD;
```

### Validación de Entrada
```typescript
// ✅ Correcto: Validar antes de usar
@Post('/analyze')
@UseGuards(JwtAuthGuard)
async analyze(@Body() dto: AnalyzeDto) {
  // dto ya está validado automáticamente
  return this.analyzeService.analyze(dto);
}

// ❌ Incorrecto: Confiar en entrada
async analyze(@Body() body: any) {
  // Aquí body puede contener cualquier cosa
}
```

---

## 📊 Checklist Pre-Commit

- [ ] ✅ Código compila sin errores TypeScript
- [ ] ✅ Linting limpio (`npm run lint`)
- [ ] ✅ Tests pasan (`npm run test`)
- [ ] ✅ Coverage >80% (`npm run test:cov`)
- [ ] ✅ Nombres descriptivos (funciones, variables)
- [ ] ✅ Tipos explícitos en todo
- [ ] ✅ DTOs con validación
- [ ] ✅ Error handling apropiado
- [ ] ✅ Sin console.log en producción
- [ ] ✅ Sin comentarios innecesarios
- [ ] ✅ Commits descriptivos

---

## 🔄 Commits Descriptivos

### Formato
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Tipos
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Formato, linting (sin cambio de lógica)
- `refactor`: Refactorización sin cambio de funcionalidad
- `test`: Tests nuevos o modificados
- `chore`: Cambios en dependencias, setup

### Ejemplos
```bash
feat(core): Integrar DataEngine con TypeORM

fix(api): Corregir cálculo de confidence en endpoint

docs(modules): Actualizar documentación de CoreModule

test(analyze): Agregar 5 tests para edge cases
```

---

*Última actualización*: 2026-08-23
