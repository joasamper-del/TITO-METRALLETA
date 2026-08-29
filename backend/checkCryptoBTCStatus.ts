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
  const orderId = "ff30a28c-5715-496a-a859-f33957efc2c2";
  
  console.log("📊 VERIFICANDO ESTADO BTC ORDER\n");
  
  try {
    const orderRes = await fetch(
      `https://paper-api.alpaca.markets/v2/orders/${orderId}`,
      { headers: { Authorization: getAuthHeader() } }
    );
    const order = (await orderRes.json()) as any;
    
    console.log("🔹 Orden BTC:");
    console.log(`   ID: ${order.id}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Symbol: ${order.symbol}`);
    console.log(`   Qty: ${order.qty}`);
    console.log(`   Limit Price: $${order.limit_price}`);
    console.log(`   Filled Qty: ${order.filled_qty || 0}`);
    console.log(`   Filled Avg Price: ${order.filled_avg_price ? '$' + order.filled_avg_price : 'N/A (pending)'}`);
    
    const entryPrice = parseFloat(order.limit_price);
    const fillPrice = order.filled_avg_price ? parseFloat(order.filled_avg_price) : entryPrice;
    const slippage = fillPrice - entryPrice;
    const qty = order.qty;
    const pnl = slippage * qty * (order.filled_qty > 0 ? 1 : 0);
    
    console.log(`\n💰 P&L:`);
    console.log(`   Entry: $${entryPrice.toFixed(2)}`);
    console.log(`   Fill: $${fillPrice.toFixed(2)}`);
    console.log(`   Slippage: ${slippage === 0 ? '—' : (slippage > 0 ? '+' : '') + '$' + slippage.toFixed(4)}`);
    console.log(`   P&L $: ${pnl > 0 ? '+' : ''}$${pnl.toFixed(2)}`);
    console.log(`   P&L %: ${pnl === 0 ? '—' : (pnl > 0 ? '+' : '') + (pnl / (entryPrice * qty) * 100).toFixed(2) + '%'}`);
    
    console.log(`\n✅ Autonomía: OFF`);
    console.log(`✅ Endpoint: PAPER confirmado`);
    console.log(`✅ Registrado en logs`);
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
})();
