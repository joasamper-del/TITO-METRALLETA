# Plan: 5 Cambios Exactos de Credentials

**Scope:** Limpiar 5 errores operativos sin modificar lógica de Tito  
**Duración Estimada:** 15 minutos  
**Riesgo:** 🟡 BAJO (cambios aislados en configuración/tipos)  
**Bloqueante:** 🔴 SÍ (required para Fase 3)

---

## CAMBIO 1 & 2: Type Guards Faltantes

### Cambio #1 — `alpaca.check.ts:97`

**Ubicación:** `backend/src/config/credentials/health/checks/alpaca.check.ts`

**Problema:** 
```typescript
// ❌ ANTES (línea 97)
if (!account.account_number) {
    //  ↑ 'account' es 'unknown' — error TS2339
}
```

**Solución (tipo guard):**
```typescript
// ✅ DESPUÉS — Agregar type guard
if (!isAccountResponse(account) || !account.account_number) {
    // Type guard `isAccountResponse` valida estructura
}

// Helper function (si no existe)
function isAccountResponse(data: unknown): data is { account_number: string } {
    return typeof data === 'object' && data !== null && 'account_number' in data;
}
```

**Cambio:** ~5 líneas máximo (1 línea modificada + helper)  
**Impacto:** CERO en lógica, solo type safety

---

### Cambio #2 — `schwab.check.ts:64`

**Ubicación:** `backend/src/config/credentials/health/checks/schwab.check.ts`

**Problema:**
```typescript
// ❌ ANTES (línea 64)
if (!data.access_token) {
    //  ↑ 'data' es 'unknown' — error TS2339
}
```

**Solución (type guard):**
```typescript
// ✅ DESPUÉS — Agregar type guard
if (!isSchwabTokenResponse(data) || !data.access_token) {
    // Type guard `isSchwabTokenResponse` valida estructura
}

// Helper function
function isSchwabTokenResponse(data: unknown): data is { access_token: string } {
    return typeof data === 'object' && data !== null && 'access_token' in data;
}
```

**Cambio:** ~5 líneas máximo (1 línea modificada + helper)  
**Impacto:** CERO en lógica, solo type safety

---

## CAMBIO 3, 4, 5: Interface `BrokerCredential` Incompleta

### Cambio #3,#4,#5 — `validation.ts` + Interface

**Ubicación:** 
- Interface: `backend/src/config/credentials/types/broker-credential.type.ts` (o donde esté declarada)
- Uso: `backend/src/config/credentials/utils/validation.ts:74,74,77`

**Problema:**
```typescript
// ❌ ANTES (validation.ts líneas 74, 77)
if (credential.expiresAt && willExpireSoon(credential.expiresAt)) {
    // ↑ 'expiresAt' no existe en type 'BrokerCredential'
}

message: `Credential expires soon (${credential.expiresAt.toISOString()})`
// ↑ idem
```

**Causa:** Interface `BrokerCredential` no declara `expiresAt`

**Solución:**

1. Encontrar la interface `BrokerCredential`:
```typescript
// ❌ ANTES
export interface BrokerCredential {
    brokerName: string;
    credentialType: CredentialType;
    // ... otras propiedades, pero NO expiresAt
}
```

2. Agregar propiedad:
```typescript
// ✅ DESPUÉS
export interface BrokerCredential {
    brokerName: string;
    credentialType: CredentialType;
    expiresAt?: Date;  // ← AGREGAR ESTO
    // ... otras propiedades
}
```

**Cambio:** 1 línea agregada a la interface  
**Impacto:** CERO en lógica operacional — solo completa la definición existente

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

- [ ] Encontrar archivo con interface `BrokerCredential`
- [ ] Agregar `expiresAt?: Date` a la interface
- [ ] Encontrar `alpaca.check.ts:97`
- [ ] Agregar type guard para validar `account_number`
- [ ] Encontrar `schwab.check.ts:64`
- [ ] Agregar type guard para validar `access_token`
- [ ] Ejecutar build: `npm run build` en `backend/`
- [ ] Verificar: `npm run build` sale limpio sin estos 5 errores
- [ ] Verificar: `npm test` todo PASS (sin cambios en lógica)

---

## ⚠️ RESTRICCIONES ESTRICTAS

🚫 **PROHIBIDO:**
- Usar `any` para silenciar errores
- Cambiar lógica de validación de credenciales
- Modificar .env o archivos de secretos
- Alterar estrategias de trading
- Cambiar órdenes, stops, targets

✅ **PERMITIDO:**
- Agregar type guards (narrowing)
- Completar interfaces incompletas
- Renombrar variables por claridad
- Agregar comentarios

---

## 🎯 VEREDICTO ESPERADO (Claude debe dar)

**PASS** si:
- ✅ Cambios limpian los 5 errores
- ✅ Build limpio después
- ✅ Cero alteraciones lógica Tito
- ✅ Tipos correctos, sin `any`

**RISK** si:
- ⚠️ Hay duda sobre estructura exacta de credential
- ⚠️ ExpiresAt podría tener implicaciones no claras

**FAIL** si:
- ❌ Cambios tocan lógica de decisión
- ❌ Se modifica .env o secretos
- ❌ Se usan `any` para silenciar
