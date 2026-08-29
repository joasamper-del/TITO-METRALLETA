/**
 * TEST: Simula flujo completo Fase D SIN ejecutar órdenes
 * Verifica que logging/dashboard capturen correctamente
 */

import { createTradeRecord, logTrade, getSummary } from "./tradingLogger";

(async () => {
  console.log("🧪 TEST: Flujo Fase D (SIN EJECUTAR ÓRDENES)");
  console.log("═══════════════════════════════════════════\n");

  // Simular trade 1: SPY CALL (ganador)
  console.log("1️⃣ Simulando SPY CALL (ganador)...");
  const trade1 = createTradeRecord(
    "SPY",
    "CALL",
    78,
    "Tendencia alcista confirmada + nivel de soporte tocado",
    582.15,
    578.00,
    590.00,
    585.50,
    "Take profit tocado",
    0.05,
    0.02,
    "0:45:30",
    ["Gamma positivo", "TAPE fuerte", "Volatilidad en rango"],
    "Flujo validado"
  );
  logTrade(trade1);
  console.log(`   ✅ Trade registrado: ${trade1.result} | P&L: $${trade1.pnlDollars.toFixed(2)}\n`);

  // Simular trade 2: QQQ PUT (perdedor)
  console.log("2️⃣ Simulando QQQ PUT (perdedor)...");
  const trade2 = createTradeRecord(
    "QQQ",
    "PUT",
    42,
    "Patrón ambiguo + baja confianza",
    385.25,
    390.00,
    378.00,
    386.50,
    "Stop loss tocado",
    0.15,
    0.08,
    "0:22:15",
    ["Gamma negativo débil", "Flujo mixto"],
    "Revisar manualmente"
  );
  logTrade(trade2);
  console.log(`   ✅ Trade registrado: ${trade2.result} | P&L: $${trade2.pnlDollars.toFixed(2)}\n`);

  // Simular trade 3: SPY WAIT (rechazado)
  console.log("3️⃣ Simulando SPY WAIT (rechazado por Tito)...");
  const trade3 = createTradeRecord(
    "SPY",
    "WAIT",
    35,
    "Vela pendiente + confirmación incompleta",
    583.00,
    580.00,
    586.00,
    583.00,
    "Sin ejecución",
    0,
    0,
    "0:00:00",
    ["Esperar próximo cierre"],
    "Decisión: ESPERAR"
  );
  logTrade(trade3);
  console.log(`   ✅ Trade registrado: ${trade3.result} | WAIT no ejecutado\n`);

  // Obtener resumen
  console.log("📊 RESUMEN ACUMULADO:");
  const summary = getSummary();
  if (summary) {
    console.log(`   Total operaciones: ${summary.totalTrades}`);
    console.log(`   Ganadas: ${summary.winnersCount} | Perdidas: ${summary.losersCount}`);
    console.log(`   Win Rate: ${summary.winRate.toFixed(1)}%`);
    console.log(`   P&L Total: $${summary.totalPnlDollars.toFixed(2)} (${summary.totalPnlPercent.toFixed(2)}%)`);
    console.log(`\n   Por Ticker:`);
    Object.values(summary.byTicker).forEach((ticker) => {
      console.log(`   - ${ticker.ticker}: ${ticker.trades} trades | ${ticker.winRate.toFixed(1)}% win rate | $${ticker.pnlDollars.toFixed(2)}`);
    });
  }

  console.log("\n✅ TEST COMPLETADO (SIN ÓRDENES REALES EJECUTADAS)");
  console.log("🔍 Verifica en /paper dashboard que los datos se vean correctamente\n");
})();
