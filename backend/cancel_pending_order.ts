import * as fs from "fs";
import * as path from "path";

const envFilePath = path.join(__dirname, ".env.local");
const envContent = fs.readFileSync(envFilePath, "utf8");
const envVars: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  if (line && !line.startsWith("#")) {
    const [key, ...valueParts] = line.split("=");
    envVars[key.trim()] = valueParts.join("=").trim();
  }
});

const API_KEY = envVars.ALPACA_API_KEY;
const SECRET_KEY = envVars.ALPACA_SECRET_KEY;

function getAuthHeader(): string {
  const credentials = `${API_KEY}:${SECRET_KEY}`;
  return "Basic " + Buffer.from(credentials).toString("base64");
}

(async () => {
  const orderId = "d42d6517-284d-41f1-b3a5-1e7bc9f0bd13";
  
  console.log("🔴 CANCELANDO ORDEN PENDIENTE\n");
  
  const res = await fetch(
    `https://paper-api.alpaca.markets/v2/orders/${orderId}`,
    {
      method: "DELETE",
      headers: { Authorization: getAuthHeader() },
    }
  );
  
  console.log(`Status: ${res.status}`);
  
  if (res.status === 204) {
    console.log(`✅ Orden cancelada exitosamente`);
  } else {
    const text = await res.text();
    console.log(`Response: ${text}`);
  }
  
  console.log(`\n✅ Cuenta limpia - esperando mercado abierto (09:30 ET)`);
})();
