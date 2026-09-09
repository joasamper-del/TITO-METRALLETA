# 📚 REFERENCIAS - Repositorios Importantes

**Propósito:** Centralizar todos los links clave y no depender de memoria  
**Última actualización:** 2026-08-30

---

## 👤 INFUSION VICTOR (Autor Original)

**GitHub:** https://github.com/infusionvictor

**Repos principales:**

### 1. **agente-tito-metralleta** (Principal)
- **URL:** https://github.com/infusionvictor/agente-tito-metralleta.git
- **Descripción:** Sistema multi-agente de análisis de flujo de opciones (options flow). Identifica actividad inusual en opciones y genera 3 escenarios (bear/base/bull).
- **Stack:** Next.js 15, React 19, TypeScript, vitest (333 tests)
- **Para qué sirve:** Análisis de flujo + UI visual + predicción de movimientos
- **Código reutilizable:**
  - ✅ Black-Scholes pricing (`web/lib/blackScholes.ts`)
  - ✅ Expected Move / Cono 1σ 2σ (`web/lib/expectedMove.ts`)
  - ✅ Levels / Soportes y resistencias (`web/lib/levels.ts`)
  - ✅ GEX / Gamma mapping (`web/lib/gex.ts`)
  - ✅ Earnings calendar (`web/lib/earnings.ts`)
  - ✅ News feeds + sentimiento (`web/lib/news.ts`)

### 2. **Warren-Buffet-Jr** (si existe)
- **URL:** https://github.com/infusionvictor/Warren-Buffet-Jr (NO ENCONTRADO)
- **Nota:** Repo no existe públicamente. Probablemente privado o archivado.

**Seguir a Victor:** https://github.com/infusionvictor

---

## 🏠 NUESTRO REPOSITORIO (joasamper-del)

**GitHub:** https://github.com/joasamper-del/TITO-METRALLETA.git  
**Branch principal:** main  
**Usuario:** joasamper-del

**Estructura:**
```
TITO-METRALLETA/
├── backend/
│   ├── strategyLibrary/       ← NUESTRO: 10 estrategias + OperationManager
│   ├── lib/
│   │   ├── pricing/           ← Copiado de Victor: Black-Scholes
│   │   ├── technical/         ← Copiado de Victor: Levels
│   │   └── ...
├── web/                        ← Frontend React
├── docs/
├── REFERENCIAS.md             ← Este archivo
└── ...
```

---

## 🔗 INTEGRACIONES PLANEADAS

### Fase 1: CODIFICACIÓN (Sesiones 41-44)
- Código base 100% nuestro
- NO dependencias de Victor todavía

### Fase 2: INTEGRACIÓN SELECTIVA (Sesión 45)

| Componente | Fuente Victor | Qué copiamos | Archivo |
|---|---|---|---|
| **Black-Scholes** | `blackScholes.ts` | bsPrice, bsDelta, bsGamma | backend/lib/pricing/ |
| **Expected Move** | `expectedMove.ts` | normCdf, expectedMove | backend/lib/technical/ |
| **Earnings** | `earnings.ts` | earningsFlag | backend/lib/calendar/ |
| **Levels** | `levels.ts` | findPivots, computeLevels | backend/lib/technical/ |
| **IV Context** | `ivcontext.ts` | ivRankPoints | backend/lib/volatility/ |
| **GEX (simplificado)** | `gex.ts` | Lógica core (sin UI) | backend/lib/greek/ |

**Proceso:**
1. Clonar archivo de Victor
2. Adaptar tipos (si necesario)
3. Cambiar imports
4. Ejecutar tests de Victor
5. Integrar en nuestra estrategia

---

## 📋 DOCUMENTOS DE REFERENCIA (Victor)

### Guías y PDFs en repo agente-tito-metralleta
- **CLAUDE.md** — Especificación del agente (7 tareas)
- **GUIA-ESTUDIANTES.md** — Guía educativa
- **README.md** — Cómo correr Victor
- **Guia GEX y Prediccion.pdf** — Explicación técnica de GEX + Prediction Pro
- **Bono - Gex information and walls.pdf** — Detalles de Greek Exposure

### Nuestros documentos de referencia
- `AUDITORIA_VICTOR_VS_NUESTRO.md` — Análisis comparativo alto nivel
- `MAPEO_FUNCIONES_VICTOR.md` — Lista exacta de qué copiar
- `backend/strategyLibrary/ARCHITECTURE.md` — Diseño Strategy Library
- `backend/strategyLibrary/ARCHITECTURE_DIAGRAM.md` — Flujo visual
- `TITO_4_REGLAS.md` — Filosofía de 4 reglas de oro

---

## 🛠️ HERRAMIENTAS EXTERNAS USADAS

| Herramienta | Proveedor | Para qué |
|---|---|---|
| **Massive (antes Polygon.io)** | https://massive.com | Datos de mercado (option chain, barras, noticias) |
| **MarketSnack** | — | Time & Sales con bid/ask + griegos |
| **FRED** | https://fred.stlouisfed.org | VIX y datos macroeconómicos |
| **TradingView** | https://www.tradingview.com | Lightweight Charts (velas) |
| **Alpaca** | https://alpaca.markets | Paper trading / Ejecución |
| **Robinhood** | https://robinhood.com | Opciones (tiene MCP) |

---

## 📊 COMPARATIVA RÁPIDA

### Lo que Victor hace bien
- ✅ Análisis de flujo de opciones (6 sub-agentes)
- ✅ UI visual (heatmaps, charts)
- ✅ Matemáticas puras (Black-Scholes, griegos)
- ✅ Tests robustos (333 tests)
- ✅ Noticias + sentimiento

### Lo que nosotros hacemos bien
- ✅ Operación automática (10 estrategias)
- ✅ Gestión de posiciones (trailing, reentradas)
- ✅ Filosofía de límites (4 reglas de oro)
- ✅ Learning system (cada trade registrado)
- ✅ Arquitectura DRY (code reuse)

### Combinados
- ✅ Victor analiza → Nosotros operamos
- ✅ Victor calcula → Nosotros ejecutamos
- ✅ Totalmente complementarios

---

## 🔐 NOTAS DE SEGURIDAD

- ✅ Victor es público → Seguro clonar y copiar
- ✅ Licencia: Revisar repo de Victor (probablemente MIT o similar)
- ✅ Atribución: Si copiamos código, comentar "Based on Victor's X.ts"
- ✅ No incluir API keys en nuestro repo (usar .env)

---

## 🚀 PRÓXIMOS PASOS

### Hoy (Sesión 40)
- ✅ Clonar repo de Victor
- ✅ Identificar funciones reutilizables
- ✅ Crear este documento

### Sesión 41-44
- Codificar Strategy Library (standalone)
- NO depender de Victor todavía

### Sesión 45
- Copiar funciones de Victor
- Integrar Black-Scholes, Expected Move, Levels
- Testear convergencia

### Sesión 46+
- Backtesting
- Performance analysis
- UI dashboard

---

## 📞 CONTACTO / SEGUIMIENTO

**Perfil GitHub de Victor:** https://github.com/infusionvictor

**Recomendación:** Seguir a Victor en GitHub para estar al tanto de updates.

---

**Este documento NO reemplaza memory, es COMPLEMENTARIO.**  
- Memory: Datos vivos, contexto, decisiones del proyecto
- Referencias.md: Links estáticos, referencias persistentes

**Última verificación de links:** 2026-08-30  
**Próxima verificación recomendada:** 2026-09-30
