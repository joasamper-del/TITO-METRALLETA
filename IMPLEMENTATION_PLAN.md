# 📋 PLAN DE IMPLEMENTACIÓN - TITO METRALLETA

**Documento Ejecutable**  
**Fecha**: 2026-08-23  
**Versión**: 1.0

---

## 🎯 RESUMEN EJECUTIVO

Este documento describe cómo construir Tito Metralleta **fase por fase**, con criterios claros de éxito y ambiente listo para desarrollo local.

**Filosofía**: Main branch es production-ready. Develop branch es trabajo en progreso. Cada feature en rama separada hasta completar fase.

---

## 🔄 WORKFLOW DE RAMAS

```
main (production)
  ↑
  ├─ release/v2.0    ← Release candidates
  ↑
develop (staging)
  ├─ feature/api-endpoints
  ├─ feature/dashboard
  └─ feature/database
```

**Reglas**:
- `main`: Solo código probado y listo para producción (tags de versión)
- `develop`: Código en desarrollo (puede romperse)
- `feature/*`: Ramas de feature individuales, merge a develop con PR
- Cada fase = merge a main cuando está lista

---

## 📦 FASE 0: PREPARACIÓN LOCAL (Día -1)

**Objetivo**: Ambiente listo para desarrollo sin fricciones.

### 0.1 Requisitos del Sistema

**Hardware**:
- [ ] Mínimo 8GB RAM (NestJS + React + PostgreSQL)
- [ ] 10GB espacio libre
- [ ] Procesador dual-core mínimo

**Software Requerido**:
- [ ] Node.js 18.x o superior
- [ ] npm 9.x o superior
- [ ] PostgreSQL 15.x (local o Docker)
- [ ] Git 2.40+
- [ ] Visual Studio Code (recomendado)

**Verificación**:
```bash
node --version   # v18.x+
npm --version    # 9.x+
git --version    # 2.40+
```

### 0.2 Setup del Repositorio

```bash
# Clonar (ya existe)
cd ~/projects
git clone https://github.com/joasamper-del/TITO-METRALLETA.git
cd TITO-METRALLETA

# Crear rama develop
git checkout -b develop
git push origin develop

# Configurar git para commits locales
git config user.email "joasamper80@gmail.com"
git config user.name "Tito Metralleta Dev"
```

### 0.3 Setup de PostgreSQL

**Opción A: Local**
```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# Windows
# Descargar desde https://www.postgresql.org/download/windows/
```

**Opción B: Docker (Recomendado)**
```bash
docker run --name tito-postgres \
  -e POSTGRES_USER=tito \
  -e POSTGRES_PASSWORD=metralleta \
  -e POSTGRES_DB=tito_db \
  -p 5432:5432 \
  -d postgres:15
```

**Verificación**:
```bash
psql -U tito -d tito_db -c "SELECT version();"
```

### 0.4 Crear archivo `.env.local`

```bash
# backend/.env.local
DATABASE_URL=postgresql://tito:metralleta@localhost:5432/tito_db
NODE_ENV=development
PORT=3000
JWT_SECRET=dev-secret-key-change-in-production
ALPHA_VANTAGE_KEY=your_key_here
FINNHUB_KEY=your_key_here

# frontend/.env.local
REACT_APP_API_URL=http://localhost:3000/api
```

### 0.5 Verificar Estructura

```bash
# Desde raíz del proyecto
tree -L 2
```

**Estructura esperada**:
```
TITO-METRALLETA/
├── src/                    # Motor core (ya existe)
├── backend/                # (Será creado)
├── frontend/               # (Será creado)
├── docs/                   # (Será creado)
├── VISION.md
├── ROADMAP.md
├── TECH_STACK.md
├── IMPLEMENTATION_PLAN.md  # Este archivo
└── .gitignore
```

**Verificación de Éxito**:
- ✅ Node, npm, git, PostgreSQL instalados
- ✅ Repositorio clonado, rama develop creada
- ✅ Base de datos funcionando
- ✅ Archivos .env configurados
- ✅ Git configurado

---

## 🏗️ FASE 1: BACKEND CORE (Día 1-8)

**Objetivo**: API REST funcional que expone los motores existentes.

### 1.1 Setup NestJS

```bash
# Crear proyecto NestJS
cd TITO-METRALLETA
nest new backend --package-manager npm --git false

# Entrar a directorio
cd backend

# Instalar dependencias adicionales
npm install @nestjs/typeorm @nestjs/config typeorm pg
npm install class-validator class-transformer
npm install bcrypt jsonwebtoken
npm install --save-dev @types/node @types/bcrypt

# Copiar motores core
cp -r ../src ./src/core
```

### 1.2 Crear Estructura NestJS

```bash
# Generar módulos base
nest g module core
nest g module api
nest g module database
nest g module auth

# Generar controllers
nest g controller api/analyze --no-spec
nest g controller api/rules --no-spec
nest g controller api/results --no-spec
nest g controller api/stats --no-spec

# Generar services
nest g service api/analyze --no-spec
nest g service api/rules --no-spec
nest g service api/results --no-spec
nest g service api/stats --no-spec
```

### 1.3 Integración de Motores Core

**En `backend/src/core/core.module.ts`**:
```typescript
import { Module } from '@nestjs/common';
import { TitoMetralletaAnalyzer } from './analyzer';

@Module({
  providers: [
    {
      provide: 'ANALYZER',
      useFactory: () => {
        return new TitoMetralletaAnalyzer(
          process.env.ALPHA_VANTAGE_KEY,
          process.env.FINNHUB_KEY
        );
      },
    },
  ],
  exports: ['ANALYZER'],
})
export class CoreModule {}
```

### 1.4 Crear Endpoints API

**POST /api/analyze** - Analizar oportunidad
```typescript
// Request
{
  symbol: "AAPL",
  strategy: "Momentum Intraday",
  plan: {
    entry: 150.5,
    target: 152.0,
    stop: 149.5,
    notes: "Ruptura de resistencia"
  }
}

// Response
{
  id: "uuid",
  symbol: "AAPL",
  decision: "operar",
  confidence: 87,
  risk: "bajo",
  reasons: [...],
  timestamp: "2026-08-23T..."
}
```

**GET /api/rules** - Listar reglas
**PUT /api/rules/:id** - Ajustar regla
**POST /api/results** - Registrar resultado
**GET /api/stats** - Estadísticas

### 1.5 Base de Datos TypeORM

**Entities**:
```typescript
// OpportunityReport
@Entity('opportunities')
export class Opportunity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 10 })
  symbol: string;

  @Column('text')
  analysis: string; // JSON stringified

  @Column('varchar', { length: 20 })
  decision: string;

  @Column('float')
  confidence: number;

  @CreateDateColumn()
  createdAt: Date;
}

// TradeResult
@Entity('trade_results')
export class TradeResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Opportunity)
  opportunity: Opportunity;

  @Column('varchar', { length: 10 })
  result: string; // 'ganancia' | 'pérdida'

  @Column('float')
  points: number;

  @CreateDateColumn()
  recordedAt: Date;
}
```

### 1.6 Testing Backend

```bash
npm run test
npm run test:cov  # Coverage
```

**Requisitos**:
- [ ] Todos los endpoints responden
- [ ] Conexión a base de datos funciona
- [ ] Motores core integrados y funcionando
- [ ] JWT authentication implementado
- [ ] Rate limiting configurado
- [ ] 80%+ test coverage

**Criterio de Éxito FASE 1**:
✅ Backend deployable en Render  
✅ Todos los endpoints testeados  
✅ BD persiste datos correctamente  
✅ Documentación API completa (Swagger)  

---

## 🎨 FASE 2: FRONTEND (Día 9-16)

**Objetivo**: Interfaz web funcional conectada al backend.

### 2.1 Setup React + Vite

```bash
cd TITO-METRALLETA
npm create vite@latest frontend -- --template react
cd frontend

npm install
npm install axios react-query tailwindcss postcss autoprefixer
npm install recharts react-hook-form
npm install -D @tailwindcss/forms

# Setup Tailwind
npx tailwindcss init -p
```

### 2.2 Estructura React

```
frontend/src/
├── components/
│   ├── Dashboard.tsx          # Página principal
│   ├── AnalysisForm.tsx       # Formulario análisis
│   ├── ReportViewer.tsx       # Ver reporte
│   ├── HistoryTable.tsx       # Histórico
│   └── Charts.tsx             # Gráficos
├── hooks/
│   ├── useAnalysis.ts         # API calls
│   ├── useRules.ts
│   └── useStats.ts
├── pages/
│   ├── AnalyzePage.tsx
│   ├── HistoryPage.tsx
│   └── StatsPage.tsx
├── App.tsx
└── main.tsx
```

### 2.3 Páginas Principales

**Dashboard**
- Estadísticas en cards (Win Rate, Total Operaciones)
- Gráfico de equity curve
- Últimos 5 reportes

**Análisis**
- Formulario: símbolo, estrategia, plan
- Submit → POST /api/analyze
- Mostrar reporte resultado

**Histórico**
- Tabla de reportes pasados
- Filtros: fecha, símbolo, resultado
- Click para ver detalles

### 2.4 Integración API

```typescript
// hooks/useAnalysis.ts
export const useAnalysis = () => {
  return useMutation(
    (data) => axios.post('/api/analyze', data),
    {
      onSuccess: (data) => {
        // Mostrar reporte
      },
      onError: (error) => {
        // Mostrar error
      },
    }
  );
};
```

### 2.5 Testing Frontend

```bash
npm run test
npm run build  # Verificar bundle
npm run preview
```

**Requisitos**:
- [ ] Todas las páginas cargables
- [ ] Formularios envían datos correctamente
- [ ] Gráficos se renderizan
- [ ] Responsive en mobile
- [ ] Lighthouse score >90

**Criterio de Éxito FASE 2**:
✅ Frontend deployable en Vercel  
✅ Conectado a backend funcionalmente  
✅ Todas las funciones básicas operan  
✅ Responsive design validado  

---

## 🗄️ FASE 3: INTEGRACIÓN Y CI/CD (Día 17-20)

**Objetivo**: Sistema completo funcionando end-to-end con deployment automático.

### 3.1 Docker Compose Local

```yaml
# docker-compose.yml
version: '3.9'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: tito
      POSTGRES_PASSWORD: metralleta
      POSTGRES_DB: tito_db
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    depends_on:
      - postgres
    environment:
      DATABASE_URL: postgresql://tito:metralleta@postgres:5432/tito_db

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    depends_on:
      - backend
```

**Ejecutar**:
```bash
docker-compose up
# Backend en http://localhost:3000
# Frontend en http://localhost:5173
```

### 3.2 GitHub Actions CI/CD

**`.github/workflows/test.yml`**:
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci --prefix backend
      - run: npm run test:cov --prefix backend
      - uses: codecov/codecov-action@v3
```

**`.github/workflows/deploy.yml`**:
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Render
        run: curl ${{ secrets.RENDER_DEPLOY_HOOK }}
      - name: Deploy to Vercel
        run: vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

### 3.3 Deployment a Producción

**Vercel (Frontend)**:
```bash
npm install -g vercel
cd frontend
vercel --prod
```

**Render (Backend)**:
```bash
# En Render dashboard, conectar repositorio
# Configurar variables de entorno
# Auto-deploy en cada push a main
```

### 3.4 Documentación Producción

**README.md actualizado**:
- Cómo correr localmente
- Cómo desplegar
- Problemas comunes
- Endpoints disponibles

**Criterio de Éxito FASE 3**:
✅ Sistema E2E funciona locally  
✅ CI/CD verde en GitHub  
✅ Deployment a Vercel + Render exitoso  
✅ Base de datos en backup automático  
✅ Monitoreo en producción funciona  

---

## ✅ CRITERIOS DE ÉXITO GLOBALES

### Funcionalidad
- [ ] Backend API 100% funcional
- [ ] Frontend carga y responde
- [ ] Base de datos persiste datos
- [ ] Análisis devuelve resultados correctos
- [ ] Histórico se registra completamente

### Calidad de Código
- [ ] TypeScript zero implicit any
- [ ] Tests coverage >80%
- [ ] Linting sin errores
- [ ] No console.log en producción
- [ ] Manejo de errores completo

### Seguridad
- [ ] JWT tokens implementados
- [ ] Rate limiting activo
- [ ] CORS restringido
- [ ] Input validation en todo endpoint
- [ ] No credenciales en código

### Performance
- [ ] Backend responses <200ms
- [ ] Frontend load <2s
- [ ] Database queries <50ms
- [ ] Lighthouse >90

### Documentación
- [ ] README completo
- [ ] API documentada (Swagger)
- [ ] Arquitectura explicada
- [ ] Guía de desarrollo
- [ ] Guía de deployment

---

## 📅 TIMELINE DETALLADO

### Semana 1: Backend
```
Lunes:    Setup NestJS + PostgreSQL
Martes:   Integrar motores core
Miércoles: Endpoints /api/analyze, /api/rules
Jueves:   Endpoints /api/results, /api/stats
Viernes:  Testing + documentación
```

### Semana 2: Frontend
```
Lunes:    Setup React + Vite
Martes:   Dashboard + AnalysisForm
Miércoles: HistoryTable + Charts
Jueves:   Testing + responsivo
Viernes:  Integración E2E
```

### Semana 3: Deploy
```
Lunes:    Docker Compose local
Martes:   GitHub Actions CI/CD
Miércoles: Deploy Vercel + Render
Jueves:   Testing producción
Viernes:  Documentación final
```

---

## 🔍 CHECKLIST FINAL

### Antes de Cada Commit
- [ ] Tests pasan (`npm test`)
- [ ] No hay errores TypeScript
- [ ] Linting limpio (`npm run lint`)
- [ ] Mensaje descriptivo
- [ ] Rama correcta (develop o feature/*)

### Antes de Merge a Main
- [ ] PR descripción clara
- [ ] Todos los tests pasan
- [ ] Code review aprobado
- [ ] Documentación actualizada
- [ ] Versión bumped (package.json)

### Antes de Release
- [ ] CHANGELOG actualizado
- [ ] Tag creado (`git tag v2.0.0`)
- [ ] Deploy a producción testeado
- [ ] Rollback plan definido
- [ ] Post-mortem si hay issues

---

## 🆘 TROUBLESHOOTING

### PostgreSQL no conecta
```bash
# Verificar que está corriendo
psql -U tito -d tito_db -c "SELECT 1;"

# Si falla, reiniciar
docker restart tito-postgres
```

### Node modules corrupto
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port 3000/5173 en uso
```bash
# Encontrar proceso
lsof -i :3000
kill -9 <PID>
```

### Git merge conflicts
```bash
git fetch origin develop
git rebase origin/develop
# Resolver conflictos manualmente
git rebase --continue
```

---

## 📚 REFERENCIAS

- [NestJS Docs](https://docs.nestjs.com/)
- [React Docs](https://react.dev/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Vercel Docs](https://vercel.com/docs)
- [Render Docs](https://render.com/docs)

---

## 🎯 PRÓXIMOS PASOS INMEDIATOS

1. ✅ Este documento está completo
2. ⏳ Crear rama `develop` (siguiente comando)
3. ⏳ Setup local (Fase 0)
4. ⏳ Comenzar Fase 1 Backend

```bash
# Crear rama develop
git checkout -b develop
git push origin develop

# Crear rama feature para Fase 1
git checkout -b feature/backend-setup
```

---

*Plan ejecutable por*: joasamper80@gmail.com  
*Versión*: 1.0 (2026-08-23)  
*Repositorio*: https://github.com/joasamper-del/TITO-METRALLETA.git
