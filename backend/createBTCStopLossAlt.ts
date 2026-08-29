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
  console.log("🛡️ CREANDO STOP LOSS ALTERNATIVO (LIMIT)\n");
  
  const stopPrice = "75332.14";
  
  // Usar una orden LIMIT como stop loss en crypto
  const slPayload = {
    symbol: "BTCUSD",
    qty: 0.012856683,
    side: "sell",
    type: "limit",
    limit_price: stopPrice,
    time_in_force: "gtc",
  };
  
  try {
    const slRes = await fetch(
      `https://paper-api.alpaca.markets/v2/orders`,
      {
        method: "POST",
        headers: {
          Authorization: getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(slPayload),
      }
    );
    
    if (slRes.ok) {
      const slOrder = (await slRes.json()) as any;
      console.log(`✅ Stop Loss (LIMIT) creado`);
      console.log(`   ID: ${slOrder.id}`);
      console.log(`   Limit Price: $${slOrder.limit_price}`);
      console.log(`   Tipo: SELL (protección de downside)`);
    } else {
      const err = await slRes.text();
      console.log(`❌ Error: ${err}`);
    }
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
})();
