/**
 * Open Positions API — Lee posiciones en vivo de Alpaca Paper
 * Usado por dashboard para monitoreo en tiempo real
 */

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

interface OpenPosition {
  symbol: string;
  qty: number;
  avgFillPrice: number;
  currentPrice: number;
  positionValue: number;
  pnlDollars: number;
  pnlPercent: number;
  stopLoss: number;
  takeProfit: number;
  entryTime: string;
  status: "OPEN" | "CLOSED";
  assetClass: string;
}

async function getOpenPositions(): Promise<OpenPosition[]> {
  try {
    // Get all positions
    const posRes = await fetch(`https://paper-api.alpaca.markets/v2/positions`, {
      headers: { Authorization: getAuthHeader() },
    });
    const positions = (await posRes.json()) as any[];

    if (!Array.isArray(positions) || positions.length === 0) {
      return [];
    }

    const openPositions: OpenPosition[] = [];

    for (const pos of positions) {
      const symbol = pos.symbol;
      const qty = parseFloat(pos.qty);
      const avgFillPrice = parseFloat(pos.avg_fill_price);
      const currentPrice = parseFloat(pos.current_price);
      const positionValue = parseFloat(pos.market_value);
      const pnlDollars = parseFloat(pos.unrealized_pl);
      const pnlPercent = parseFloat(pos.unrealized_plpc) * 100;

      // Get order details to extract entry time and stop/take levels
      const ordersRes = await fetch(
        `https://paper-api.alpaca.markets/v2/orders?symbols=${symbol}&status=all`,
        { headers: { Authorization: getAuthHeader() } }
      );
      const orders = (await ordersRes.json()) as any[];

      const entryOrder = orders.find((o: any) => o.status === "filled" || o.status === "new");
      const entryTime = entryOrder?.submitted_at || new Date().toISOString();

      // Extract stop loss and take profit from order notes or use defaults
      const stopLoss = pos.stop_loss_price ? parseFloat(pos.stop_loss_price) : avgFillPrice * 0.97;
      const takeProfit = pos.take_profit_price
        ? parseFloat(pos.take_profit_price)
        : avgFillPrice * 1.05;

      openPositions.push({
        symbol,
        qty,
        avgFillPrice,
        currentPrice,
        positionValue,
        pnlDollars,
        pnlPercent,
        stopLoss,
        takeProfit,
        entryTime,
        status: "OPEN",
        assetClass: pos.asset_class || "unknown",
      });
    }

    return openPositions;
  } catch (error: any) {
    console.error("Error fetching positions:", error.message);
    return [];
  }
}

// CLI usage
(async () => {
  console.log("📊 POSICIONES ABIERTAS EN VIVO\n");

  const positions = await getOpenPositions();

  if (positions.length === 0) {
    console.log("✅ Sin posiciones abiertas");
    return;
  }

  positions.forEach((pos) => {
    console.log(`\n${pos.symbol} (${pos.assetClass.toUpperCase()})`);
    console.log(`  Cantidad: ${pos.qty}`);
    console.log(`  Precio Entrada: $${pos.avgFillPrice.toFixed(2)}`);
    console.log(`  Precio Actual: $${pos.currentPrice.toFixed(2)}`);
    console.log(`  Valor Posición: $${pos.positionValue.toFixed(2)}`);
    console.log(`  P&L: ${pos.pnlDollars > 0 ? "+$" : "-$"}${Math.abs(pos.pnlDollars).toFixed(2)} (${pos.pnlPercent > 0 ? "+" : ""}${pos.pnlPercent.toFixed(2)}%)`);
    console.log(`  Stop Loss: $${pos.stopLoss.toFixed(2)}`);
    console.log(`  Take Profit: $${pos.takeProfit.toFixed(2)}`);
    console.log(`  Entrada: ${pos.entryTime}`);
    console.log(`  Estado: ${pos.status}`);
  });

  console.log("\n✅ Datos actualizados a las " + new Date().toLocaleTimeString());
})();
