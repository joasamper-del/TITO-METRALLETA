# Sesión 10 - Plan de Integración Alpaca Paper Trading

**Fecha**: 2026-08-25  
**Estado**: ⏳ Planificación completada - Esperando aprobación

---

## 📊 Análisis Actual de Datos

### **Origen de Datos Actuales: 100% SIMULADOS**

| Componente | Estado | API Key | Datos |
|-----------|--------|---------|-------|
| **Alpha Vantage** | Configurado | `demo` (limitado) | Precios = 0, Volumen = 0 |
| **Finnhub** | Configurado | `demo` (limitado) | No accede datos reales |
| **Alpaca** | NO INTEGRADO | No existe | --- |
| **Base de Datos** | PostgreSQL local | --- | Análisis simulados (48+) |

### **Flujo Actual**
```
Usuario solicita análisis de AAPL
  ↓
DataEngine intenta Alpha Vantage (demo) → Devuelve precio=0, volumen=0
  ↓
DataEngine intenta Finnhub (demo) → Devuelve precio=0, volumen=0
  ↓
RulesEngine detecta datos incompletos
  ↓
ReportEngine genera "manualReviewNeeded: true"
  ↓
Análisis almacenado en BD con datos simulados
```

---

## 🎯 Fase 2: Integración Alpaca Paper Trading

### **Objetivo**
Reemplazar datos simulados por datos **reales de mercado** de Alpaca en modo **paper trading** (sin dinero real, sin órdenes ejecutadas).

### **Requisitos**
1. ✅ Cuenta Alpaca personal (joasamper80@gmail.com) - Debe crearse
2. ✅ API Key y Secret (papel testing)
3. ✅ Credentials almacenadas de forma segura (NO hardcoded)
4. ✅ Órdenes reales desactivadas (solo lectura de datos)

---

## 📋 Plan de Implementación

### **Fase 2A: Preparación (Esta sesión)**

#### Paso 1: Crear Cuenta Alpaca
```bash
# NO HACER AÚN - ESPERAR APROBACIÓN
# 1. Ir a https://app.alpaca.markets/paper
# 2. Sign up con joasamper80@gmail.com
# 3. Completar KYC (Know Your Customer)
# 4. Obtener API Key y Secret
```

**Decisiones necesarias:**
- ¿Crear cuenta personal o empresa?
- ¿Usar email joasamper80@gmail.com?
- ¿Acepta términos de Alpaca?

#### Paso 2: Estructura de Credenciales
```
.env (gitignored)
├── ALPACA_API_KEY=pk_...
├── ALPACA_API_SECRET=...
├── ALPACA_BASE_URL=https://paper-api.alpaca.markets  (papel, NO vivo)
└── ALPACA_ENABLED=false  (desactivado por default)

backend/.env.example (versionado)
├── ALPACA_API_KEY=your_key_here
├── ALPACA_API_SECRET=your_secret_here
├── ALPACA_BASE_URL=https://paper-api.alpaca.markets
└── ALPACA_ENABLED=false
```

#### Paso 3: Crear Data Adapter para Alpaca
```
backend/src/integrations/
├── alpaca/
│   ├── alpaca.client.ts      (cliente HTTP)
│   ├── alpaca.service.ts     (lógica de negocio)
│   ├── alpaca.types.ts       (interfaces)
│   └── alpaca.mock.ts        (fallback si API no disponible)
```

**Métodos a implementar:**
```typescript
// Lectura de datos (SIN escribir órdenes)
getQuote(symbol: string)              // Precio actual
getBarData(symbol: string, timeframe) // Histórico OHLCV
getAccountInfo()                      // Información cartera
getPositions()                        // Posiciones actuales (paper)
searchSymbol(query: string)           // Búsqueda de activos

// Órdenes DESACTIVADAS por defecto
placeOrder() → ERROR si ALPACA_ENABLED=false
cancelOrder() → ERROR si ALPACA_ENABLED=false
modifyOrder() → ERROR si ALPACA_ENABLED=false
```

### **Fase 2B: Integración Backend (Próxima sesión)**

#### Paso 1: Reemplazar DataEngine
```typescript
// Antes (simulado)
const dataEngine = new DataEngine('demo', 'demo');

// Después (real + fallback)
const dataEngine = new DataEngine(
  alpacaClient,
  fallbackSimulator
);
```

#### Paso 2: Actualizar Analyze Service
```typescript
async analyze(request) {
  // Intenta obtener datos reales de Alpaca
  const marketData = await dataEngine.getMarketData(symbol);
  
  // Si Alpaca falla, usa fallback simulado
  if (!marketData && fallbackEnabled) {
    marketData = fallbackSimulator.generateData(symbol);
  }
  
  // Resto del análisis igual
}
```

#### Paso 3: Auditoría de Datos
```
/audit/data-origin (nuevo endpoint)
{
  "symbol": "AAPL",
  "timestamp": "2026-08-25T12:00:00Z",
  "dataSource": "alpaca_paper",  // alpaca_paper | alpaca_live | simulated | finnhub | alpha_vantage
  "realtime": true,
  "lastUpdate": "2026-08-25T12:00:00Z",
  "components": {
    "price": { "source": "alpaca", "value": 234.56 },
    "volume": { "source": "alpaca", "value": 123456789 },
    "rsi": { "source": "simulated", "value": 65.3 }
  }
}
```

### **Fase 2C: Frontend + Testing (Próxima sesión)**

1. **Mostrar origen de datos** en UI
2. **Indicador de modo**: "Paper Trading" vs "Simulado"
3. **Pruebas**:
   - iPhone HTTP:8080 muestra datos reales Alpaca
   - Análisis coinciden con datos reales
   - Sin ejecución de órdenes

---

## ⚠️ Restricciones de Seguridad

### **Órdenes Ejecutadas: BLOQUEADAS**

```typescript
// SIEMPRE deshabilitado
if (process.env.ALPACA_ENABLED !== 'true') {
  throw new Error('Alpaca API calls bloqueadas - modo seguro');
}
```

**Excepciones permitidas:**
- ❌ NO colocar órdenes
- ❌ NO cancelar órdenes
- ❌ NO modificar órdenes
- ✅ SÍ leer precios
- ✅ SÍ leer posiciones (información)
- ✅ SÍ leer histórico

### **Almacenamiento de Credenciales**

```bash
❌ Hardcoded en código
❌ Committeado en .env
❌ Expuesto en logs
✅ .env local (gitignored)
✅ Variables de entorno
✅ Secretos en Render/Vercel (Phase 3)
```

---

## 📅 Timeline Propuesto

| Fase | Sesión | Tareas |
|------|--------|--------|
| **2A** | 10 | Crear plan (HECHO), Preparar estructura, Esperar aprobación |
| **2B** | 11 | Crear cuenta Alpaca, Integrar cliente, Reemplazar DataEngine |
| **2C** | 12 | Frontend, Auditoría, Testing desde iPhone |
| **2D** | 13+ | Merge a main, PWA capabilities, Phase 3 deployment |

---

## 🔒 Decisiones Pendientes

**ANTES de continuar, usuario debe confirmar:**

1. ✅ **¿Crear cuenta Alpaca con joasamper80@gmail.com?**
2. ✅ **¿Usar paper trading (SÍN dinero real)?**
3. ✅ **¿Permitir lectura de datos reales pero BLOQUEAR órdenes?**
4. ✅ **¿Mantener fallback simulado si Alpaca no disponible?**
5. ✅ **¿Almacenar credenciales en .env local?**

---

## 📊 Estadísticas Proyectadas

| Métrica | Actual | Fase 2 |
|---------|--------|--------|
| **Origen datos** | 100% simulados | 95% Alpaca + 5% fallback |
| **Precisión** | Baja (simulada) | Real (mercado vivo) |
| **Órdenes** | Ninguna | Ninguna (bloqueadas) |
| **Base de datos** | Análisis simulados | Análisis reales |
| **Dinero en riesgo** | $0 | $0 (paper trading) |

---

## ✅ Checklist Sesión 10

- [x] Analizar origen de datos actuales
- [x] Confirmar 100% simulados
- [x] Verificar no hay credenciales activos
- [x] Crear plan de integración
- [x] Documentar restricciones de seguridad
- [ ] **ESPERAR APROBACIÓN DEL USUARIO**
- [ ] Crear cuenta Alpaca (Sesión 11)
- [ ] Implementar cliente Alpaca (Sesión 11)
- [ ] Testing con datos reales (Sesión 12)

---

**Próximo paso**: Confirmar decisiones y crear cuenta Alpaca (Sesión 11)
