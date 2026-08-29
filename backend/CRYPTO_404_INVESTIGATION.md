# INVESTIGACIÓN: Errores 404 en Crypto API de Alpaca Paper Trading

## 🔍 Problema Identificado

**Error:** HTTP 404 (Not Found) en todos los endpoints crypto  
**Símbolos Intentados:** BTC/USD, ETH/USD, XRP/USD, LTC/USD, SOL/USD, ADA/USD  
**Endpoint Usado:** `/v1/crypto/latest/quotes?symbols={SYMBOL}`  
**Status de Cuenta:** `crypto_status: ACTIVE` ✅

---

## 📋 Lo Que Estamos Haciendo Ahora

**Código en `phaseD_CryptoPreparation.ts`:**

```typescript
// Línea 94-95
const data = await fetch_alpaca(`/v1/crypto/latest/quotes?symbols=${symbol}`);
if (data?.quotes?.[symbol]) {
  const quote = data.quotes[symbol] as any;
  // ...
}
```

**Símbolo ejemplo:** `BTC/USD`  
**URL completa:** `https://paper-api.alpaca.markets/v1/crypto/latest/quotes?symbols=BTC/USD`  
**Respuesta:** 404 Not Found

---

## ❓ Posibles Causas del 404

### 1. **Formato de símbolo incorrecto**
- ❌ Intentamos: `BTC/USD`, `ETH/USD`, etc.
- ❓ Alpaca podría esperar: `BTCUSD`, `BTC`, `CRYPTO:BTC`, etc.

### 2. **Endpoint incorrecto para Paper Trading**
- ❌ Intentamos: `/v1/crypto/latest/quotes`
- ❓ Alpaca Paper podría no tener endpoint de crypto
- ❓ O el endpoint es diferente: `/v1/crypto/bars`, `/v1/crypto/snapshots`, etc.

### 3. **Crypto no soportado en Paper Trading**
- Aunque `crypto_status: ACTIVE` en la cuenta
- La API REST de Paper Trading podría no exponerlo

### 4. **Header o autenticación incorrecto**
- Aunque la autenticación general funciona (200 OK en `/v2/account`)
- Podría ser específico del endpoint crypto

---

## 🔧 Pasos de Investigación

### PASO 1: Listar todos los endpoints de crypto disponibles

Ejecutar curl directo a Alpaca (sin pasar por nuestro script):

```bash
curl -H "Authorization: Basic [base64_creds]" \
  "https://paper-api.alpaca.markets/v1/crypto/latest/bars?symbols=BTCUSD"
  
curl -H "Authorization: Basic [base64_creds]" \
  "https://paper-api.alpaca.markets/v1/crypto/latest/quotes?symbols=BTCUSD"
  
curl -H "Authorization: Basic [base64_creds]" \
  "https://paper-api.alpaca.markets/v1/crypto/latest/quotes?symbols=BTC"
```

### PASO 2: Verificar documentación oficial de Alpaca

**Preguntas clave:**
- ¿Alpaca Paper Trading soporta crypto en la API REST?
- ¿Cuál es el formato correcto de símbolo? (BTC/USD vs BTCUSD vs BTC vs CRYPTO:BTC)
- ¿Cuál es el endpoint correcto? (/v1/crypto/latest/quotes vs otro)
- ¿Hay limitaciones de Paper Trading que limiten crypto?

**Referencia oficial:** https://docs.alpaca.markets/

### PASO 3: Probar con formato de símbolo alternativo

```typescript
// Intentar diferentes formatos
const formats = [
  "BTC/USD",      // Actual
  "BTCUSD",       // Sin slash
  "BTC",          // Solo símbolo
  "CRYPTO:BTC",   // Con prefijo
  "bitcoin",      // Nombre completo
];

for (const fmt of formats) {
  const result = await fetch_alpaca(`/v1/crypto/latest/quotes?symbols=${fmt}`);
  console.log(`${fmt}: ${result ? "✅ OK" : "❌ 404"}`);
}
```

### PASO 4: Probar con endpoint alternativo

```typescript
// Intentar diferentes endpoints
const endpoints = [
  "/v1/crypto/latest/quotes",
  "/v1/crypto/latest/bars",
  "/v1/crypto/latest/snapshots",
  "/v1/crypto/bars",
  "/v2/crypto/latest/quotes",  // v2 en lugar de v1
];

for (const ep of endpoints) {
  const result = await fetch_alpaca(`${ep}?symbols=BTC`);
  console.log(`${ep}: ${result ? "✅ OK" : "❌ 404"}`);
}
```

---

## 📊 Comparación: Qué está bien vs. Qué está mal

| Aspecto | Estado | Evidencia |
|---------|--------|-----------|
| Endpoint PAPER | ✅ Correcto | https://paper-api.alpaca.markets |
| Autenticación | ✅ Funciona | `/v2/account` devuelve 200 OK |
| Crypto en cuenta | ✅ Habilitado | `crypto_status: ACTIVE` |
| Formato de símbolo | ❓ Desconocido | Intentamos BTC/USD → 404 |
| Endpoint crypto | ❓ Incorrecto | `/v1/crypto/latest/quotes` → 404 |
| Soporte en Paper | ❓ Dudoso | Sin confirmación oficial |

---

## 🎯 Qué Necesitamos Hacer

1. **Verificar documentación oficial de Alpaca**
   - ¿Crypto está soportado en Paper Trading API?
   - ¿Cuál es el endpoint correcto?
   - ¿Cuál es el formato de símbolo correcto?

2. **Actualizar `phaseD_CryptoPreparation.ts`**
   - Cambiar formato de símbolo (si es necesario)
   - Cambiar endpoint (si es necesario)
   - Añadir try-catch para probar múltiples formatos

3. **Si no hay soporte oficial**
   - Documentar que Alpaca Paper Trading no soporta crypto en API REST
   - Mantener focus en SPY/QQQ stocks

---

## ⚠️ Lo Que NO Haremos

- ❌ NO ejecutar órdenes sin investigar primero
- ❌ NO cambiar Tito Core
- ❌ NO adivinar formatos (usar solo formatos documentados)
- ❌ NO activar PHASE_D_APPROVED=true

---

## 📝 Resumen

**Necesitamos investigar:**
1. Documentación oficial de Alpaca para crypto en Paper Trading
2. Formato correcto de símbolos
3. Endpoint correcto
4. Si hay limitaciones de Paper Trading

**Después de investigar:**
- Actualizar script con información correcta
- O confirmar que crypto no está soportado en Paper
- O cambiar a SPY/QQQ como alternativa validada
