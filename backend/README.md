# Backend - Tito Metralleta

API REST de Tito Metralleta construida con NestJS.

## Instalación

```bash
npm install
```

## Configuración

1. Copiar `.env.example` a `.env.local`
2. Completar variables de entorno
3. Asegurar que PostgreSQL está corriendo

## Desarrollo

```bash
# Modo watch (recompila en cada cambio)
npm run start:dev

# Ejecutar tests
npm run test

# Ejecutar tests con coverage
npm run test:cov

# Linting
npm run lint
```

## Endpoints (Por implementar)

- `POST /api/analyze` - Analizar oportunidad
- `GET /api/rules` - Listar reglas
- `PUT /api/rules/:id` - Ajustar regla
- `POST /api/results` - Registrar resultado
- `GET /api/stats` - Estadísticas

## Estructura

```
src/
├── modules/
│   ├── core/       # Motores de Tito Metralleta
│   ├── api/        # Endpoints públicos
│   ├── database/   # Entities y repositories
│   └── auth/       # Autenticación
├── main.ts         # Entry point
└── app.module.ts   # Root module
```

## TODO - Fase 1

- [ ] Integrar motores core (Data, Rules, Report engines)
- [ ] Crear entities (Opportunity, TradeResult)
- [ ] Implementar autenticación JWT
- [ ] Crear endpoints POST /api/analyze
- [ ] Crear endpoints GET /api/rules
- [ ] Crear endpoints PUT /api/rules/:id
- [ ] Crear endpoints POST /api/results
- [ ] Crear endpoints GET /api/stats
- [ ] Tests para todos los endpoints
- [ ] Documentación API (Swagger)
