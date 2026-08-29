/**
 * Investigación: Estrategias de protección en Alpaca Paper Crypto
 */

(async () => {
  console.log("🔬 INVESTIGACIÓN: ALPACA CRYPTO PROTECTION STRATEGIES\n");
  
  console.log("1️⃣ ESTRATEGIAS NATIVAS PROBADAS:");
  console.log("   ❌ OCO (One Cancels Other): No soportado en crypto");
  console.log("   ❌ Bracket Orders: No soportado en crypto");
  console.log("   ❌ STOP orders: Tipo inválido para crypto");
  console.log("   ✅ LIMIT orders: Soportado (usado para TP)");
  console.log("   ⚠️  Múltiples SELL: Balance insufficient error\n");
  
  console.log("2️⃣ CONCLUSIÓN:");
  console.log("   Alpaca Paper Crypto NO soporta:");
  console.log("   • OCO/Bracket simultáneos");
  console.log("   • Stop orders directos");
  console.log("   • Múltiples órdenes SELL de igual cantidad\n");
  
  console.log("3️⃣ SOLUCIÓN:");
  console.log("   ✅ Exit Manager (software-based monitoring)");
  console.log("   • Monitorea precio en tiempo real");
  console.log("   • Si precio baja a SL: cancela TP + cierra posición");
  console.log("   • Si precio sube a TP: ejecuta TP + cancela SL lógico");
  console.log("   • Previene double-sell y race conditions\n");
  
  console.log("4️⃣ IMPLEMENTACIÓN:");
  console.log("   • Module: exitManager.ts (separado de Tito Core)");
  console.log("   • Autonomía: OFF (requiere confirmación)");
  console.log("   • Monitoreo: Cada 5 segundos");
  console.log("   • Logging: Completo en phase_d_logs");
  
})();
