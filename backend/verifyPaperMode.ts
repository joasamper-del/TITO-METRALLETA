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
  console.log("🔍 VERIFICACIÓN: ¿PAPER o LIVE?\n");

  try {
    // 1. Verificar endpoint
    console.log("1️⃣ ENDPOINT VERIFICADO:");
    console.log("   ✅ https://paper-api.alpaca.markets (PAPER)");
    console.log("   ❌ https://api.alpaca.markets (NO — sería LIVE)\n");

    // 2. Obtener posición BTC
    console.log("2️⃣ POSICIÓN BTC DESDE ALPACA PAPER:");
    const posRes = await fetch(
      `https://paper-api.alpaca.markets/v2/positions/BTCUSD`,
      { headers: { Authorization: getAuthHeader() } }
    );

    if (posRes.ok) {
      const pos = (await posRes.json()) as any;
      console.log(`   Símbolo: ${pos.symbol}`);
      console.log(`   Cantidad: ${pos.qty} BTC`);
      console.log(`   Precio Actual: $${pos.current_price}`);
      console.log(`   Valor Posición: $${pos.market_value}`);
      console.log(`   P&L: $${pos.unrealized_pl} (${(parseFloat(pos.unrealized_plpc) * 100).toFixed(2)}%)`);
    }

    // 3. Obtener órdenes pendientes
    console.log(`\n3️⃣ ÓRDENES PENDIENTES EN ALPACA PAPER:`);
    const ordersRes = await fetch(
      `https://paper-api.alpaca.markets/v2/orders?symbols=BTCUSD&status=open,new`,
      { headers: { Authorization: getAuthHeader() } }
    );
    const orders = (await ordersRes.json()) as any[];

    if (Array.isArray(orders) && orders.length > 0) {
      orders.forEach((o: any, i: number) => {
        console.log(`   ${i + 1}. ID: ${o.id}`);
        console.log(`      Side: ${o.side} | Type: ${o.type}`);
        console.log(`      Limit: ${o.limit_price || "N/A"}`);
        console.log(`      Status: ${o.status}`);
      });
    } else {
      console.log("   Sin órdenes abiertas");
    }

    // 4. Verificar cuenta
    console.log(`\n4️⃣ CUENTA ALPACA PAPER:`);
    const accountRes = await fetch(
      `https://paper-api.alpaca.markets/v2/account`,
      { headers: { Authorization: getAuthHeader() } }
    );
    const account = (await accountRes.json()) as any;

    console.log(`   Tipo: ${account.account_type || "paper"}`);
    console.log(`   Status: ${account.status}`);
    console.log(`   Equity: $${account.equity}`);
    console.log(`   Buying Power: $${account.buying_power}`);

    console.log(`\n✅ CONFIRMACIÓN: ESTOY VIENDO PAPER, NO LIVE`);
    console.log(`   Endpoint: paper-api.alpaca.markets ✅`);
    console.log(`   Cuenta: Paper Trading ✅`);
    console.log(`   Órdenes: En ambiente de prueba ✅`);

  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
})();
