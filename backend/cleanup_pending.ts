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
  console.log("🧹 LIMPIANDO ÓRDENES PENDIENTES\n");
  
  const pendingRes = await fetch(
    `https://paper-api.alpaca.markets/v2/orders?status=pending`,
    { headers: { Authorization: getAuthHeader() } }
  );
  const pending = (await pendingRes.json()) as any;
  
  if (!Array.isArray(pending) || pending.length === 0) {
    console.log("✅ Sin órdenes pendientes");
    return;
  }
  
  console.log(`📝 Encontradas ${pending.length} órdenes pendientes:\n`);
  
  for (const order of pending) {
    console.log(`  Cancelando: ${order.id} (${order.symbol} ${order.side})`);
    const cancelRes = await fetch(
      `https://paper-api.alpaca.markets/v2/orders/${order.id}`,
      {
        method: "DELETE",
        headers: { Authorization: getAuthHeader() },
      }
    );
    console.log(`  Status: ${cancelRes.status === 204 ? '✅ Cancelada' : '❌ Error'}`);
  }
  
  console.log("\n✅ Cleanup completo");
})();
