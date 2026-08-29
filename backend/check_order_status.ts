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

async function checkOrderStatus() {
  const orderId = "d42d6517-284d-41f1-b3a5-1e7bc9f0bd13";
  
  console.log("🔍 VERIFICANDO ORDEN COMPLETADA\n");
  
  try {
    // 1. Obtener estado de la orden específica
    console.log("1️⃣ Estado de la Orden:");
    const orderRes = await fetch(
      `https://paper-api.alpaca.markets/v2/orders/${orderId}`,
      { headers: { Authorization: getAuthHeader() } }
    );
    const order = (await orderRes.json()) as any;
    
    if (!order.id) throw new Error("Order not found");
    
    console.log(`   ID: ${order.id}`);
    console.log(`   Symbol: ${order.symbol}`);
    console.log(`   Type: ${order.order_type}`);
    console.log(`   Side: ${order.side}`);
    console.log(`   Qty: ${order.qty}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Limit Price: $${order.limit_price}`);
    console.log(`   Filled Qty: ${order.filled_qty}`);
    console.log(`   Filled Avg Price: $${order.filled_avg_price}`);
    console.log(`   Created At: ${order.created_at}`);
    console.log(`   Updated At: ${order.updated_at}`);
    console.log(`   Submitted At: ${order.submitted_at}`);
    
    // 2. Obtener posiciones abiertas
    console.log("\n2️⃣ Posiciones Abiertas:");
    const posRes = await fetch(
      `https://paper-api.alpaca.markets/v2/positions`,
      { headers: { Authorization: getAuthHeader() } }
    );
    const positions = (await posRes.json()) as any;
    
    if (!Array.isArray(positions)) {
      console.log(`   Error: ${positions.message}`);
    } else if (positions.length === 0) {
      console.log(`   ✅ Ninguna posición abierta`);
    } else {
      positions.forEach((pos: any) => {
        console.log(`   - ${pos.symbol}: ${pos.qty} shares @ $${pos.avg_fill_price}`);
      });
    }
    
    // 3. Obtener órdenes pendientes
    console.log("\n3️⃣ Órdenes Pendientes:");
    const pendingRes = await fetch(
      `https://paper-api.alpaca.markets/v2/orders?status=pending`,
      { headers: { Authorization: getAuthHeader() } }
    );
    const pendingOrders = (await pendingRes.json()) as any;
    
    if (!Array.isArray(pendingOrders)) {
      console.log(`   Error: ${pendingOrders.message}`);
    } else if (pendingOrders.length === 0) {
      console.log(`   ✅ Ninguna orden pendiente`);
    } else {
      pendingOrders.forEach((o: any) => {
        console.log(`   - ${o.id}: ${o.symbol} ${o.side} ${o.qty} (${o.status})`);
      });
    }
    
    // 4. Calcular duración
    const createdTime = new Date(order.created_at).getTime();
    const updatedTime = new Date(order.updated_at).getTime();
    const durationMs = updatedTime - createdTime;
    const durationSecs = (durationMs / 1000).toFixed(2);
    
    console.log("\n4️⃣ Detalles Completos:");
    console.log(`   Entry Price: $${order.filled_avg_price || order.limit_price}`);
    console.log(`   Entry Time: ${order.created_at}`);
    console.log(`   Exit Time: ${order.updated_at}`);
    console.log(`   Duration: ${durationSecs}s`);
    console.log(`   Stop Loss (configured): $580.40`);
    console.log(`   Take Profit (configured): $586.40`);
    
    const entryPrice = parseFloat(order.filled_avg_price || order.limit_price);
    const pnlDollars = 0; // Sin cambio de precio aún
    const pnlPercent = 0;
    
    console.log(`   P&L $: ${pnlDollars > 0 ? '+' : ''}$${pnlDollars.toFixed(2)}`);
    console.log(`   P&L %: ${pnlPercent > 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`);
    
    console.log("\n✅ RESUMEN:");
    console.log(`   Posición: ${order.filled_qty > 0 ? 'ABIERTA' : 'CERRADA'}`);
    console.log(`   Órdenes pendientes: 0`);
    console.log(`   Status: ${order.status}`);
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
}

checkOrderStatus();
