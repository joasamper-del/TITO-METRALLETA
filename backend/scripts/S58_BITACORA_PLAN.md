# S58: Bitácora Inteligente - Plan de Implementación

**Status:** 🟡 PLAN PARA APROBACIÓN (Sin cambios en código aún)  
**Objetivo:** Vista READ-ONLY de Decision Audit Trail integrada en la UI de Tito  
**Autorización pendiente:** Sí

---

## 1. PROPÓSITO

Crear una vista dentro de Tito que permita **consultar el historial completo de decisiones** (ENTRAR/ESPERAR/NO_ENTRAR/SALIR/ERROR) con **trazabilidad 100%** desde entrada hasta resultado + lecciones.

**¿Por qué es importante?**
- Tito ya decide y ejecuta con audit trail completamente grabado (S57 ✅)
- Necesita una "ventana" en su interfaz para QUE LOS USUARIOS VEN LO QUE TITO VEDE y por qué
- Transparencia operativa: desde que nace una decisión hasta que se resuelve
- Autodiagnóstico: "¿qué aprendimos? ¿qué mejoramos?"

---

## 2. REQUISITOS FUNCIONALES

### Entrada
- **Filtro por fecha:** rango (fecha inicio, fecha fin)
- **Filtro por ticker:** SPY, QQQ, BTC, ETH (multi-select opcional)

### Salida Principal
Para cada decisión grabada, mostrar (READ-ONLY):

| Campo | Ejemplo | Fuente |
|-------|---------|--------|
| **Timestamp** | 2026-09-05 14:23:45 | decision_audit_trail.timestamp |
| **Tipo de decisión** | ENTRAR / ESPERAR / NO_ENTRAR / SALIR / ERROR | decision |
| **Ticker** | SPY | symbol |
| **Razones** | "VIX < 20 + RSI > 50 + MLI=78" | mliBreakdown + riskGatesApplied + marketData |
| **Confidence** | 72% | confidence |
| **MLI Total** | 78 | mliScore |
| **MLI Breakdown** | SPY=+18, QQQ=+16, Vol=+15, ... | mliBreakdown{} |
| **Risk Gates** | "Pass: Daily Loss OK, Correlation OK" | riskGatesApplied[] |
| **Ejecución** | "Order #ORD_123 PLACED @ 450.23 qty=10" | executionId + position{} |
| **Salida/P&L** | "TP_HIT +$90 (+2.0%)" | outcome + profitLoss + profitLossPercent |
| **Lecciones** | "Volatility component: CORRECT. MLI: INCORRECT" | lessons{} |

### Resumen Diario
Mostrar conteos agrupados por tipo y resultados:

```
2026-09-05 RESUMEN
─────────────────
✅ ENTRAR: 3 (2 profitable, 1 loss)
⏸️  ESPERAR: 5 (no ejecutadas)
❌ NO_ENTRAR: 2 (riesgo alto)
🚪 SALIR: 3 (promedio P&L: +$45)
⚠️  ERROR: 0
```

### Sección "Aprendizajes"
Agregar insights acumulativos POR TIPO DE DECISIÓN:

```
QUÉ APRENDIMOS / QUÉ PODEMOS MEJORAR
════════════════════════════════════════

📊 Decisiones ENTRAR (3 ciclos):
  ✓ Aciertos: MLI score > 75 = 100% accuracy
  ✗ Errores: Vol component when IV > 30 = subestima riesgo
  💡 Recomendación: Aumentar peso Vol en contexto high-IV

📊 Decisiones NO_ENTRAR (2 ciclos):
  ✓ Aciertos: Bloqueadas por Daily Loss gate = 0 pérdidas
  ✗ Errores: Ninguno (gate funcionó)
  💡 Recomendación: Mantener daily loss limit en 2%

[Si falta información: "DATA_UNAVAILABLE — no hay suficientes ciclos"]
[Si no hay lecciones: "Aún no hay suficientes datos para análisis"]
```

---

## 3. RESTRICCIONES (READ-ONLY)

**PROHIBIDO EXPLÍCITO:**
- ❌ Cambiar reglas de MLI
- ❌ Modificar pesos de componentes
- ❌ Alterar Stop Loss
- ❌ Bloquear / desbloquear órdenes
- ❌ Enviar comandos a Trading Engine
- ❌ Editar histórico

**Comportamiento:**
- Solo lectura (queries, sin mutations)
- Botones deshabilitados visualmente
- Campos sombreados (no interactivos)
- Disclaimer: "🔒 Vista de auditoría — solo lectura"

---

## 4. UBICACIÓN EN LA UI

### Opción A: Pestaña nueva en top nav
**Ubicación:** `app/bitacora/` + ruta `/bitacora`  
**Icono sugerido:** 📖 o 📋  
**Posición en nav:** después de `/strategy`, antes de `/tito-core-demo`  

**Ventaja:** No rompe nada, espacio dedicado, fácil de encontrar  
**Desventaja:** Otra pestaña más

### Opción B: Panel colapsable en `/strategy`
**Ubicación:** Dentro de `app/strategy/page.tsx`, abrir/cerrar con botón  
**Icono:** 📖 o 🔍  
**Posición:** Abajo del dashboard actual o tab dentro del panel  

**Ventaja:** Centralizado en la zona de decisiones  
**Desventaja:** Puede haber mucho contenido, puede ralentizar la carga

### Opción C: Drawer lateral (hamburguesa)
**Ubicación:** Deslizable desde el lado, modal  
**Icono:** 📖  
**Trigger:** Botón en HeaderBar  

**Ventaja:** No toma espacio permanente  
**Desventaja:** Interfaz secundaria, menos visible

### 🎯 RECOMENDACIÓN
**Opción A: Pestaña nueva `/bitacora`** (menos intrusiva, más clara)

---

## 5. ARQUITECTURA TÉCNICA

### Backend (Node/NestJS)

**Nuevo endpoint:**
```
GET /api/audit-trail/decisions
  ?startDate=2026-09-01
  &endDate=2026-09-05
  &ticker[]=SPY&ticker[]=QQQ
  &type[]=ENTRAR&type[]=SALIR

Response:
{
  decisions: [
    {
      id: "d_12345",
      timestamp: "2026-09-05T14:23:45Z",
      symbol: "SPY",
      type: "ENTRAR",
      confidence: 72,
      mliScore: 78,
      mliBreakdown: { spyTrend: 18, qqqTrend: 16, ... },
      riskGatesApplied: ["DAILY_LOSS_OK", "CORRELATION_OK"],
      marketData: { price: 450.23, vix: 18.5, volume: 25M },
      executionId: "ORD_123",
      position: { qty: 10, entryPrice: 450.23, stopLoss: 445, takeProfit: 459 },
      outcome: "PROFITABLE",
      profitLoss: 90,
      profitLossPercent: 2.0,
      lessons: { correctComponents: ["MLI", "Vol"], incorrectComponents: [], recommendation: "..." }
    },
    ...
  ],
  summary: {
    date: "2026-09-05",
    counts: { ENTRAR: 3, ESPERAR: 5, NO_ENTRAR: 2, SALIR: 3, ERROR: 0 },
    results: { profitable: 2, loss: 1, pending: 5 }
  }
}
```

**Query a BD:**
```sql
SELECT * FROM decision_audit_trail
WHERE timestamp BETWEEN @start AND @end
  AND symbol IN (@tickers)
  AND decision IN (@types)
ORDER BY timestamp DESC
```

**Validación:**
- Si no hay datos: return `{ decisions: [], message: "No decisions found" }`
- Si data incomplete: include `{ dataAvailability: { component: "MISSING" } }`

---

### Frontend (Next.js React)

**Estructura de archivos:**

```
web/app/bitacora/
  ├── page.tsx                    # Main page (filters + layout)
  ├── [ticker]/
  │   └── page.tsx                # Detail view (opción futura)
  └── components/
      ├── AuditTrailFilters.tsx   # Fecha, ticker, tipo de decisión
      ├── DecisionList.tsx        # Grid de decisiones
      ├── DecisionCard.tsx        # Una tarjeta por decisión
      ├── DailySummary.tsx        # Resumen por día
      └── LessonsPanel.tsx        # "Qué aprendimos"
```

**Componente principal:**
```tsx
// app/bitacora/page.tsx
export default function BitacoraPage() {
  const [filters, setFilters] = useState({
    startDate: today - 30 days,
    endDate: today,
    tickers: ["SPY"],
    types: ["ENTRAR", "ESPERAR", "NO_ENTRAR", "SALIR", "ERROR"]
  });

  const { decisions, summary, loading } = useAuditTrail(filters);

  return (
    <div>
      <h1>📖 Bitácora Inteligente</h1>
      <AuditTrailFilters value={filters} onChange={setFilters} />
      
      {loading && <LoadingSpinner />}
      
      <DailySummary summary={summary} />
      
      <DecisionList decisions={decisions} />
      
      <LessonsPanel decisions={decisions} />
    </div>
  );
}
```

**Hook:**
```tsx
// lib/useAuditTrail.ts
export function useAuditTrail(filters) {
  const [data, setData] = useState({ decisions: [], summary: {} });
  
  useEffect(() => {
    const params = new URLSearchParams(filters);
    fetch(`/api/audit-trail/decisions?${params}`)
      .then(r => r.json())
      .then(setData)
      .catch(err => console.error('[Bitácora] Query failed:', err));
  }, [filters]);

  return { ...data, loading: !data.decisions };
}
```

---

## 6. DATOS & PERSISTENCIA

**Fuente:** `decision_audit_trail` table (PostgreSQL, ya creada en S57)

**Caché:** Opcional — si muchas queries,
```
data/bitacora-cache/{ticker}.json
```
(se invalida cada 5 min)

**Historial:** Ya grabado desde S57. No hay que hacer backfill.

---

## 7. FLOW DE IMPLEMENTACIÓN

1. **Backend (día 1):**
   - ✅ Crear endpoint `GET /api/audit-trail/decisions`
   - ✅ Tests: filtros por fecha, ticker, tipo
   - ✅ Manejo de datos missing
   - ✅ Summary calculations

2. **Frontend (día 2-3):**
   - ✅ Nueva ruta `/bitacora`
   - ✅ Componentes: Filters, DecisionList, DecisionCard, DailySummary, LessonsPanel
   - ✅ Hook `useAuditTrail`
   - ✅ Estilos (consistent con Tito theme)
   - ✅ Responsive

3. **Validación:**
   - ✅ E2E: Filtrar por fecha → ver decisiones de ese rango
   - ✅ E2E: Marcar tipo → ver solo ese tipo
   - ✅ E2E: Sin datos → mensaje "No decisions found"
   - ✅ READ-ONLY: Verificar que no hay botones de edición

4. **Documentación:**
   - ✅ Spec en `web/SPEC.md`
   - ✅ User guide

---

## 8. EJEMPLO VISUAL (Mock)

```
╔════════════════════════════════════════════════════════════════╗
║  📖 Bitácora Inteligente — Decisiones de Tito                  ║
╠════════════════════════════════════════════════════════════════╣

  Filtros
  ├─ Fecha: 📅 01-09-2026 a 📅 05-09-2026
  ├─ Ticker: [SPY] [QQQ] [BTC] [✕]
  └─ Tipo: [ENTRAR] [ESPERAR] [NO_ENTRAR] [SALIR] [ERROR] [All]

────────────────────────────────────────────────────────────────

  2026-09-05 — RESUMEN
  ✅ ENTRAR: 3 (2 profitable, 1 loss)
  ⏸️  ESPERAR: 5
  ❌ NO_ENTRAR: 2
  🚪 SALIR: 3 (avg P&L: +$45)
  ⚠️  ERROR: 0

────────────────────────────────────────────────────────────────

  📍 2026-09-05 14:23:45 | SPY | ✅ ENTRAR | Conf: 72%
  ├─ MLI: 78 (SPY +18, QQQ +16, Vol +15, Leadership +14, Flow +10, Liq +5)
  ├─ Risk Gates: ✓ Daily Loss OK, ✓ Correlation OK, ✓ Liquidity OK
  ├─ Market: $450.23 | VIX 18.5 | Vol 25M
  ├─ Exec: Order #ORD_123 placed @ $450.23, qty=10
  ├─ Outcome: TP_HIT → +$90 (+2.0%)
  └─ Lessons: ✓ MLI accurate, ✓ Vol correct, ✗ Timing could improve

  📍 2026-09-05 11:15:30 | QQQ | ⏸️ ESPERAR | Conf: 65%
  ├─ MLI: 62 (QQQ +16, SPY +12, ...)
  ├─ Risk Gates: ✓ Daily Loss OK, ⚠ VIX > 25 (block on >30)
  ├─ Market: $350.00 | VIX 22.3 | Vol 18M
  ├─ Outcome: PENDING (not executed, waiting for better confirmation)
  └─ Lessons: DATA_UNAVAILABLE (trade not closed yet)

  [Más decisiones...]

────────────────────────────────────────────────────────────────

  📚 QUÉ APRENDIMOS / QUÉ PODEMOS MEJORAR
  
  ✅ ENTRAR (3 ciclos):
     ✓ Aciertos: MLI > 75 = 100% accuracy
     ✗ Errores: Vol component when IV > 30 = subestima
     💡 Acción: Aumentar peso Vol +5% en contexto high-IV
  
  ⏸️ ESPERAR (5 ciclos):
     ✓ Aciertos: Conservative approach → 0 false entries
     💡 Acción: Considerar umbral confirmation más bajo (60%?)
  
  ❌ NO_ENTRAR (2 ciclos):
     ✓ Aciertos: Todas las filtraciones evitaron pérdidas
     💡 Acción: Daily Loss gate = "perfecto, no tocar"

╚════════════════════════════════════════════════════════════════╝
```

---

## 9. CONSIDERACIONES ESPECIALES

### ¿Qué pasa si falta información?
- **No timestamp:** "DATA_UNAVAILABLE"
- **No outcome:** "PENDING (trade not closed)" o "NO_EXECUTION"
- **No lessons:** "Análisis no disponible aún" (trade muy reciente)
- **Nunca inventar:** Siempre mostrar el estado real

### ¿Qué hace la vista cuando Tito no ha operado?
- Mostrar: "No hay decisiones en este rango"
- Ofrecimiento: "¿Cambiar filtros?" (links a periodos pasados)

### Seguridad
- **Solo lectura:** confirmado en componente (props `readOnly`, sin onChange)
- **Auth:** heredada de sesión Tito (verificar session en `/api/audit-trail/decisions`)
- **Rate limit:** max 1000 requests/min por usuario

---

## 10. PRÓXIMAS FASES (Futuro)

- **Fase 2 (S59):** Detalle por decisión `/bitacora/[id]` (drilldown completo)
- **Fase 3 (S60):** Export a CSV/PDF del período
- **Fase 4 (S61):** Gráfico de accuracy trend (% profitable por semana)
- **Fase 5 (S62):** Comparación múltiple (SPY vs QQQ vs BTC en paralelo)

---

## ✅ CHECKLIST ANTES DE EMPEZAR

- [ ] Aprobación de usuario: ubicación (`/bitacora` vs otros)
- [ ] Aprobación de usuario: contenido (¿agregar más campos?)
- [ ] Aprobación de usuario: estructura visual (¿es clara?)
- [ ] Confirmar: DB decision_audit_trail está íntegra (S57)
- [ ] Confirmar: No cambia lógica de trading, solo observa

---

**Status:** 🟡 ESPERANDO AUTORIZACIÓN  

¿Procede? ¿Cambios al plan antes de implementar?
