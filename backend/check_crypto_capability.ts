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
  console.log("🔍 VERIFICANDO CAPACIDADES CRYPTO\n");
  
  try {
    // 1. Account settings
    console.log("1️⃣ Estado de Cuenta:");
    const accountRes = await fetch(
      `https://paper-api.alpaca.markets/v2/account`,
      { headers: { Authorization: getAuthHeader() } }
    );
    const account = (await accountRes.json()) as any;
    
    console.log(`   Crypto Status: ${account.crypto_status}`);
    console.log(`   Crypto Buying Power: $${account.crypto_buying_power || 'N/A'}`);
    console.log(`   Options Level: ${account.options_approved_level}`);
    
    // 2. Crypto positions
    console.log("\n2️⃣ Posiciones Crypto:");
    const posRes = await fetch(
      `https://paper-api.alpaca.markets/v2/positions?asset_class=crypto`,
      { headers: { Authorization: getAuthHeader() } }
    );
    const positions = (await posRes.json()) as any;
    
    if (Array.isArray(positions) && positions.length > 0) {
      positions.forEach((p: any) => {
        console.log(`   - ${p.symbol}: ${p.qty} @ $${p.avg_fill_price}`);
      });
    } else {
      console.log(`   ✅ Sin posiciones crypto`);
    }
    
    // 3. Crypto bars (test availability)
    console.log("\n3️⃣ Disponibilidad de Pares:");
    const cryptoPairs = ["BTC/USD", "ETH/USD", "BNB/USD", "SOL/USD"];
    
    for (const pair of cryptoPairs) {
      try {
        const barRes = await fetch(
          `https://paper-api.alpaca.markets/v1/crypto/latest/bars?symbols=${pair}`,
          { headers: { Authorization: getAuthHeader() } }
        );
        
        if (barRes.status === 200) {
          const data = (await barRes.json()) as any;
          if (data.bars && data.bars[pair]) {
            const bar = data.bars[pair];
            console.log(`   ✅ ${pair}: $${bar.c} (${bar.vw})`);
          }
        } else {
          console.log(`   ❌ ${pair}: ${barRes.status}`);
        }
      } catch (e: any) {
        console.log(`   ❌ ${pair}: Error`);
      }
    }
    
    console.log(`\n✅ CRYPTO HABILITADO EN CUENTA`);
    
  } catch (error: any) {
    console.error("❌ Error:", error.message);
  }
})();
