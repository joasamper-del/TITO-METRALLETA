# ✅ Checklist de Inicio - Sesión 2

**Usa esto para verificar que todo está listo antes de continuar**

---

## 🔧 Setup (5 min)

- [ ] `cd backend`
- [ ] `npm install` (si no está ya hecho)
- [ ] Crear `.env.local` con:
  ```
  DATABASE_URL=postgresql://user:pass@localhost:5432/tito_metralleta
  JWT_SECRET=dev-secret-change-in-production
  ALPHA_VANTAGE_KEY=optional
  FINNHUB_KEY=optional
  ```
- [ ] Verificar que PostgreSQL está corriendo (opcional para tests)

---

## 📦 Verificar Estado

- [ ] `git status` → debe estar limpio (sin cambios)
- [ ] `git branch` → debe estar en `feature/backend-setup`
- [ ] `git log --oneline -3` → debe ver 2 commits nuevos
- [ ] `git remote -v` → debe apuntar a GitHub (joasamper-del/TITO-METRALLETA)

---

## 🏗️ Compilación

- [ ] `npm run build` → genera `dist/` sin errores críticos
- [ ] `npm run lint` → sin errores de linting
- [ ] `npm run start:dev` → servidor arranca en puerto 3000

---

## 🧪 Tests Base

- [ ] `npm run test` → tests ejecutan (aunque no todos pasen aún)
- [ ] `npm test -- rules.service.spec` → tests de RulesService pasan

---

## 📁 Archivos Claves

Verificar que estos archivos existen:

```
backend/
├── src/
│   ├── modules/
│   │   ├── core/
│   │   │   └── core.module.ts ✅
│   │   ├── database/
│   │   │   ├── entities/
│   │   │   │   ├── opportunity.entity.ts ✅
│   │   │   │   └── trade-result.entity.ts ✅
│   │   │   └── database.module.ts ✅
│   │   ├── api/
│   │   │   ├── services/
│   │   │   │   ├── analyze.service.ts ✅
│   │   │   │   ├── rules.service.ts ✅
│   │   │   │   ├── results.service.ts ✅
│   │   │   │   └── stats.service.ts ✅
│   │   │   ├── controllers/
│   │   │   │   ├── analyze.controller.ts ✅
│   │   │   │   ├── rules.controller.ts ✅
│   │   │   │   ├── results.controller.ts ✅
│   │   │   │   ├── stats.controller.ts ✅
│   │   │   │   └── health.controller.ts ✅
│   │   │   └── dto/
│   │   │       ├── analyze.dto.ts ✅
│   │   │       └── results.dto.ts ✅
│   ├── app.module.ts ✅
│   └── main.ts ✅
├── package.json ✅
├── tsconfig.json ✅
└── tsconfig.build.json ✅

Documentación/
├── PHASE_1_GUIDE.md ✅
├── MVP.md ✅
├── PROXIMOS_PASOS.md ✅
└── CHECKLIST_INICIO.md ✅
```

- [ ] Todos los archivos anteriores existen

---

## 🚀 Prueba Rápida (10 min)

```bash
# 1. Arrancar servidor
npm run start:dev

# 2. En otra terminal, probar endpoints
curl http://localhost:3000/health

# Debe retornar:
# { "status": "ok", "message": "🎯 Tito Metralleta..." }
```

- [ ] Health endpoint responde

---

## 📚 Documentación

Leer ANTES de empezar:

- [ ] PHASE_1_GUIDE.md - Especificaciones completas
- [ ] PROXIMOS_PASOS.md - Plan de sesión 2
- [ ] MVP.md - Qué es el MVP exactamente

---

## 💾 Git Status

```bash
git status
# Esperado: clean working tree, nothing to commit

git log --oneline -3
# Debe ver:
# 83bdbed feat(backend): Fix compilation...
# d6fd025 feat(backend): Implementar Fase 1A-1C...
# c89df08 docs(mvp): Definición de v1.0...
```

- [ ] Git status limpio
- [ ] Commits pusheados a GitHub

---

## 🎯 Lista de Tareas Sesión 2

Una vez verificado todo arriba, estas son las tareas:

### Prioritarias
- [ ] Implementar JWT Strategy
- [ ] Implementar JWT Guard
- [ ] Proteger endpoints
- [ ] Tests para JWT

### Luego
- [ ] Expandir cobertura de tests a >80%
- [ ] Agregar tests de controllers

### Final
- [ ] Documentación Swagger
- [ ] Verificación final de build
- [ ] Merge a main

---

## 🆘 Si Algo No Funciona

**Si `npm install` falla**:
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

**Si `npm run build` falla**:
```bash
npm run build 2>&1 | head -30
# Revisar errores específicos
# Generalmente son import paths o tipos
```

**Si servidor no arranca**:
```bash
npm run start:dev 2>&1 | tail -50
# Ver qué módulo está fallando
# Generalmente DATABASE_URL no configurada
```

---

## 📞 Contacto/Referencias

- **Repo**: https://github.com/joasamper-del/TITO-METRALLETA
- **Rama actual**: `feature/backend-setup`
- **Tech Stack**: NestJS + TypeORM + PostgreSQL + Jest

---

## ✨ Cuando TODO Está Listo

```
✅ Setup completo
✅ Compilación funciona
✅ Tests pasan
✅ Servidor arranca
✅ Git sincronizado
✅ Documentación completa

→ LISTO PARA EMPEZAR SESIÓN 2 🚀
```

---

**Última verificación**: 2026-08-23  
**Tiempo estimado de verificación**: 15-20 minutos  
**Tiempo estimado de Sesión 2**: 3-4 horas
