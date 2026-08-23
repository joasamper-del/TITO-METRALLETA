# 🌐 URLs Oficiales - Tito Metralleta Local

**Confirmado y Documentado**: 2026-08-23

---

## ✅ URLS OFICIALES (NUNCA CAMBIAR)

### Backend NestJS
```
🔵 PUERTO: 3000
🔗 URL: http://localhost:3000
📡 Protocol: HTTP (desarrollo local)
```

**Verificar que arranca**:
```bash
npm run start:dev
# Esperar mensaje: "🎯 Tito Metralleta - Sistema de Análisis de Trading"
```

**Acceder a**:
- http://localhost:3000 → Servidor corriendo
- http://localhost:3000/health → Health check

---

## 🔌 ENDPOINTS OFICIALES

```
POST   http://localhost:3000/api/analyze   → Analizar oportunidad
GET    http://localhost:3000/api/rules     → Listar reglas
PUT    http://localhost:3000/api/rules/:id → Actualizar regla
POST   http://localhost:3000/api/results   → Registrar resultado
GET    http://localhost:3000/api/stats     → Estadísticas
GET    http://localhost:3000/health        → Health check
```

### Próximos (Sesión 2):
```
GET    http://localhost:3000/api/docs      → Swagger docs (cuando esté implementado)
```

---

## 🗄️ VARIABLES DE ENTORNO OFICIALES

**Archivo**: `backend/.env.local`

```env
# Base de datos
DATABASE_URL=postgresql://user:password@localhost:5432/tito_metralleta

# JWT (Desarrollo)
JWT_SECRET=dev-secret-key-change-in-production

# APIs externas (opcionales)
ALPHA_VANTAGE_KEY=your-key-or-empty
FINNHUB_KEY=your-key-or-empty

# Node
NODE_ENV=development
```

---

## 🧪 COMANDOS OFICIALES

```bash
# Cwd correcto
cd backend

# 1. Instalar dependencias
npm install

# 2. Desarrollar (watch mode)
npm run start:dev        # Puerto 3000

# 3. Tests
npm run test             # Ejecutar
npm run test:cov         # Con coverage
npm run test:watch       # Watch mode

# 4. Build para producción
npm run build            # Genera dist/

# 5. Ejecutar producción
npm run start:prod       # Desde dist/

# 6. Linting
npm run lint             # ESLint
npm run format           # Prettier
```

---

## 📋 CHECKLIST ARRANCADA SESIÓN 2

```bash
# 1. Navegar
cd "C:\Users\18327\Downloads\Agente Tito Metralleta\backend"

# 2. Instalar (si es necesario)
npm install

# 3. Crear .env.local si no existe
# (Copiar valores de .env.example)

# 4. Arrancas servidor
npm run start:dev

# ✅ Esperar:
# [NestFactory] Starting Nest application...
# 🎯 Tito Metralleta - Sistema de Análisis de Trading
# ✓ Listening on port 3000

# 5. Verificar en browser
# http://localhost:3000/health
# Debe retornar: { "status": "ok", ... }
```

---

## 🚨 PUERTOS RESERVADOS

```
3000   ✅ Backend NestJS (OFICIAL)
3001   ❌ NO USAR (reservado para futuro)
3002   ❌ NO USAR (reservado para futuro)
5000   ❌ NO USAR
8000   ❌ NO USAR
```

**Si 3000 está en uso**:
```bash
# Liberar puerto (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# O cambiar puerto en main.ts:
await app.listen(3001);  # NO RECOMENDADO
```

---

## 📱 TESTING ENDPOINTS (Postman/Insomnia)

### Health Check
```
GET http://localhost:3000/health

Response:
{
  "status": "ok",
  "message": "🎯 Tito Metralleta - Sistema de Análisis de Trading",
  "timestamp": "2026-08-23T..."
}
```

### Analyze (requiere JWT después de Sesión 2)
```
POST http://localhost:3000/api/analyze
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
```

---

## 🔐 SEGURIDAD LOCAL

```
⚠️  .env.local NO commitear (en .gitignore)
⚠️  JWT_SECRET cambiar en producción
⚠️  DATABASE_URL solo localhost en desarrollo
✅ HTTP solo en desarrollo (HTTPS en prod)
```

---

## 📞 TROUBLESHOOTING

| Problema | Solución |
|----------|----------|
| Puerto 3000 en uso | `taskkill /PID <PID> /F` |
| npm not found | Reinstalar Node.js |
| DATABASE_URL error | Verificar .env.local |
| Module not found | `npm install` |
| TypeScript errors | `npm run build` para verificar |

---

## ✅ CONFIRMADO OFICIALMENTE

```
✅ Puerto: 3000 (NUNCA cambiar sin documentar)
✅ URL: http://localhost:3000
✅ Health: http://localhost:3000/health
✅ Endpoints: /api/analyze, /api/rules, /api/results, /api/stats
✅ Env: .env.local (NO commitear)
✅ Comandos: Ver "COMANDOS OFICIALES" arriba
```

---

**Documento confirmado**: 2026-08-23  
**Vigencia**: Permanente (hasta cambio de arquitectura)  
**Autor**: Tito Metralleta Backend Team  
**Versión**: 1.0 - OFICIAL
