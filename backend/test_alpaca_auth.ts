/**
 * Test de autenticación Alpaca — Debugging error 401
 * Verifica: endpoint, formato de autenticación, respuesta
 */

import * as fs from "fs";
import * as path from "path";

// Cargar variables del .env.local
const envFilePath = path.join(__dirname, ".env.local");
const envContent = fs.readFileSync(envFilePath, "utf8");
const envLines = envContent.split("\n");
const envVars: Record<string, string> = {};

envLines.forEach((line) => {
  if (line && !line.startsWith("#")) {
    const [key, ...valueParts] = line.split("=");
    envVars[key.trim()] = valueParts.join("=").trim();
  }
});

const API_KEY = envVars.ALPACA_API_KEY;
const SECRET_KEY = envVars.ALPACA_SECRET_KEY;
const BASE_URL = "https://paper-api.alpaca.markets";

console.log("\n🔍 TEST DE AUTENTICACIÓN ALPACA");
console.log("================================\n");

// Verificar variables
console.log("1️⃣ Verificando variables de entorno:");
console.log(`   API_KEY: ${API_KEY ? "✅ Presente" : "❌ NO PRESENTE"}`);
console.log(`   SECRET_KEY: ${SECRET_KEY ? "✅ Presente" : "❌ NO PRESENTE"}`);
console.log(`   Length API_KEY: ${API_KEY?.length || 0}`);
console.log(`   Length SECRET_KEY: ${SECRET_KEY?.length || 0}`);

// Crear autenticación
console.log("\n2️⃣ Creando header de autenticación:");
const credentials = `${API_KEY}:${SECRET_KEY}`;
const encodedCredentials = Buffer.from(credentials).toString("base64");
const authHeader = `Basic ${encodedCredentials}`;
console.log(`   Header format: "Basic [base64_encoded_credentials]"`);
console.log(`   ✅ Header creado (no mostrado por seguridad)`);

// Test de conexión
console.log("\n3️⃣ Intentando conexión a Alpaca:");
console.log(`   Endpoint: ${BASE_URL}`);
console.log(`   Route: /v2/account`);

(async () => {
  try {
    const response = await fetch(`${BASE_URL}/v2/account`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
    });

    console.log(`\n4️⃣ Respuesta de Alpaca:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Status Text: ${response.statusText}`);

    const responseText = await response.text();
    console.log(`   Body: ${responseText.substring(0, 200)}`);

    if (response.ok) {
      console.log("\n✅ AUTENTICACIÓN EXITOSA");
      const data = JSON.parse(responseText);
      console.log(`   Cuenta: ${data.account_number}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Equity: $${data.equity}`);
    } else if (response.status === 401) {
      console.log("\n❌ ERROR 401 (Unauthorized)");
      console.log("   Posibles causas:");
      console.log("   1. Credenciales incorrectas o expiradas");
      console.log("   2. Formato de autenticación incorrecto");
      console.log("   3. Cuenta no activa en Alpaca");
      console.log("   4. Cambio reciente de credenciales");
    } else if (response.status === 429) {
      console.log("\n⚠️  ERROR 429 (Rate Limited)");
      console.log("   Esperar 1-2 minutos");
    } else {
      console.log(`\n❌ ERROR ${response.status}`);
    }
  } catch (error: any) {
    console.error("\n❌ ERROR DE CONEXIÓN:");
    console.error(`   ${error.message}`);
  }
})();
