# 🚀 Próximos Pasos - Sesión 2

**Última actualización**: 2026-08-23  
**Rama actual**: `feature/backend-setup` (lista para PR)  
**Estatus**: Fase 1A-1D completa, Fase 1F-1H pendiente

---

## ✅ Estado Actual

- Backend compila sin errores críticos
- npm install exitoso (799 packages)
- Servidor arranca: `npm run start:dev`
- 5 endpoints listos (compilados, sin JWT aún)
- 2 entities en TypeORM
- 4 servicios API
- Documentación completa (PHASE_1_GUIDE.md)

---

## 📋 Fase 1F: Autenticación JWT (SIGUIENTE)

**Tiempo estimado**: 45 minutos

### Paso 1: JWT Strategy
```bash
# Archivo: backend/src/modules/auth/strategies/jwt.strategy.ts

- Importar JwtStrategy de @nestjs/passport
- Configurar ExtractJwt.fromAuthHeaderAsBearerToken()
- validate() retorna { userId, email }
```

### Paso 2: JWT Guard
```bash
# Archivo: backend/src/modules/auth/guards/jwt.guard.ts

- Crear JwtGuard extends AuthGuard('jwt')
- Proteger endpoints sensibles
```

### Paso 3: Proteger Endpoints
```bash
# Actualizar controllers:
- AnalyzeController: @UseGuards(JwtGuard)
- ResultsController: @UseGuards(JwtGuard)
- RulesController: PUT solo
- Health: SIN protección (público)
```

### Tests
```bash
npm run test
# Verificar que tests de auth pasan
```

---

## 📊 Fase 1G: Cobertura de Tests (DESPUÉS)

**Tiempo estimado**: 90 minutos  
**Objetivo**: >80% coverage

### Tests a Agregar
- `analyze.service.spec.ts` - orquestación completa
- `results.service.spec.ts` - persistencia
- `stats.service.spec.ts` - cálculos (ya existe)
- Controllers tests (POST /api/analyze, etc.)
- Auth tests (JWT validation)

### Comando
```bash
npm run test:cov
# Debe mostrar >80% coverage
```

---

## 📚 Fase 1H: Documentación Swagger (FINAL)

**Tiempo estimado**: 30 minutos

### Instalación
```bash
npm install @nestjs/swagger swagger-ui-express
```

### Configuración en main.ts
```typescript
const config = new DocumentBuilder()
  .setTitle('Tito Metralleta API')
  .setDescription('Sistema de análisis de trading')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

### Decoradores en Controllers
```typescript
@ApiOperation({ summary: 'Analizar oportunidad' })
@ApiResponse({ status: 200, description: 'Análisis completado' })
```

### Acceso
```
http://localhost:3000/api/docs
```

---

## 🧪 Verificación Final (TODO)

Antes de hacer merge a main:

```bash
# 1. Compilar
npm run build

# 2. Tests
npm run test:cov    # Debe ser >80%

# 3. Linting
npm run lint

# 4. Servidor
npm run start:dev   # Verificar que arranca

# 5. Endpoints (Postman/Insomnia)
POST http://localhost:3000/api/analyze
GET  http://localhost:3000/api/rules
POST http://localhost:3000/api/results
GET  http://localhost:3000/api/stats
GET  http://localhost:3000/health

# 6. Swagger
http://localhost:3000/api/docs
```

---

## 📝 Comandos Rápidos (Copy-Paste)

```bash
# Empezar desarrollo
cd backend
npm run start:dev

# Tests
npm run test:cov

# Build
npm run build

# Lint
npm run lint
```

---

## 🎯 Orden de Implementación (Sesión 2)

1. **JWT Strategy** (15 min)
2. **JWT Guard** (15 min)
3. **Proteger endpoints** (15 min)
4. **Tests JWT** (30 min) → Subtotal: 75 min

5. **Cobertura tests** (90 min)

6. **Swagger docs** (30 min)

7. **Verificación final** (15 min)

**Total estimado**: 3-4 horas

---

## 📌 Notas Importantes

- ✅ No hacer merge a main hasta tener >80% tests
- ✅ JWT_SECRET debe estar en .env (usar uuid en desarrollo)
- ✅ Swagger decorators en TODOS los endpoints
- ✅ Verificar que endpoints responden en <500ms
- ✅ Database URL debe apuntar a PostgreSQL local/staging

---

## 🔗 Referencias

- [PHASE_1_GUIDE.md](PHASE_1_GUIDE.md) - Especificaciones completas
- [MVP.md](MVP.md) - Definición de MVP
- [backend/README.md](backend/README.md) - Setup del backend

---

## ⏭️ Después de Fase 1 (Fase 2)

- Frontend React
- Dashboard de estadísticas
- Backtesting
- UI/UX completo

---

**Estado**: 🟢 Listo para retomar  
**Rama**: feature/backend-setup  
**Commits**: 2 descriptivos, pusheados a GitHub
