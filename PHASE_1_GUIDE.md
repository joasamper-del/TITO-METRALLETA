# 📋 PHASE 1 GUIDE - Implementación Backend MVP

**Objetivo**: Implementar el backend completo de Tito Metralleta en Fase 1.  
**Duración esperada**: 2-3 sesiones de desarrollo  
**Estado inicial**: Backend estructura lista, código vacío, sin npm install  

---

## ✅ ESTADO ACTUAL (23/08/2026)

### Completado en Setup:
- ✅ Estructura NestJS lista
- ✅ Módulos organizados (core, api, auth, database)
- ✅ package.json con todas las dependencias
- ✅ tsconfig.json y configuración de build
- ✅ .env.example y documentación base
- ✅ ESLint y Prettier configurados
- ✅ Rama: `feature/backend-setup`

### Pendiente en Fase 1:
- ❌ npm install
- ❌ Integración de motores core (DataEngine, RulesEngine, ReportEngine)
- ❌ Entities (Opportunity, TradeResult)
- ❌ Repositorios
- ❌ Servicios (Analyze, Rules, Results, Stats)
- ❌ Controladores
- ❌ Autenticación JWT
- ❌ Tests (target >80% coverage)
- ❌ Documentación Swagger

---

## 🎯 FASES DE IMPLEMENTACIÓN

### FASE 1A: Dependencias y Setup Básico (Sesión 1)

```
1. npm install en backend/
2. Verificar que npm run lint y npm run build funcionan
3. Crear .env local
4. Ejecutar npm run start:dev y verificar que arranca
```

**Commits esperados**:
- `chore(backend): npm install y verificación de build`

**Tiempo**: ~15 minutos

---

### FASE 1B: Integrar Motores Core (Sesión 1)

```
1. Importar DataEngine desde ../../src/engines
2. Importar RulesEngine desde ../../src/engines
3. Importar ReportEngine desde ../../src/engines
4. Importar TitoMetralletaAnalyzer desde ../../src/core
5. Crear providers en core.module.ts
6. Tests: crear y pasar tests unitarios para cada motor
```

**Ubicación**: `backend/src/modules/core/`

**Commits esperados**:
- `feat(core): Integrar DataEngine, RulesEngine, ReportEngine`
- `test(core): Tests unitarios para motores core`

**Tiempo**: ~45 minutos

---

### FASE 1C: Crear Entities y Database Module (Sesión 1-2)

```
1. Crear Opportunity entity
   - id (UUID)
   - symbol, strategy, analysis (JSONB)
   - decision, confidence, risk
   - entry, target, stop, notes
   - created_at, updated_at

2. Crear TradeResult entity
   - id (UUID)
   - opportunity_id (FK)
   - result, points
   - success_reasons[], failure_reasons[], lessons[]
   - recorded_at

3. Configurar TypeOrmModule en database.module.ts
4. Crear migrations
```

**Ubicación**: `backend/src/modules/database/entities/`

**Commits esperados**:
- `feat(database): Crear entities Opportunity y TradeResult`
- `feat(database): Configurar TypeORM e migrations`

**Tiempo**: ~30 minutos

---

### FASE 1D: Crear Servicios API (Sesión 2)

```
1. AnalyzeService
   - receive(symbol, strategy, plan)
   - call DataEngine
   - call RulesEngine
   - call ReportEngine
   - persist Opportunity
   - return report

2. RulesService
   - getRules()
   - updateRule(id, weight, enabled)

3. ResultsService
   - recordResult(opportunityId, result, points, reasons)
   - persist TradeResult

4. StatsService
   - calculateStats()
   - getWinRate()
   - getRuleEffectiveness()
```

**Ubicación**: `backend/src/modules/api/services/`

**Tests**: Unit tests para cada servicio (mock de BD)

**Commits esperados**:
- `feat(api): Crear AnalyzeService, RulesService, ResultsService, StatsService`
- `test(api): Tests unitarios para servicios`

**Tiempo**: ~60 minutos

---

### FASE 1E: Crear Controladores (Sesión 2)

```
1. AnalyzeController
   POST /api/analyze

2. RulesController
   GET /api/rules
   PUT /api/rules/:id

3. ResultsController
   POST /api/results

4. StatsController
   GET /api/stats

5. HealthController
   GET /health
```

**DTOs con validación** usando class-validator

**Commits esperados**:
- `feat(api): Crear controllers y DTOs`
- `test(api): Integration tests para endpoints`

**Tiempo**: ~45 minutos

---

### FASE 1F: Autenticación JWT (Sesión 2-3)

```
1. JwtStrategy
   - ExtractJwt.fromAuthHeaderAsBearerToken()
   - Validar contra JWT_SECRET

2. JwtGuard
   - Proteger endpoints sensibles

3. Roles Guard (opcional para MVP)

4. Decorador @Auth() para endpoints
```

**Ubicación**: `backend/src/modules/auth/`

**Commits esperados**:
- `feat(auth): Implementar JWT strategy y guard`
- `feat(api): Proteger endpoints sensibles`

**Tiempo**: ~30 minutos

---

### FASE 1G: Tests y Cobertura (Sesión 3)

```
1. Unit tests para cada servicio
2. Integration tests para endpoints
3. Mock de BD con TypeORM
4. Alcanzar >80% coverage
```

**Comando**: `npm run test:cov`

**Commits esperados**:
- `test(api): Cobertura >80% en tests`

**Tiempo**: ~90 minutos

---

### FASE 1H: Documentación Swagger (Sesión 3)

```
1. Instalar @nestjs/swagger
2. Configurar SwaggerModule en main.ts
3. Documentar cada endpoint
4. Accesible en /api/docs
```

**Commits esperados**:
- `docs(api): Documentación Swagger completa`

**Tiempo**: ~30 minutos

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Pre-Implementation
- [ ] Leer este documento completo
- [ ] Revisar MVP.md y NEXT_STEPS.md
- [ ] Entender los 3 motores core (DataEngine, RulesEngine, ReportEngine)
- [ ] Conocer la estructura de entities

### Fase 1A: Setup
- [ ] `npm install` en backend/
- [ ] `npm run lint` pasa sin errores
- [ ] `npm run build` genera dist/ sin errores
- [ ] `npm run start:dev` arranca en puerto 3000
- [ ] Acceder a http://localhost:3000 y verificar mensaje
- [ ] Commit: chore(backend): npm install

### Fase 1B: Motores Core
- [ ] DataEngine integrado en core.module.ts
- [ ] RulesEngine integrado
- [ ] ReportEngine integrado
- [ ] TitoMetralletaAnalyzer integrado
- [ ] Tests unitarios para motores pasan
- [ ] Coverage >80% para core
- [ ] Commit: feat(core): Integrar motores

### Fase 1C: Database
- [ ] Opportunity entity creada
- [ ] TradeResult entity creada
- [ ] TypeOrmModule configurado
- [ ] Migration creada y ejecutada
- [ ] Repositorio de Opportunity funciona
- [ ] Repositorio de TradeResult funciona
- [ ] Verificar datos en PostgreSQL
- [ ] Commit: feat(database): Entities y migrations

### Fase 1D: Servicios
- [ ] AnalyzeService completo
- [ ] RulesService completo
- [ ] ResultsService completo
- [ ] StatsService completo
- [ ] Tests unitarios pasan
- [ ] Coverage >80% para services
- [ ] Commit: feat(api): Servicios

### Fase 1E: Controladores
- [ ] AnalyzeController funciona (POST /api/analyze)
- [ ] RulesController funciona (GET/PUT /api/rules)
- [ ] ResultsController funciona (POST /api/results)
- [ ] StatsController funciona (GET /api/stats)
- [ ] HealthController funciona (GET /health)
- [ ] DTOs con validación
- [ ] Integration tests pasan
- [ ] Probar en Postman/Insomnia
- [ ] Commit: feat(api): Controladores

### Fase 1F: Autenticación
- [ ] JwtStrategy configurada
- [ ] JwtGuard protege endpoints
- [ ] Token JWT se valida correctamente
- [ ] Tests de auth pasan
- [ ] Commit: feat(auth): JWT implementado

### Fase 1G: Tests
- [ ] `npm run test` pasa todos los tests
- [ ] `npm run test:cov` >80% coverage
- [ ] Coverage reporte generado
- [ ] Commit: test(api): Cobertura completa

### Fase 1H: Documentación
- [ ] Swagger configurado
- [ ] /api/docs accesible
- [ ] Todos los endpoints documentados
- [ ] Ejemplos de request/response
- [ ] Commit: docs(api): Swagger completo

### Final
- [ ] `npm run build` ✅
- [ ] `npm run start:dev` ✅ (Backend funciona localmente)
- [ ] `npm run test:cov` >80% ✅
- [ ] `npm run lint` sin errores ✅
- [ ] Todos los endpoints probados ✅
- [ ] README.md actualizado ✅
- [ ] Rama limpia, sin cambios sin commitear ✅

---

## 🚀 CÓMO EJECUTAR CADA FASE

### Antes de empezar:
```bash
cd backend
npm install

# Crear .env local
cat > .env << EOF
DATABASE_URL=postgresql://user:password@localhost:5432/tito_metralleta
JWT_SECRET=your-jwt-secret-key-change-in-production
ALPHA_VANTAGE_KEY=your-api-key
FINNHUB_KEY=your-api-key
EOF
```

### Fase 1A:
```bash
npm run lint
npm run build
npm run start:dev
# Verificar en http://localhost:3000
```

### Fase 1B:
```bash
npm run test
npm run test:cov
git commit -m "feat(core): Integrar motores core"
```

### Fase 1C:
```bash
# Ejecutar migrations (TypeORM)
npm run typeorm:run-migrations
npm run test
git commit -m "feat(database): Entities y migrations"
```

### Fase 1D-1E:
```bash
npm run test
npm run test:cov
git commit -m "feat(api): Servicios y controladores"
```

### Fase 1F:
```bash
npm run test
git commit -m "feat(auth): JWT implementado"
```

### Fase 1G:
```bash
npm run test:cov  # Debe mostrar >80%
git commit -m "test(api): Cobertura completa"
```

### Fase 1H:
```bash
npm run start:dev
# Acceder a http://localhost:3000/api/docs
git commit -m "docs(api): Swagger completo"
```

---

## 📊 CRITERIOS DE ÉXITO FASE 1

| Criterio | Requisito | Verificación |
|----------|-----------|--------------|
| **Build** | Sin errores | `npm run build` ✅ |
| **Tests** | >80% coverage | `npm run test:cov` ✅ |
| **Endpoints** | 5 funcionan | Postman/Insomnia ✅ |
| **BD** | Datos persisten | PostgreSQL ✅ |
| **Auth** | JWT funciona | Token válido ✅ |
| **API Response** | <500ms | Chrome DevTools ✅ |
| **Docs** | Swagger completo | http://localhost:3000/api/docs ✅ |
| **Lint** | Sin errores | `npm run lint` ✅ |

---

## 🔄 MERGE A MAIN

Cuando Fase 1 esté 100% completa:

```bash
# Verificaciones finales
npm run build
npm run test:cov  # >80%
npm run lint

# Cambiar a main y mergear
git checkout main
git pull origin main
git merge feature/backend-setup --no-ff
git push origin main

# Crear release tag
git tag -a v1.0-backend -m "Release v1.0 Backend completo"
git push origin v1.0-backend
```

---

## 💡 TIPS Y BUENAS PRÁCTICAS

1. **Commits pequeños**: Cada feature = un commit
2. **Tests primero**: Escribir tests antes de código cuando sea posible
3. **Documentación**: Actualizar README conforme avanzas
4. **Prueba localmente**: `npm run start:dev` y verifica en Postman
5. **Usa alias TS**: `@/...` funciona para imports (tsconfig ya configurado)
6. **Revisa errors**: `npm run lint` evita problemas después
7. **Coverage**: Cada commit debe mantener >80%

---

## 🆘 PROBLEMAS COMUNES

### Error: "No entities found"
```
Solución: Verificar que entities están en src/modules/database/entities/
y están registradas en TypeOrmModule.forFeature()
```

### Error: Circular module dependencies
```
Solución: Usar providedIn: 'root' en @Injectable()
o pasar módulos en imports correctamente
```

### Tests no se ejecutan
```
Solución: Verificar jest.config en package.json
Archivos deben terminar en .spec.ts
```

### TypeORM: "Cannot find driver"
```
Solución: npm install pg (PostgreSQL driver)
Verificar DATABASE_URL en .env
```

---

## 📚 REFERENCIAS

- **MVP.md**: Definición exacta de qué es el MVP (leer primero)
- **NEXT_STEPS.md**: Pasos detallados de implementación
- **ARCHITECTURE.md**: Diagrama de arquitectura
- **TECH_STACK.md**: Stack tecnológico elegido
- **MODULES.md**: Especificación de módulos (crear durante Fase 1)

---

## 🎬 RESUMEN VISUAL DEL FLUJO

```
┌─────────────────────────────────────────────────────────┐
│                   TITO METRALLETA v1.0                  │
│                       FASE 1 BACKEND                    │
└─────────────────────────────────────────────────────────┘

1️⃣ Setup & Dependencies (Fase 1A)
   └→ npm install ✅
   └→ Build & lint ✅

2️⃣ Core Engines Integration (Fase 1B)
   └→ DataEngine ✅
   └→ RulesEngine ✅
   └→ ReportEngine ✅

3️⃣ Database Layer (Fase 1C)
   └→ Entities ✅
   └→ Migrations ✅
   └→ Repositories ✅

4️⃣ API Services (Fase 1D)
   └→ AnalyzeService ✅
   └→ RulesService ✅
   └→ ResultsService ✅
   └→ StatsService ✅

5️⃣ API Controllers (Fase 1E)
   └→ 5 Endpoints ✅
   └→ DTOs + Validation ✅

6️⃣ Authentication (Fase 1F)
   └→ JWT Strategy ✅
   └→ JWT Guard ✅

7️⃣ Testing (Fase 1G)
   └→ >80% Coverage ✅

8️⃣ Documentation (Fase 1H)
   └→ Swagger ✅

                ↓
         🚀 FASE 1 COMPLETA
         Listo para Fase 2
```

---

**Creado**: 2026-08-23  
**Rama**: feature/backend-setup  
**Autor**: Tito Metralleta MVP Team  
**Versión**: 1.0 - Implementation Guide

*Próximo paso: Comenzar Fase 1A - npm install y setup*
