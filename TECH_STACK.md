# 🛠️ TECH STACK - TITO METRALLETA

**Decisión Arquitectónica**  
**Fecha**: 2026-08-23  
**Versión**: 1.0

---

## ✅ STACK ELEGIDO

| Componente | Tecnología | Versión | Propósito |
|-----------|-----------|---------|----------|
| **Backend** | NestJS | 10.x | API REST, orquestación |
| **Base de Datos** | PostgreSQL | 15+ | Histórico, reportes, resultados |
| **Frontend** | React | 18.x | Interfaz web moderna |
| **Deployment** | Vercel + Render | - | Frontend + Backend sin esfuerzo |

---

## 🎯 POR QUÉ ESTA COMBINACIÓN

### NestJS (Backend)
**Por qué**:
- ✅ Estructura robusta y escalable (progressive framework)
- ✅ TypeScript nativo (type safety desde el inicio)
- ✅ Decoradores para validación y autorización
- ✅ Inyección de dependencias integrada
- ✅ Testing facilitado (Nest testing utilities)
- ✅ Documentación excelente
- ✅ Ideal para crecer de MVP a producción

**Caso de uso perfecto**:
- Motor Core (TypeScript) se integra sin fricción
- Módulos para cada funcionalidad (DataEngine, RulesEngine, ReportEngine)
- Guards/Pipes para seguridad y validación
- Cron jobs para alertas y monitoreo

### PostgreSQL (Base de Datos)
**Por qué**:
- ✅ SQL estructurado (reportes y estadísticas complejas)
- ✅ ACID transactions (integridad de resultados críticos)
- ✅ JSON nativo (flexibilidad cuando la necesitemos)
- ✅ Índices potentes (queries rápidas de histórico)
- ✅ Replicación y backup robustos
- ✅ Open source maduro

**Caso de uso perfecto**:
- Histórico de reportes (NUNCA se borra)
- Resultados de trading (NUNCA se modifica)
- Análisis de efectividad de reglas
- Backups automáticos simples

### React (Frontend)
**Por qué**:
- ✅ Ecosistema masivo (librerías para todo)
- ✅ Component-based (reutilizable)
- ✅ Hooks modernos (simple y poderoso)
- ✅ React Query/SWR (manejo de datos facil)
- ✅ Tailwind/Material UI (styling rápido)
- ✅ Comunidad inmensa

**Caso de uso perfecto**:
- Dashboard interactivo con gráficos
- Formularios complejos (análisis)
- Tablas de histórico con filtros
- Actualizaciones en tiempo real

### Vercel + Render (Deployment)
**Por qué Vercel**:
- ✅ Frontend React optimizado automáticamente
- ✅ Serverless functions (no servidor que mantener)
- ✅ Preview deployments (PR automáticas)
- ✅ Analytics y edge caching
- ✅ Git integration directo

**Por qué Render**:
- ✅ Backend Node/NestJS con facilidad
- ✅ PostgreSQL hosted integrado
- ✅ Ambiente staging/production automático
- ✅ Auto-scaling
- ✅ Más barato que Heroku
- ✅ Buena alternativa a AWS/DigitalOcean para MVP

---

## ⚠️ DESVENTAJAS IMPORTANTES

### NestJS
| Desventaja | Impacto | Mitigación |
|-----------|---------|-----------|
| **Curva de aprendizaje** | Media | Documentación excelente, comunidad grande |
| **Más verboso que Express** | Bajo | Vale la pena para escalabilidad |
| **Setup inicial lento** | Bajo | Usar CLI: `nest new` genera estructura |
| **Overhead de reflexión (decorators)** | Muy Bajo | Negligible para nuestra escala |

**Riesgo**: Si Víctor no conoce NestJS, hay curva de aprendizaje.  
**Solución**: Documentar arquitectura NestJS en comentarios.

---

### PostgreSQL
| Desventaja | Impacto | Mitigación |
|-----------|---------|-----------|
| **Setup más complejo que SQLite** | Bajo | Render lo maneja todo |
| **Mayor consumo de memoria** | Bajo | Suficiente para MVP |
| **Backup manual si no es managed** | Medio | Usar Render (backups automáticos) |

**Riesgo**: Complejidad inicial de configuración.  
**Solución**: Usar Render managed PostgreSQL (todo automático).

---

### React
| Desventaja | Impacto | Mitigación |
|-----------|---------|-----------|
| **Ecosistema caótico** | Medio | Usar stack: React + Tailwind + React Query |
| **Dependencias frecuentes** | Bajo | Usar Dependabot (GitHub) para updates |
| **Bundle size si no optimizas** | Bajo | Next.js o Vite para optimización |
| **Requiere build step** | Bajo | Vercel lo maneja automáticamente |

**Riesgo**: Decisiones de arquitectura fragmentadas.  
**Solución**: Definir estructura clara desde inicio (componentes, hooks, state).

---

### Vercel + Render
| Desventaja | Impacto | Mitigación |
|-----------|---------|-----------|
| **Vendor lock-in** | Medio | Código portable, solo cambiar deployment |
| **Costo puede crecer** | Bajo | Presupuesto transparente, alertas |
| **Latencia si usuario está lejos** | Bajo | Render tiene múltiples regiones |
| **Límite de tiempo de request (30s)** | Bajo | Nuestras requests son rápidas (<2s) |

**Riesgo**: Dependencia de proveedores externos.  
**Solución**: Usar Docker local para desarrollo (portable).

---

## 🚀 IMPLEMENTACIÓN FASE 1 (MVP)

### Estructura NestJS + PostgreSQL

```
backend/
├── src/
│   ├── modules/
│   │   ├── core/              # Motores (ya existen)
│   │   │   ├── dataEngine/
│   │   │   ├── rulesEngine/
│   │   │   └── reportEngine/
│   │   ├── api/               # Endpoints
│   │   │   ├── analyze/
│   │   │   ├── rules/
│   │   │   ├── results/
│   │   │   └── stats/
│   │   ├── database/          # TypeORM
│   │   │   ├── entities/      # OpportunityReport, TradeResult
│   │   │   └── repositories/
│   │   └── common/
│   │       ├── guards/        # Auth, rate limit
│   │       ├── pipes/         # Validation
│   │       └── filters/       # Exception handling
│   └── main.ts
└── package.json
```

### Estructura React + Vite

```
frontend/
├── src/
│   ├── components/
│   │   ├── Dashboard/
│   │   ├── AnalysisForm/
│   │   ├── ReportViewer/
│   │   ├── HistoryTable/
│   │   └── Charts/
│   ├── hooks/
│   │   ├── useAnalysis.ts     # API calls
│   │   ├── useRules.ts
│   │   └── useStats.ts
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Analyze.tsx
│   │   └── History.tsx
│   ├── App.tsx
│   └── main.tsx
└── package.json
```

### Base de Datos (PostgreSQL)

```sql
-- Tablas principales

CREATE TABLE opportunities (
  id UUID PRIMARY KEY,
  symbol VARCHAR(10),
  strategy VARCHAR(50),
  analysis JSONB,           -- Resultado del análisis
  decision VARCHAR(20),     -- 'operar', 'esperar', 'no_operar'
  confidence FLOAT,
  risk VARCHAR(10),         -- 'bajo', 'medio', 'alto'
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE trade_results (
  id UUID PRIMARY KEY,
  opportunity_id UUID REFERENCES opportunities(id),
  result VARCHAR(10),       -- 'ganancia', 'pérdida'
  points FLOAT,
  success_reasons TEXT[],
  failure_reasons TEXT[],
  lessons TEXT[],
  recorded_at TIMESTAMP
);

CREATE TABLE rule_stats (
  id UUID PRIMARY KEY,
  rule_id VARCHAR(50),
  total_occurrences INT,
  successful_occurrences INT,
  effectiveness_rate FLOAT,
  last_updated TIMESTAMP
);
```

---

## 📋 CONFIGURACIÓN INICIAL

### 1. Backend NestJS
```bash
# Crear proyecto
nest new tito-metralleta-backend
cd tito-metralleta-backend

# Instalar dependencias
npm install @nestjs/typeorm typeorm pg
npm install @nestjs/config dotenv
npm install class-validator class-transformer

# Generar módulos
nest g module core
nest g module api
```

### 2. Frontend React
```bash
# Crear con Vite
npm create vite@latest tito-metralleta-frontend -- --template react
cd tito-metralleta-frontend

# Instalar dependencias
npm install axios react-query
npm install tailwindcss postcss autoprefixer
npm install recharts   # Gráficos
npm install react-hook-form
```

### 3. PostgreSQL + Render
```bash
# No hay instalación local necesaria
# Render crea BD automáticamente cuando hacemos push
# Solo especificar variables de entorno:
DATABASE_URL=postgresql://...
```

### 4. GitHub + Deployment
```bash
# Conectar a GitHub
git remote set-url origin https://github.com/joasamper-del/TITO-METRALLETA.git
git push origin main

# Vercel: conectar repositorio (pull automático)
# Render: conectar repositorio (pull automático)
```

---

## 🔐 CONSIDERACIONES DE SEGURIDAD

1. **API Authentication**
   - JWT tokens (simple pero efectivo)
   - Rate limiting en endpoints
   - CORS restringido a origen conocido

2. **Base de Datos**
   - Variables de entorno para credentials
   - SSL en conexión (Render lo hace automático)
   - Backups automáticos (Render)
   - NUNCA logs con datos sensibles

3. **Frontend**
   - Token en localStorage/sessionStorage
   - Validación client-side (UX)
   - Validación server-side (seguridad)

---

## 📊 PERFORMANCE ESPERADO

### Backend
- Response time: <200ms (incluye DB)
- Throughput: 100+ requests/segundo
- Concurrencia: 1000+ usuarios simultáneos
- Uptime: 99.9% (Render SLA)

### Frontend
- Load time: <2 segundos (Vercel edge)
- Lighthouse: 90+ score
- Bundle size: <150KB gzipped

### Base de Datos
- Query típica: <50ms (con índices)
- Backups: Automáticos diarios
- Replicación: Disponible (upgrade futuro)

---

## 🎓 VENTAJAS TÉCNICAS DE ESTE STACK

### Para Crecer
✅ NestJS escala naturalmente (modular por defecto)  
✅ PostgreSQL soporta terabytes (futuro backtesting)  
✅ React permite componentes complejos  
✅ Vercel + Render son enterprise-ready  

### Para Mantener
✅ TypeScript en todo (bugs menos probables)  
✅ PostgreSQL es estándar (fácil encontrar ayuda)  
✅ Comunidades grandes (Stack Overflow)  
✅ Documentación oficial excelente  

### Para Expandir
✅ Agregar nuevos endpoints en NestJS es trivial  
✅ Agregar nuevas tablas en PostgreSQL es seguro  
✅ Agregar nuevos componentes en React es modular  
✅ Cambiar deployment es cuestión de deploy key  

---

## ⏱️ TIMELINE ESTIMADO

| Tarea | Tiempo | Dependencias |
|-------|--------|--------------|
| Setup NestJS + PostgreSQL | 2 días | - |
| Integrar motores core en NestJS | 3 días | Setup |
| Endpoints API básicos | 3 días | Motores integrados |
| Autenticación + Rate limiting | 2 días | Endpoints |
| Setup React + Vercel | 1 día | - |
| Dashboard básico | 3 días | API funcional |
| Análisis form | 2 días | Dashboard |
| Histórico table | 2 días | API resultados |
| Testing e2e | 2 días | Todo funcional |
| **TOTAL MVP** | **~20 días** | - |

---

## 🚨 RIESGOS MITIGADOS

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| Víctor no conoce NestJS | Media | Bajo | Documentar, ejemplos claros |
| Cambio de requisitos | Media | Medio | Stack flexible, modular |
| Performance insuficiente | Baja | Medio | Render + Vercel son rápidos |
| Pérdida de datos | Muy Baja | Alto | Backups automáticos PostgreSQL |
| API brute force | Baja | Medio | Rate limiting + JWT |

---

## ✅ PRÓXIMOS PASOS

1. **Crear rama `develop`** (desarrollo)
2. **Setup inicial de Backend** (NestJS + PostgreSQL)
3. **Setup inicial de Frontend** (React + Vercel)
4. **Integrar motores core** en NestJS
5. **Crear endpoints API** básicos
6. **Conectar base de datos**
7. **Crear dashboard simple**
8. **Testing end-to-end**
9. **Deploy en Vercel + Render**

---

## 📚 REFERENCIAS Y RECURSOS

### Documentación
- NestJS: https://docs.nestjs.com/
- PostgreSQL: https://www.postgresql.org/docs/
- React: https://react.dev/
- Vercel: https://vercel.com/docs
- Render: https://render.com/docs

### Herramientas Recomendadas
- **Postman** o **Insomnia**: Testing API
- **pgAdmin** o **DBeaver**: Administración BD
- **Redux DevTools**: Debugging React (si usamos Redux)
- **Lighthouse**: Auditoría de performance

### Librerías Específicas
```json
{
  "backend": {
    "@nestjs/core": "10.x",
    "typeorm": "0.3.x",
    "pg": "8.x",
    "class-validator": "0.14.x"
  },
  "frontend": {
    "react": "18.x",
    "axios": "1.x",
    "react-query": "3.x",
    "recharts": "2.x",
    "tailwindcss": "3.x"
  }
}
```

---

**Stack decidido**: NestJS + PostgreSQL + React + Vercel + Render  
**Preparado para**: Crecer de MVP a producción sin redesign  
**Riesgo técnico**: Bajo (stack maduro y popular)  
**Mantenibilidad**: Alta (comunidades grandes, documentación)

---

*Decisión tomada por*: joasamper80@gmail.com  
*Fecha*: 2026-08-23  
*Repositorio*: https://github.com/joasamper-del/TITO-METRALLETA.git
