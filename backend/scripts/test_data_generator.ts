import * as fs from "fs";

// Generar datos sintéticos para prueba
function generateTestData() {
  const bars = [];
  let price = 450; // SPY ~$450
  let date = new Date("2026-07-30T09:30:00Z");

  for (let i = 0; i < 100; i++) {
    const change = (Math.random() - 0.5) * 2; // ±1% cambio
    const close = price + change;
    const high = Math.max(price, close) + Math.abs(change) * 0.5;
    const low = Math.min(price, close) - Math.abs(change) * 0.5;

    bars.push({
      timestamp: date.toISOString(),
      open: price,
      high: high,
      low: low,
      close: close,
      volume: Math.floor(50000000 + Math.random() * 100000000), // 50M-150M
    });

    price = close;
    date = new Date(date.getTime() + 60000); // +1 min
  }

  return bars;
}

function generateVIXData(len: number) {
  const bars = [];
  let vixValue = 25;
  let date = new Date("2026-07-30T09:30:00Z");

  for (let i = 0; i < len; i++) {
    const change = (Math.random() - 0.5) * 5;
    vixValue = Math.max(10, Math.min(80, vixValue + change));

    bars.push({
      timestamp: date.toISOString(),
      value: vixValue,
    });

    date = new Date(date.getTime() + 60000);
  }

  return bars;
}

const spyData = generateTestData();
const qqqData = generateTestData();
const vixData = generateVIXData(spyData.length);

fs.writeFileSync("historical_SPY.json", JSON.stringify({ bars: spyData }, null, 2));
fs.writeFileSync("historical_QQQ.json", JSON.stringify({ bars: qqqData }, null, 2));
fs.writeFileSync("historical_VIX.json", JSON.stringify({ bars: vixData }, null, 2));

console.log("✅ Test data generated:");
console.log(`   - historical_SPY.json (${spyData.length} bars)`);
console.log(`   - historical_QQQ.json (${qqqData.length} bars)`);
console.log(`   - historical_VIX.json (${vixData.length} bars)\n`);
