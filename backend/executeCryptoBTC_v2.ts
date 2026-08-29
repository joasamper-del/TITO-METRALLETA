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

async function executeCryptoBTC() {
  console.log("\n🟡 CRYPTO MODE — EJECUTANDO BTC\n");

  const btcPrice = 77662;
  const stopLoss = (btcPrice * 0.97).toFixed(2);
  const takeProfit = (btcPrice * 1.05).toFixed(2);
  const quantity = "0.012876"; // ~$1000

  const orderPayload = {
    symbol: "BTC/USD",
    qty: parseFloat(quantity),
    side: "buy",
    type: "limit",
    limit_price: btcPrice.toString(),
    time_in_force: "gtc", // good-til-cancelled (crypto compatible)
  };

  console.log("📋 ORDEN PREPARADA:");
  console.log(`   Symbol: ${orderPayload.symbol}`);
  console.log(`   Qty: ${orderPayload.qty} BTC`);
  console.log(`   Side: ${orderPayload.side}`);
  console.log(`   Type: ${orderPayload.type}`);
  console.log(`   Limit Price: $${orderPayload.limit_price}`);
  console.log(`   Stop Loss: $${stopLoss} (-3%)`);
  console.log(`   Take Profit: $${takeProfit} (+5%)`);

  console.log(`\n🔐 Verificando PAPER endpoint...`);

  try {
    const response = await fetch(
      `https://paper-api.alpaca.markets/v2/orders`,
      {
        method: "POST",
        headers: {
          Authorization: getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderPayload),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`${response.status}: ${errText}`);
    }

    const order = (await response.json()) as any;

    console.log(`\n✅ ORDEN EJECUTADA`);
    console.log(`   Order ID: ${order.id}`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Symbol: ${order.symbol}`);
    console.log(`   Qty: ${order.qty} BTC`);
    console.log(`   Limit Price: $${order.limit_price}`);
    console.log(`   Endpoint: paper-api.alpaca.markets (PAPER confirmed)`);

    // Log to file
    const logDir = path.join(__dirname, "phase_d_logs");
    const logFile = path.join(logDir, `crypto_${new Date().toISOString().split("T")[0]}.jsonl`);

    const logEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "CRYPTO_ORDER_EXECUTED",
      symbol: "BTC/USD",
      orderId: order.id,
      qty: order.qty,
      limitPrice: order.limit_price,
      stopLoss,
      takeProfit,
      status: order.status,
    }) + "\n";

    fs.appendFileSync(logFile, logEntry);

    console.log(`\n📂 Registrado en: crypto_${new Date().toISOString().split("T")[0]}.jsonl`);
    console.log(`\n✅ AUTONOMÍA: OFF (esperando siguiente autorización)`);

  } catch (error: any) {
    console.error(`\n❌ ERROR: ${error.message}`);
    process.exit(1);
  }
}

executeCryptoBTC();
