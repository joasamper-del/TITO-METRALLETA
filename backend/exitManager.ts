/**
 * EXIT MANAGER — Software-based position protection
 * Monitors BTC position and manages Stop Loss / Take Profit
 * Separado de Tito Core (FROZEN - sin cambios)
 * Autonomía OFF (manual confirmation required)
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

interface PositionState {
  symbol: string;
  qty: number;
  currentPrice: number;
  positionValue: number;
  pnl: number;
  stopLoss: number;
  takeProfit: number;
  tpOrderId?: string;
}

class ExitManager {
  private position: PositionState | null = null;
  private isMonitoring = false;
  private logFile: string;

  constructor() {
    const logDir = path.join(__dirname, "phase_d_logs");
    this.logFile = path.join(logDir, `exit_manager_${new Date().toISOString().split("T")[0]}.jsonl`);
  }

  private log(event: string, data: any) {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      event,
      ...data,
    }) + "\n";
    fs.appendFileSync(this.logFile, entry);
    console.log(`[${event}] ${JSON.stringify(data)}`);
  }

  async getPosition(): Promise<PositionState | null> {
    try {
      const res = await fetch(`https://paper-api.alpaca.markets/v2/positions/BTCUSD`, {
        headers: { Authorization: getAuthHeader() },
      });

      if (!res.ok) return null;

      const pos = (await res.json()) as any;
      return {
        symbol: "BTCUSD",
        qty: parseFloat(pos.qty),
        currentPrice: parseFloat(pos.current_price),
        positionValue: parseFloat(pos.market_value),
        pnl: parseFloat(pos.unrealized_pl),
        stopLoss: 75332.14,
        takeProfit: 81545.10,
      };
    } catch (error) {
      return null;
    }
  }

  async getTPOrder(): Promise<any | null> {
    try {
      const res = await fetch(
        `https://paper-api.alpaca.markets/v2/orders?symbols=BTCUSD&status=all`,
        { headers: { Authorization: getAuthHeader() } }
      );

      const orders = (await res.json()) as any[];
      return orders.find(
        (o: any) => o.side === "sell" && o.limit_price === "81545.1" && o.status !== "canceled"
      );
    } catch (error) {
      return null;
    }
  }

  async closePosition(reason: string): Promise<boolean> {
    try {
      const payload = {
        symbol: "BTCUSD",
        qty: this.position!.qty,
        side: "sell",
        type: "market",
        time_in_force: "day",
      };

      const res = await fetch(`https://paper-api.alpaca.markets/v2/orders`, {
        method: "POST",
        headers: {
          Authorization: getAuthHeader(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const order = (await res.json()) as any;
        this.log("POSITION_CLOSED", {
          reason,
          orderId: order.id,
          price: this.position!.currentPrice,
          pnl: this.position!.pnl,
        });
        return true;
      }
      return false;
    } catch (error) {
      this.log("CLOSE_ERROR", { error: String(error) });
      return false;
    }
  }

  async cancelTPOrder(orderId: string): Promise<boolean> {
    try {
      const res = await fetch(`https://paper-api.alpaca.markets/v2/orders/${orderId}`, {
        method: "DELETE",
        headers: { Authorization: getAuthHeader() },
      });

      if (res.status === 204) {
        this.log("TP_CANCELED", { orderId });
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async checkExitConditions(): Promise<void> {
    const pos = await this.getPosition();
    if (!pos) {
      console.log("⚠️  Posición no encontrada - puede estar cerrada");
      return;
    }

    this.position = pos;

    // Condición 1: Stop Loss (price <= $75,332.14)
    if (pos.currentPrice <= pos.stopLoss) {
      console.log(`\n🔴 STOP LOSS TRIGGERED: $${pos.currentPrice} <= $${pos.stopLoss}`);
      this.log("STOP_LOSS_TRIGGERED", {
        price: pos.currentPrice,
        sl: pos.stopLoss,
      });

      // Cancelar TP order
      const tpOrder = await this.getTPOrder();
      if (tpOrder) {
        await this.cancelTPOrder(tpOrder.id);
      }

      // Cerrar posición
      await this.closePosition("STOP_LOSS");
      return;
    }

    // Condición 2: Take Profit (price >= $81,545.10)
    if (pos.currentPrice >= pos.takeProfit) {
      console.log(`\n🟢 TAKE PROFIT TRIGGERED: $${pos.currentPrice} >= $${pos.takeProfit}`);
      this.log("TAKE_PROFIT_TRIGGERED", {
        price: pos.currentPrice,
        tp: pos.takeProfit,
        pnl: pos.pnl,
      });

      // TP order ya debería ejecutarse automáticamente
      // Solo registramos el evento
      this.log("TP_AUTO_EXECUTE", { price: pos.currentPrice });
      return;
    }

    // Aún en rango
    console.log(
      `📊 BTC: $${pos.currentPrice} | SL: $${pos.stopLoss} | TP: $${pos.takeProfit} | P&L: $${pos.pnl.toFixed(2)}`
    );
  }

  async startMonitoring(intervalSeconds: number = 5): Promise<void> {
    if (this.isMonitoring) {
      console.log("⚠️  Ya está monitoreando");
      return;
    }

    this.isMonitoring = true;
    this.log("MONITORING_STARTED", { intervalSeconds });
    console.log(`\n✅ Exit Manager iniciado`);
    console.log(`   Monitorea cada ${intervalSeconds} segundos`);
    console.log(`   SL: $75,332.14 | TP: $81,545.10\n`);

    // Loop de monitoreo
    const interval = setInterval(async () => {
      await this.checkExitConditions();
    }, intervalSeconds * 1000);

    // Mantener el proceso activo
    process.on("SIGINT", () => {
      clearInterval(interval);
      this.log("MONITORING_STOPPED", {});
      console.log("\n✅ Exit Manager detenido");
      process.exit(0);
    });
  }
}

// DRY-RUN: Probar sin autonomía
async function dryRun() {
  console.log("🧪 DRY-RUN: Verificar configuración\n");

  const manager = new ExitManager();
  const pos = await manager.getPosition();

  if (!pos) {
    console.log("❌ Posición BTC no encontrada");
    return;
  }

  console.log("✅ Posición encontrada:");
  console.log(`   Precio: $${pos.currentPrice}`);
  console.log(`   SL: $${pos.stopLoss}`);
  console.log(`   TP: $${pos.takeProfit}`);
  console.log(`   P&L: $${pos.pnl.toFixed(2)}\n`);

  const tpOrder = await manager.getTPOrder();
  console.log(tpOrder ? `✅ TP Order encontrada` : `⚠️  TP Order no encontrada`);

  console.log("\n✅ DRY-RUN completo");
  console.log("   Para activar: ENABLE_EXIT_MANAGER=true npx ts-node exitManager.ts");
}

// Main
const enableMonitoring = process.env.ENABLE_EXIT_MANAGER === "true";
if (enableMonitoring) {
  const manager = new ExitManager();
  manager.startMonitoring(5);
} else {
  dryRun();
}
