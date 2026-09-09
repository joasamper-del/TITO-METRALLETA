# Frontend Setup - Tito Metralleta

## 📋 Requisitos Previos

- ✅ Backend corriendo en `http://localhost:3001`
- Node.js 14+ instalado
- npm o yarn disponible

---

## 🚀 Instalación y Ejecución

### Paso 1: Navegar a la carpeta frontend
```bash
cd frontend
```

### Paso 2: Instalar dependencias
```bash
npm install
```

### Paso 3: Configurar variables de entorno
Crear archivo `.env` en la carpeta `frontend/`:
```
REACT_APP_API_URL=http://localhost:3001/api
```

O simplemente copiar:
```bash
cp .env.example .env
```

### Paso 4: Iniciar servidor de desarrollo
```bash
npm start
```

El navegador debería abrir automáticamente en `http://localhost:3000`

---

## 📱 Uso de la Aplicación

### Formulario de Análisis (lado izquierdo)
1. **Symbol**: Ingresa el código de la acción (ej: AAPL, GOOGL)
2. **Estrategia**: Describe tu estrategia de trading
3. **Entrada**: Precio al que entras en la posición
4. **Objetivo**: Precio objetivo de ganancia
5. **Stop Loss**: Precio de cierre de pérdida
6. **Notas** (opcional): Comentarios adicionales

### Resultados (lado derecho)
Muestra:
- **Decisión**: COMPRAR / VENDER / ESPERAR
- **Confianza**: % de confianza en el análisis
- **Riesgo**: Nivel de riesgo (BAJO/MEDIO/ALTO)
- **Score**: Puntuación del análisis
- **Revisión Manual**: Si requiere revisión
- **Razones Principales**: Por qué esa decisión
- **Datos de Mercado**: Precio, tendencia, volumen

---

## 🔧 Construcción para Producción

```bash
npm run build
```

Esto crea una carpeta `build/` lista para deployment.

---

## 🐛 Troubleshooting

### Puerto 3000 ya en uso
```bash
npm start -- --port 3001
```

O si usas Windows:
```bash
set PORT=3001 && npm start
```

### Backend no responde
- Verifica que el backend esté corriendo en `http://localhost:3001`
- Revisa `REACT_APP_API_URL` en `.env`
- Abre la consola del navegador (F12) para ver errores

### CORS Error
El backend debe tener CORS configurado para aceptar requests desde `http://localhost:3000`
(NestJS debería manejar esto automáticamente)

---

## 📊 Estructura de Directorios

```
frontend/
├── public/
│   └── index.html           # HTML principal
├── src/
│   ├── index.js             # Entry point
│   ├── App.js               # Componente principal
│   ├── App.css              # Estilos de App
│   ├── components/
│   │   ├── AnalysisForm.js  # Formulario de entrada
│   │   ├── AnalysisForm.css
│   │   ├── ResultsDisplay.js # Mostrar resultados
│   │   └── ResultsDisplay.css
│   └── services/
│       └── api.js           # Cliente HTTP (Axios)
├── .env.example             # Variables de ejemplo
└── package.json
```

---

## ✅ Testing Manual

1. Ingresa datos en el formulario
2. Haz clic en "Analizar"
3. Verifica que:
   - ✅ No hay errores en la consola (F12)
   - ✅ Backend responde correctamente
   - ✅ Resultados se muestran en el lado derecho
   - ✅ Datos guardados en PostgreSQL

---

## 🔄 Flujo Completo

```
Frontend Form
    ↓
POST /api/api/analyze
    ↓
Backend procesa (AnalyzeService)
    ↓
Genera Analysis (con fallback si faltan datos)
    ↓
Guarda en PostgreSQL
    ↓
Retorna ID + datos básicos
    ↓
Frontend muestra resultados
```

---

**Backend Status**: ✅ Corriendo en puerto 3001
**Frontend Status**: 🎉 Listo para iniciar
