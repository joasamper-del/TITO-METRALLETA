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
  console.log("🔒 VERIFICACIÓN DE PROTECCIÓN BTC\n");
  
  try {
    // 1. Get BTC position
    console.log("1️⃣ Posición BTC Actual:");
    const posRes = await fetch(
      `https://paper-api.alpaca.markets/v2/positions/BTCUSD`,
      { headers: { Authorization: getAuthHeader() } }
    );
    
    if (!posRes.ok) {
      console.log("   ⚠️  No se encontró posición BTC (puede estar cerrada)");
    } else {
      const pos = (await posRes.json()) as any;
      console.log(`   Cantidad: ${pos.qty} BTC`);
      console.log(`   Precio Entrada: $${pos.avg_fill_price}`);
      console.log(`   Precio Actual: $${pos.current_price}`);
      console.log(`   Valor Posición: $${pos.market_value}`);
      console.log(`   P&L: $${pos.unrealized_pl} (${(parseFloat(pos.unrealized_plpc) * 100).toFixed(2)}%)`);
    }
    
    // 2. Get all orders for BTCUSD
    console.log("\n2️⃣ Órdenes Asociadas a BTCUSD:");
    const ordersRes = await fetch(
      `https://paper-api.alpaca.markets/v2/orders?symbols=BTCUSD&status=all&limit=100`,
      { headers: { Authorization: getAuthHeader() } }
    );
    const orders = (await ordersRes.json()) as any[];
    
    if (!Array.isArray(orders) || orders.length === 0) {
      console.log("   ⚠️  Sin órdenes para BTCUSD");
    } else {
      const entry = orders.find((o: any) => o.status === "filled" && o.side === "buy");
      const stopOrders = orders.filter((o: any) => 
        (o.order_class === "oco" || o.type === "stop") && o.status !== "canceled"
      );
      
      if (entry) {
        console.log(`   ✅ Entrada (FILLED):`);
        console.log(`      ID: ${entry.id}`);
        console.log(`      Qty: ${entry.filled_qty}`);
        console.log(`      Fill Price: $${entry.filled_avg_price}`);
      }
      
      if (stopOrders.length > 0) {
        console.log(`   ✅ Stop/Take Profit Órdenes:`);
        stopOrders.forEach((o: any) => {
          console.log(`      - ${o.id}`);
          console.log(`        Tipo: ${o.order_class || o.type}`);
          console.log(`        Status: ${o.status}`);
          console.log(`        Stop Price: ${o.stop_price || 'N/A'}`);
          console.log(`        Limit Price: ${o.limit_price || 'N/A'}`);
        });
      } else {
        console.log(`   ❌ SIN Stop Loss u Órdenes de Take Profit Activas`);
        console.log(`      → Solo calculados en dashboard, NO en Alpaca`);
      }
    }
    
    // 3. Summary
    console.log("\n3️⃣ RESULTADO:");
    const stopOrders = orders.filter((o: any) => 
      (o.order_class === "oco" || o.type === "stop") && o.status !== "canceled"
    );
    
    if (stopOrders.length === 0) {
      console.log("   ⚠️  PROTECCIÓN INCOMPLETA");
      console.log("   → Stop Loss y Take Profit deben ser creados en Alpaca");
      console.log("   → El dashboard solo muestra valores calculados");
      console.log("   → La posición NO está realmente protegida si Alpaca cae");
    } else {
      console.log("   ✅ PROTECCIÓN ACTIVA");
      console.log("   → Stop Loss y Take Profit están en Alpaca");
      console.log("   → Posición está protegida automáticamente");
    }
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
})();
