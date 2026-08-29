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
  const res = await fetch(
    `https://paper-api.alpaca.markets/v2/orders?symbols=BTCUSD&status=all&limit=20`,
    { headers: { Authorization: getAuthHeader() } }
  );
  const orders = (await res.json()) as any[];
  
  console.log("📋 TODAS LAS ÓRDENES BTCUSD:\n");
  
  orders.forEach((o: any, i: number) => {
    console.log(`${i + 1}. ${o.id}`);
    console.log(`   Side: ${o.side} | Type: ${o.type}`);
    console.log(`   Limit: ${o.limit_price || 'N/A'} | Stop: ${o.stop_price || 'N/A'}`);
    console.log(`   Status: ${o.status} | Qty: ${o.qty}`);
  });
})();
