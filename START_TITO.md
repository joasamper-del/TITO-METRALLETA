# 🚀 START_TITO - Script de Inicio Automático

**El futuro**: Una acción = Todo listo

---

## 📌 ¿QUÉ HACE?

El script `START_TITO.ps1` automatiza TODO el setup:

```
1️⃣  ✅ Verifica ubicación del proyecto
2️⃣  ✅ Verifica dependencias (Node, npm, PowerShell)
3️⃣  ✅ Instala dependencias (npm install) si es necesario
4️⃣  ✅ Crea .env.local si no existe
5️⃣  ✅ Compila backend (npm run build)
6️⃣  ✅ Inicia backend (npm run start:dev)
7️⃣  ✅ Inicia frontend (npm run dev) - OPCIONAL
8️⃣  ✅ Abre navegador en http://localhost:3000
9️⃣  ✅ Muestra resumen final
```

---

## 🎯 CÓMO USARLO

### Opción 1: Doble Click (MÁS FÁCIL)

```
1. Abre explorer
2. Navega a: C:\Users\18327\Downloads\Agente Tito Metralleta
3. Doble-click en: START_TITO.ps1
4. Selecciona "Run" si pide confirmación
5. ¡LISTO! Todo arranca automáticamente
```

### Opción 2: Terminal PowerShell

```powershell
cd "C:\Users\18327\Downloads\Agente Tito Metralleta"
.\START_TITO.ps1
```

### Opción 3: Terminal Windows (CMD)

```cmd
cd C:\Users\18327\Downloads\Agente Tito Metralleta
powershell -File START_TITO.ps1
```

---

## ⚙️ PARÁMETROS OPCIONALES

### Skip Browser (sin abrir navegador)

```powershell
.\START_TITO.ps1 -SkipBrowser
```

**Útil si**: Ya tienes browser abierto

---

## ✅ CHECKLIST DE EJECUCIÓN

Mientras el script corre, verás:

```
════════════════════════════════════════
🎯 TITO METRALLETA - AUTO START
════════════════════════════════════════

1️⃣  Verificando ubicación...
✅ Backend encontrado
✅ Web encontrado

2️⃣  Verificando dependencias...
✅ Node.js v20.x.x
✅ npm instalado
✅ PowerShell listo

3️⃣  Verificando node_modules (backend)...
✅ node_modules existe

4️⃣  Verificando configuración (.env.local)...
✅ .env.local existe

5️⃣  Compilando backend...
✅ Backend compilado

6️⃣  Iniciando backend (puerto 3000)...
📡 Backend arrancando...
⏳ Esperando servidor (max 30s)...
✅ Backend corriendo en http://localhost:3000

7️⃣  Iniciando frontend...
📦 Instalando dependencias frontend...
⏳ Frontend arrancando (puede tardar)...
📡 Frontend en puerto 3001

8️⃣  Abriendo navegador...
✅ Navegador abierto en http://localhost:3000

════════════════════════════════════════
✅ TITO METRALLETA INICIADO
════════════════════════════════════════

📍 URLs:
  🔵 Backend:  http://localhost:3000
  🔵 Health:   http://localhost:3000/health
  🟢 Frontend: http://localhost:3001

📌 PROCESOS ACTIVOS:
  Backend PID: 12345
  Frontend PID: 12346

💡 PARA DETENER:
  - Presiona Ctrl+C en las ventanas de comando
  - O ejecuta: Stop-Process -Id 12345

📚 DOCUMENTACIÓN:
  - SESSION_SUMMARY.md
  - LOCAL_URLS.md
  - PROXIMOS_PASOS.md

════════════════════════════════════════
🚀 Tito Metralleta Listo
════════════════════════════════════════

Presiona Ctrl+C para detener...
```

---

## 🔴 SI ALGO FALLA

### Error: "File cannot be loaded"

```powershell
# Solución: Ejecutar en la terminal
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Luego:
```powershell
.\START_TITO.ps1
```

### Error: "npm not found"

```
❌ npm no encontrado
```

**Solución**: Instalar Node.js desde https://nodejs.org

### Error: "Backend no respondió"

```
❌ Backend no respondió después de 30s
💡 Verifique los logs en la ventana del backend
```

**Soluciones**:
1. Verificar que PostgreSQL esté corriendo (si usas BD)
2. Ver logs en la ventana de backend
3. Revisar .env.local
4. Ejecutar manualmente: `npm run start:dev`

### Error: "Node modules no puede instalarse"

```powershell
# Opción 1: Limpiar e reinstalar
cd backend
rm -r node_modules
rm package-lock.json
npm install --legacy-peer-deps
```

---

## 📋 QUÉS HAY EN .env.local

El script crea esto automáticamente (si no existe):

```env
DATABASE_URL=postgresql://user:password@localhost:5432/tito_metralleta
JWT_SECRET=dev-secret-key-change-in-production
ALPHA_VANTAGE_KEY=
FINNHUB_KEY=
NODE_ENV=development
```

**Editar si**: Tienes PostgreSQL en otro puerto/host

---

## 🎯 DESPUÉS DE EJECUTAR

### Backend está corriendo
```
Verificar en: http://localhost:3000/health
```

### Frontend está corriendo
```
Verificar en: http://localhost:3001
```

### Ver logs del backend
```
Revisar la ventana de comando del backend
```

### Detener todo
```
Presiona Ctrl+C en cada ventana de comando
```

---

## 💾 PRÓXIMA VEZ

Simplemente ejecuta:
```powershell
.\START_TITO.ps1
```

✅ No necesitas verificar nada  
✅ No necesitas instalar de nuevo  
✅ Todo se verifica automáticamente

---

## 🔧 PERSONALIZAR

### Cambiar puerto backend

**Archivo**: `backend/src/main.ts`

```typescript
await app.listen(3000);  // ← Cambiar aquí (3001, 3002, etc)
```

### Cambiar puerto frontend

**Archivo**: `web/vite.config.ts` o `web/.env`

```
VITE_PORT=3001  # Cambiar a lo que quieras
```

### Cambiar .env.local

Simplemente edita:
```
backend/.env.local
```

El script NO lo sobrescribirá si ya existe.

---

## 📞 TROUBLESHOOTING RÁPIDO

| Error | Solución |
|-------|----------|
| "File cannot be loaded" | `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` |
| "npm not found" | Instalar Node.js |
| "Backend no respondió" | Ver logs, verificar DB, revisar .env |
| "Port already in use" | Cambiar puerto en main.ts |
| "Module not found" | `npm install --legacy-peer-deps` en backend/ |

---

## ✨ PRÓXIMAS MEJORAS

Futuras versiones del script podrán:
- [ ] Verificar PostgreSQL automáticamente
- [ ] Crear BD automáticamente si no existe
- [ ] Ejecutar migrations automáticas
- [ ] Generar JWT_SECRET aleatorio
- [ ] Health check más robusto
- [ ] Logs en archivo

---

## 📝 NOTAS

```
✅ Script seguro - no elimina nada
✅ Idempotente - puede ejecutarse múltiples veces
✅ Windows optimizado - usa PowerShell
✅ Detección de errores - para si algo falla
✅ Mensajes claros - sabe qué pasó
```

---

## 🎯 RESUMEN

```
UNA ACCIÓN = TODO LISTO

Doble-click en START_TITO.ps1
↓
Verificar dependencias ✅
↓
Instalar si es necesario ✅
↓
Compilar backend ✅
↓
Iniciar backend ✅
↓
Iniciar frontend ✅
↓
Abrir navegador ✅
↓
🚀 LISTO
```

---

**Versión**: 1.0  
**Creado**: 2026-08-23  
**Plataforma**: Windows PowerShell  
**Status**: ✅ Funcional
