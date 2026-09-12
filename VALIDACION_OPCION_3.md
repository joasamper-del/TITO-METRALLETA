# Validación — Opción 3 (Research Excluido del Build)

**Estado:** ✅ COMPLETADA (commit: 8953aa6)  
**Fecha:** 12 de Septiembre 2026  
**Cambio:** Línea agregada en `tsconfig.build.json` para excluir `src/modules/research/**`

## Resultado

### Deuda técnica RESUELTA
- **Antes:** 49 errores en research/guardians (S60 WebResearch incomplete)
- **Después:** 0 errores de research en build
- **Impacto en Tito:** CERO (research nunca fue integrado en operación)

### Errores operativos DESCUBIERTOS
Al limpiar el ruido de research, salieron a la luz **5 errores operativos en credentials/**:

```
1. src/config/credentials/health/checks/alpaca.check.ts:97 — TS2339: 'account_number' missing on 'unknown'
2. src/config/credentials/health/checks/schwab.check.ts:64 — TS2339: 'access_token' missing on 'unknown'
3. src/config/credentials/utils/validation.ts:74 — TS2339: 'expiresAt' missing on 'BrokerCredential'
4. src/config/credentials/utils/validation.ts:74 — TS2339: 'expiresAt' missing on 'BrokerCredential' (repeat)
5. src/config/credentials/utils/validation.ts:77 — TS2339: 'expiresAt' missing on 'BrokerCredential' (repeat)
```

## Auditoría de Cambios — Opción 3

### ✅ VERIFICADO
1. **Archivo modificado:** Solo `backend/tsconfig.build.json`
   - Línea agregada: `"exclude": ["src/modules/research/**"]`
   - Cambio: 1 línea, CERO lógica tocada

2. **No usa `any`:** Cambio es puramente configuración

3. **No inventa propiedades:** Cambio es exclusión de carpeta existente

4. **No modifica secretos/keys/tokens/.env:** Cambio es configuración de compilador

5. **No cambia lógica de trading:** Cambio es infra de build

### ⚠️ ESTADO ACTUAL — PREPARACIÓN PARA FASE 3
- Research está **excluido del build** pero FÍSICAMENTE en el repo
- Los 5 errores de credentials están BLOQUEANDO la compilación
- Fase 3 NO puede ejecutarse hasta que credentials esté limpio

### 📋 PRÓXIMO PASO REQUERIDO
Implementar Plan de 5 cambios mínimos en credentials/ para limpiar estos errores operativos.

---

**Veredicto:** ✅ **OPCIÓN 3 VÁLIDA** (cambio de opción anterior, se puede regresar)  
**Bloqueante:** 🔴 Sí — 5 errores operativos de credentials requieren solución antes Fase 3
