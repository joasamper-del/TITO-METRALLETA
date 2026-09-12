# Diagnóstico: 5 Errores Operativos de Credentials

**Estado:** 🔴 BLOQUEANTE (build fallando)  
**Ubicación:** `src/config/credentials/`  
**Categoría:** Type Guards Faltantes + Estructura Incompleta

---

## 📋 INVENTARIO EXACTO

### Error #1 & #2: Type Guards Incompletos

**Archivo:** `src/config/credentials/health/checks/alpaca.check.ts:97`  
**Error:** `Property 'account_number' does not exist on type 'unknown'`

```typescript
// Línea 97
if (!account.account_number) {  // ← 'account' es 'unknown', no tiene type guard
```

**Causa Raíz:** Variable `account` es `unknown`, se accede a propiedad sin type narrowing  
**Solución:** Agregar type guard que valide que `account` tiene estructura `{ account_number: ... }`

---

**Archivo:** `src/config/credentials/health/checks/schwab.check.ts:64`  
**Error:** `Property 'access_token' does not exist on type 'unknown'`

```typescript
// Línea 64
if (!data.access_token) {  // ← 'data' es 'unknown', no tiene type guard
```

**Causa Raíz:** Variable `data` es `unknown`, se accede a propiedad sin type narrowing  
**Solución:** Agregar type guard que valide que `data` tiene estructura `{ access_token: ... }`

---

### Error #3, #4, #5: Propiedad Faltante en Interface

**Archivo:** `src/config/credentials/utils/validation.ts:74,74,77`  
**Error:** `Property 'expiresAt' does not exist on type 'BrokerCredential'` (3 líneas)

```typescript
// Línea 74
if (credential.expiresAt && willExpireSoon(credential.expiresAt)) {
//             ^^^^^^^ — No existe en type 'BrokerCredential'

// Línea 77
message: `Credential expires soon (${credential.expiresAt.toISOString()})`
//                                       ^^^^^^^ — No existe en type 'BrokerCredential'
```

**Causa Raíz:** El código usa `credential.expiresAt` pero la interface `BrokerCredential` no lo declara  
**Solución:** Agregar propiedad `expiresAt?: Date` a la interface `BrokerCredential`

---

## 🎯 ANÁLISIS POR ERROR

| Error | Tipo | Líneas Afectadas | Toca Tito | Riesgo | Solución |
|-------|------|-----------------|----------|--------|----------|
| #1 alpaca type guard | Type Safety | alpaca.check.ts:97 | NO (health check) | BAJO | Agregar type guard |
| #2 schwab type guard | Type Safety | schwab.check.ts:64 | NO (health check) | BAJO | Agregar type guard |
| #3,4,5 expiresAt | Interface Incompleta | validation.ts:74,74,77 | SÍ (validación creds) | MEDIO | Agregar propiedad |

---

## 🔍 VERIFICACIÓN DE SEGURIDAD

### ❌ NO hace
- No usa `any` para silenciar errores
- No inventa propiedades
- No modifica secretos/keys/tokens
- No cambia lógica de credenciales
- No altera estrategias de trading

### ✅ SÍ hace
- Type safety: completa las interfaces incompletas
- Validación: asegura que datos tienen estructura esperada
- Operabilidad: permite que credentials valide expiración

---

## 📊 RESUMEN

**Total Errores:** 5 (pero en 3 ubicaciones)  
**Complejidad:** ⭐ BAJA (3 cambios simples)  
**Impacto Operacional:** 🔴 ALTO (bloquea build)  
**Riesgo de Implementación:** 🟡 BAJO (cambios aislados)
