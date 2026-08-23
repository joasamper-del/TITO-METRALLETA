# Próximos Pasos - Sesión 4 (Continuación)

**Punto actual**: PostgreSQL instalado, esperando configuración manual

---

## 🔐 PASO ACTUAL: Configurar .env.local

**Usuario debe completar manualmente:**

### 1. Editar archivo
```
C:\Users\18327\Downloads\Agente Tito Metralleta\backend\.env.local
```

### 2. Línea 1 - Reemplazar:

**De:**
```
DATABASE_URL=postgresql://user:password@localhost:5432/tito_metralleta
```

**A:**
```
DATABASE_URL=postgresql://postgres:TU_CONTRASEÑA@localhost:5432/tito_metralleta
```

Donde `TU_CONTRASEÑA` es la que creaste en PostgreSQL (sin caracteres especiales que rompan URLs)

### 3. Guardar archivo

### 4. NO subir a GitHub

---

## ✅ Después de configurar .env.local

### Paso 1: Iniciar Backend (5 min)
```bash
cd "C:\Users\18327\Downloads\Agente Tito Metralleta\backend"
npm run start:dev
```

Esperar mensaje:
```
🚀 Tito Metralleta Backend running on http://localhost:3000
```

### Paso 2: Abrir Frontend (2 min)
Abrir en navegador:
```
file:///C:/Users/18327/Downloads/Agente%20Tito%20Metralleta/web/tito.html
```

### Paso 3: Test E2E (5 min)
```
Entrada: AAPL + Momentum
Clic: Analizar
Esperar: 5-10 segundos
Verificar: Badge "✓ Backend Real" (VERDE) ← Objetivo
```

### Paso 4: Test Fallback (5 min)
```
Apagar backend: Ctrl+C en terminal
Volver a frontend
Clic: Analizar nuevamente
Verificar: Badge "📋 Datos Locales" (AMARILLO) ← Fallback activo
```

### Paso 5: Commit Final (5 min)
```bash
cd "C:\Users\18327\Downloads\Agente Tito Metralleta"
git add SESSION_SUMMARY.md NEXT_STEPS.md SESSION_4_RESULTS.md
git commit -m "docs(session-4): PostgreSQL setup completado - Fase 2B lista"
git push origin feature/backend-setup
```

---

## 📊 Checklist Sesión 4

- [ ] PostgreSQL instalado ✓
- [ ] Base de datos creada ✓
- [ ] .env.local configurado ⏳
- [ ] Backend en http://localhost:3000 ⏳
- [ ] Badge "✓ Backend Real" visible ⏳
- [ ] Fallback funciona (apagar backend) ⏳
- [ ] Commit realizado ⏳

---

## 🎯 Objetivo Final

Cuando veas **"✓ Backend Real"** en verde en el frontend:
- ✅ Frontend conectado a backend REAL
- ✅ Datos viniendo de PostgreSQL
- ✅ Fallback mock como respaldo
- ✅ Fase 2B COMPLETA

---

**Estado**: Esperando configuración de .env.local  
**Próxima acción**: Usuario edita .env.local y avisa
