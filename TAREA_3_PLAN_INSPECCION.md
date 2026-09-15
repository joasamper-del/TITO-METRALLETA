# TAREA 3: DecisionAuditService OBLIGATORIO — Plan de Inspección

**Fecha:** 2026-09-13 11:30 ET  
**Estado:** 🔴 **HOLD** — Aguardando autorización  
**Rama:** `cp3-3-clean` (compilable ✅)  
**Arquitectura Actual:** CP3.3 GATES 4-5 implementados  

---

## I. VERIFICACIÓN DE ESTADO ACTUAL

### A. Worktree
- ✅ **Build:** Limpio (`npm run build` → 0 errores TypeScript)
- ✅ **Rama:** `cp3-3-clean` en commit `9363cb8` (SEATBELT gates 4-5)
- ✅ **DecisionAuditService:** Implementado en `backend/src/modules/api/services/decision-audit.service.ts`
- ✅ **Gate3DecisionAuditService:** Implementado en `backend/src/modules/seatbelt/services/gate3-decision-audit.service.ts`

### B. Decisión Arquitectónica (OPCIÓN B — RESUELTA)
```
DecisionAuditService DEBE ser OBLIGATORIO para garantizar:
  decisión → ejecución → resultado (cadena trazable)

Regla fundamental: @Optional() no debe permitir estados sin trazabilidad.
```

---

## II. MAPEO EXACTO DE CAMBIOS (OPCIÓN B)

### ARCHIVO 1: `backend/src/modules/seatbelt/services/seatbelt.service.ts`

**Ubicación actual (líneas 1-24):**
```typescript
@Injectable()
export class SeatbeltService {
  constructor(
    private gate1: Gate1MarketHealthService,
    private gate2: Gate2RiskBoundaryService,
    private gate3: Gate3DecisionAuditService,
    @Optional() private gate4?: Gate4ExecutionEngineService,
    @Optional() private gate5?: Gate5BrokerConnectivityService,
  ) {}
```

**Cambios requeridos:**
1. **Línea 1:** Importar `DecisionAuditService`
   ```typescript
   import { DecisionAuditService } from '../../api/services/decision-audit.service';
   ```

2. **Línea 18-24:** Inyectar DecisionAuditService como OBLIGATORIO
   ```typescript
   constructor(
     private gate1: Gate1MarketHealthService,
     private gate2: Gate2RiskBoundaryService,
     private gate3: Gate3DecisionAuditService,
     private decisionAudit: DecisionAuditService,  // ← NUEVO, OBLIGATORIO
     @Optional() private gate4?: Gate4ExecutionEngineService,
     @Optional() private gate5?: Gate5BrokerConnectivityService,
   ) {}
   ```

3. **Métodos `validateCheckpoint1()` y `validateFull()`:** Registrar decisión antes de validar
   - **Línea ~30 (en `validateCheckpoint1()`):** Antes de `gate1.validate()`
     ```typescript
     // Registrar decisión en audit trail
     const decisionRecord = await this.decisionAudit.recordDecision({
       symbol: order.symbol,
       decision: 'SEATBELT_INITIATED',
       timestamp: new Date(),
       marketData: { currentPrice: currentMarket.price },
       filtersApplied: { gates: ['gate1', 'gate2', 'gate3'] },
       notes: `Seatbelt validation for trade ${tradeId}`,
     });
     
     if (!decisionRecord) {
       return {
         allGatesPass: false,
         gates: [],
         reason: 'Failed to record decision in audit trail',
         timestamp: new Date(),
       };
     }
     ```

   - **Línea ~140 (en `validateFull()`):** Similar, pero con `gates: ['gate1', 'gate2', 'gate3', 'gate4', 'gate5']`

**Total líneas afectadas:** ~6-8 líneas de cambio, ~12-15 líneas de nueva lógica

---

### ARCHIVO 2: `backend/src/modules/seatbelt/seatbelt.module.ts`

**Ubicación actual (aproximada):**
```typescript
@Module({
  imports: [DatabaseModule, ...],
  providers: [SeatbeltService, Gate1..., Gate2..., Gate3..., Gate4..., Gate5...],
  exports: [SeatbeltService],
})
export class SeatbeltModule {}
```

**Cambios requeridos:**
1. **Línea ~2-5:** Importar `ApiModule` o `DecisionAuditService` directamente
   ```typescript
   import { DecisionAuditService } from '../api/services/decision-audit.service';
   // O
   import { ApiModule } from '../api/api.module';
   ```

2. **Línea ~3:** Si es necesario, añadir `ApiModule` a `imports`
   ```typescript
   @Module({
     imports: [DatabaseModule, ApiModule, ...],
     providers: [...],
     exports: [SeatbeltService],
   })
   ```

**Total líneas afectadas:** ~2-3 líneas (una importación, posible módulo)

---

## III. DEPENDENCIAS E INYECCIONES AFECTADAS

| Servicio | Cambio | Razón | Riesgo |
|----------|--------|-------|--------|
| `SeatbeltService` | Inyecta `DecisionAuditService` obligatorio | Garantiza trazabilidad | Bajo (servicios independientes) |
| `SeatbeltModule` | Importa `ApiModule` o `DecisionAuditService` | Proporciona la dependencia | Bajo (módulo ya existe) |
| `Gate4ExecutionEngineService` | Sin cambio | Sigue siendo @Optional | Ninguno |
| `Gate5BrokerConnectivityService` | Sin cambio | Sigue siendo @Optional | Ninguno |

**Circular Dependency Risk:** ✅ BAJO
- `SeatbeltModule` → `ApiModule` (directa, sin vuelta)
- `ApiModule` usa `DatabaseModule`
- `SeatbeltModule` usa `DatabaseModule`
- No hay ciclo

---

## IV. TESTS REQUERIDOS

### Test 1: Servicio Obligatorio (NO @Optional)
```
✅ TITLE: "DecisionAuditService es inyectado como OBLIGATORIO"
✅ WHEN: SeatbeltService se instancia SIN DecisionAuditService
✅ EXPECT: NestJS lanza error de inyección (Cannot inject undefined)
```

### Test 2: Registro de Decisión Antes de Gates
```
✅ TITLE: "validateCheckpoint1() registra decisión antes de validar gates"
✅ WHEN: Se llama validateCheckpoint1() con datos válidos
✅ EXPECT: 
   - decisionAudit.recordDecision() fue llamado 1× ANTES de gate1.validate()
   - Resultado incluye decisionId/auditRecord
   - Si recordDecision() falla → SeatbeltResult.allGatesPass = false
```

### Test 3: Fallo Bloqueado (Sin Silent-Fail)
```
✅ TITLE: "Si recordDecision() falla, SEATBELT se bloquea"
✅ WHEN: decisionAudit.recordDecision() retorna null/undefined
✅ EXPECT: 
   - validateCheckpoint1() NO continúa hacia gates
   - Retorna SeatbeltResult { allGatesPass: false, reason: "Failed to record..." }
   - NO hay ejecución silenciosa sin auditoría
```

### Test 4: Regresión T1 (Gates 1-3 Funcionales)
```
✅ TITLE: "Gates 1-3 siguen funcionando igual con DecisionAuditService presente"
✅ WHEN: Se ejecuta validateCheckpoint1() con mercado sano, riesgo OK, auditoría OK
✅ EXPECT: 
   - gate1.validate() pasa
   - gate2.validate() pasa
   - gate3.validate() pasa
   - SeatbeltResult.allGatesPass = true
   - Resultado idéntico a antes (salvo auditoría registrada)
```

### Test 5: Regresión T2 (Gates 4-5 Siguen @Optional)
```
✅ TITLE: "Gates 4-5 siguen siendo @Optional sin afectar T1/T2"
✅ WHEN: validateFull() se ejecuta con gate4/gate5 = undefined
✅ EXPECT: 
   - SeatbeltService se instancia SIN error
   - validateFull() retorna resultado válido (gates 1-3 se validan)
   - Gates 4-5 omitidos gracefully (no "undefined" en gates[])
```

### Test 6: Integridad de Auditoría
```
✅ TITLE: "DecisionAuditTrail registra todos los datos correctamente"
✅ WHEN: validateCheckpoint1() se ejecuta completamente
✅ EXPECT: 
   - BD contiene 1 registro con symbol, decision, timestamp, marketData
   - Datos coinciden exactamente con entrada
   - Timestamp diferencia < 1s respecto al actual
```

**Total tests:** 6 (4 unitarios + 2 integración)  
**Tiempo estimado:** 45-60 minutos (escritura + ejecución)

---

## V. VERIFICACIONES DE SEGURIDAD

### Silent-Fail Checklist
- ❌ **Prohibido:** Catch error sin acción → silencio
- ❌ **Prohibido:** if (!decisionRecord) pero seguir adelante
- ✅ **Obligatorio:** if (!decisionRecord) → return error inmediatamente
- ✅ **Obligatorio:** Todos los errores fluyen hacia SeatbeltResult.allGatesPass = false

### Regresión Checklist
- ✅ Validar que `npm test` sigue en 0 fallos nuevos
- ✅ Validar que Gates 1-3 tests siguen PASANDO (no regresión)
- ✅ Validar que Gates 4-5 siguen siendo @Optional

---

## VI. CRITERIO DE ACEPTACIÓN (GO/NO-GO)

✅ **GO CUANDO:**
1. Todos los 6 tests PASAN (100% verde)
2. `npm run build` compila limpio (0 errores TS)
3. Ningún test previo se rompió (T1/T2 regresión = 0)
4. `npm run lint` pasa sin warnings nuevos
5. DecisionAuditService es OBLIGATORIO (error de inyección sin él)
6. Sin silent-fail (todo error → SeatbeltResult.allGatesPass = false)

🔴 **NO-GO CUANDO:**
1. Cualquier test nuevo falla
2. Regresión T1/T2 (tests previos fallan)
3. Silent-fail detectado
4. Circular dependency
5. Build no compila

---

## VII. ROLLBACK PLAN

Si algo sale mal:
```bash
git checkout cp3-3-clean -- backend/src/modules/seatbelt/
git checkout cp3-3-clean -- backend/src/modules/seatbelt/services/seatbelt.service.ts
npm run test  # Verificar que T1/T2 vuelven a verde
```

---

## VIII. HANDOFF REQUERIDO

**ANTES de implementar:**
1. ✅ Revisar este plan (arquitectura, archivos, tests)
2. ✅ Confirmar que DecisionAuditService actual es compatible
3. ✅ Autorizar Tarea 3 (GO/NO-GO)

**NO HACER:**
- ❌ NO commit todavía
- ❌ NO modificar código
- ❌ NO Tarea 4 hasta que Tarea 3 sea VERDE

---

## IX. MATRIZ DE CAMBIOS RESUMIDA

| Archivo | Línea | Cambio | Tests |
|---------|-------|--------|-------|
| `seatbelt.service.ts` | 1 | Import DecisionAuditService | T1, T2, T3 |
| `seatbelt.service.ts` | 18-24 | Inyectar OBLIGATORIO | T1 |
| `seatbelt.service.ts` | ~30 | Registrar decisión P1 | T2, T3, T4 |
| `seatbelt.service.ts` | ~140 | Registrar decisión Full | T2, T3, T4 |
| `seatbelt.module.ts` | ~3 | Importar DecisionAuditService | T5, T6 |

**Total líneas nuevas:** ~15-20  
**Total líneas modificadas:** ~8-10  
**Total tests:** 6 (nuevos)  
**Estimado:** 2-3 horas (inspección + implementación + verificación)

---

## ✅ ESTADO: LISTO PARA AUTORIZACIÓN

**La inspección está completa.**  
**El plan es PRECISO y VERIFICABLE.**  
**Próximo paso: Autorización de Tarea 3 (SÍ/NO).**

**Si AUTORIZACIÓN = SÍ:** Ejecutar implementación con plan anterior.  
**Si AUTORIZACIÓN = NO:** Revisar objeciones e iterar.

---

**Sesión:** 2026-09-13  
**Preparado por:** Claude Haiku 4.5  
**Para:** Víctor + Jay
