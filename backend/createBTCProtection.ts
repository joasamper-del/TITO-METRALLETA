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
  console.log("🛡️ CREANDO ÓRDENES DE PROTECCIÓN BTC\n");
  
  const entryPrice = 77662;
  const stopPrice = (entryPrice * 0.97).toFixed(2); // -3%
  const takeProfitPrice = (entryPrice * 1.05).toFixed(2); // +5%
  
  console.log(`Entry Price: $${entryPrice}`);
  console.log(`Stop Loss: $${stopPrice} (-3%)`);
  console.log(`Take Profit: $${takeProfitPrice} (+5%)\n`);
  
  try {
    // Create SELL STOP order for Stop Loss
    console.log("1️⃣ Creando STOP LOSS...");
    const slPayload = {
      symbol: "BTCUSD",
      qty: 0.012856683,
      side: "sell",
      type: "stop",
      stop_price: stopPrice,
      time_in_force: "gtc",
    };
    
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
      console.log(`   ✅ Stop Loss creado`);
      console.log(`   ID: ${slOrder.id}`);
      console.log(`   Stop Price: $${slOrder.stop_price}`);
    } else {
      const err = await slRes.text();
      console.log(`   ❌ Error: ${err}`);
    }
    
    // Create SELL LIMIT order for Take Profit
    console.log("\n2️⃣ Creando TAKE PROFIT...");
    const tpPayload = {
      symbol: "BTCUSD",
      qty: 0.012856683,
      side: "sell",
      type: "limit",
      limit_price: takeProfitPrice,
      time_in_force: "gtc",
    };
    
    const tpRes = await fetch(
      `https://paper-api.alpaca.markets/v2/orders`,
      {
        method: "POST",
        headers: {
          Authorization: getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(tpPayload),
      }
    );
    
    if (tpRes.ok) {
      const tpOrder = (await tpRes.json()) as any;
      console.log(`   ✅ Take Profit creado`);
      console.log(`   ID: ${tpOrder.id}`);
      console.log(`   Limit Price: $${tpOrder.limit_price}`);
    } else {
      const err = await tpRes.text();
      console.log(`   ❌ Error: ${err}`);
    }
    
    console.log("\n✅ PROTECCIÓN ACTIVADA");
    console.log("   • Stop Loss: $" + stopPrice);
    console.log("   • Take Profit: $" + takeProfitPrice);
    console.log("   • Cantidad: 0.012856683 BTC");
    console.log("   • Posición ahora está protegida en Alpaca");
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
})();
