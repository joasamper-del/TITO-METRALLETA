# 💻 SETUP LOCAL - TITO METRALLETA

**Guía para configurar el proyecto en tu máquina**

---

## ⚡ Quick Start (5 minutos)

### Prerrequisitos
```bash
# Verificar instalación
node --version      # Debe ser v18+
npm --version       # Debe ser v9+
git --version       # Debe ser v2.40+
```

Si no tienes alguno, instala desde:
- **Node.js**: https://nodejs.org (recomendado: LTS)
- **Git**: https://git-scm.com

### 1. Clonar Repositorio

```bash
cd ~/projects  # O donde prefieras
git clone https://github.com/joasamper-del/TITO-METRALLETA.git
cd TITO-METRALLETA
```

### 2. Setup PostgreSQL

**Opción A: Docker (Recomendado)**
```bash
docker run --name tito-postgres \
  -e POSTGRES_USER=tito \
  -e POSTGRES_PASSWORD=metralleta \
  -e POSTGRES_DB=tito_db \
  -p 5432:5432 \
  -d postgres:15

# Verificar
docker ps | grep tito-postgres
```

**Opción B: PostgreSQL Local**
```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt-get install postgresql
sudo systemctl start postgresql

# Windows
# Descarga desde https://www.postgresql.org/download/windows/
```

### 3. Variables de Entorno

```bash
# En raíz del proyecto, crear:
touch .env.local

# Contenido (.env.local):
DATABASE_URL=postgresql://tito:metralleta@localhost:5432/tito_db
NODE_ENV=development
PORT=3000
JWT_SECRET=dev-secret-key-for-local-testing
ALPHA_VANTAGE_KEY=your_key_here  # Obtener en https://www.alphavantage.co/
FINNHUB_KEY=your_key_here         # Obtener en https://finnhub.io/
```

### 4. Verificar Setup

```bash
# Conectarse a BD
psql -U tito -d tito_db -c "SELECT 1;"

# Debe retornar:
# ?column?
# ----------
#        1
```

**¡Listo!** Ambiente local configurado.

---

## 📁 Estructura Actual

```
TITO-METRALLETA/
├── src/                          # Motor core (v1.0 completado)
│   ├── types/
│   ├── engines/                  # Los 3 motores
│   ├── core/                     # Analyzer
│   └── config/
├── backend/                       # (Por crear en Fase 1)
├── frontend/                      # (Por crear en Fase 2)
├── .env.local                     # Tu archivo de configuración local
├── VISION.md                      # Objetivo y reglas del proyecto
├── ROADMAP.md                     # Hoja de ruta (20 tareas)
├── TECH_STACK.md                  # Stack elegido + desventajas
├── IMPLEMENTATION_PLAN.md         # Plan ejecutable (3 fases)
└── README.md                      # Descripción general
```

---

## 🚀 Desarrollo por Fase

### FASE 1: Backend (Cuando llegues a Fase 1)

```bash
# Crear proyecto NestJS
nest new backend --package-manager npm --git false
cd backend

# Instalar dependencias
npm install @nestjs/typeorm @nestjs/config typeorm pg
npm install class-validator class-transformer bcrypt jsonwebtoken

# Copiar motores core
cp -r ../src ./src/core

# Ejecutar
npm run start:dev

# API estará en http://localhost:3000
```

### FASE 2: Frontend (Cuando llegues a Fase 2)

```bash
# Crear proyecto React
npm create vite@latest frontend -- --template react
cd frontend

# Instalar dependencias
npm install axios react-query tailwindcss recharts

# Ejecutar
npm run dev

# Frontend estará en http://localhost:5173
```

---

## 🐳 Opción: Docker Compose (Completo)

Si esperas a tener backend + frontend completos:

```bash
# En raíz del proyecto (cuando existan backend/ y frontend/)
docker-compose up

# Esto levantará:
# - PostgreSQL en :5432
# - Backend en :3000
# - Frontend en :5173
```

---

## 🔄 Workflow Diario

### Inicio del día
```bash
# Asegurarte de estar en develop
git checkout develop
git pull origin develop

# Crear rama para tu feature
git checkout -b feature/nombre-descriptivo
```

### Desarrollo
```bash
# Cambios en código
git status
git add .
git commit -m "type(scope): descripción"

# Ejemplos:
# feat(api): Agregar endpoint /analyze
# fix(rules): Corregir cálculo de puntuación
# docs(readme): Actualizar instrucciones
```

### Final del día
```bash
# Pushear tu rama
git push origin feature/nombre-descriptivo

# Crear PR en GitHub (o terminar cuando esté lista)
```

---

## 🆘 Problemas Comunes

### PostgreSQL no conecta
```bash
# Verificar que está corriendo
docker ps | grep postgres

# Si no aparece, reiniciar
docker start tito-postgres

# Verificar conexión
psql -U tito -d tito_db -c "SELECT 1;"
```

### Node modules corrupto
```bash
# Limpiar e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Puerto en uso
```bash
# Encontrar proceso usando puerto 3000
lsof -i :3000

# Matar proceso
kill -9 <PID>
```

### Git merge conflicts
```bash
# Si hay conflictos después de pull
git status  # Ver conflictos

# Editar archivos con conflictos
# Resolver conflictos manualmente

git add .
git commit -m "fix: resolver merge conflicts"
git push
```

---

## 📋 Checklist Pre-Fase 1

- [ ] Node v18+ instalado
- [ ] Git configurado
- [ ] PostgreSQL corriendo
- [ ] .env.local configurado
- [ ] Conexión a BD verificada
- [ ] Rama develop creada y activa
- [ ] README.md leído
- [ ] VISION.md leído

¡Cuando todo esté en verde, estás listo para comenzar Fase 1!

---

## 🎓 Comandos Útiles

```bash
# Ver git log
git log --oneline -10

# Ver ramas
git branch -a

# Ver cambios
git diff

# Deshacer cambio sin stage
git checkout -- archivo.ts

# Deshacer staging
git reset HEAD archivo.ts

# Forzar actualización (solo si sabes qué haces)
git reset --hard origin/develop
```

---

## 📞 Contacto y Ayuda

Si tienes problemas:

1. Revisa este documento
2. Busca en Google "NestJS [problema]"
3. Pregunta en Stack Overflow con tag `nestjs` + `react`
4. Abre issue en GitHub

---

*Última actualización*: 2026-08-23  
*Versión*: 1.0
