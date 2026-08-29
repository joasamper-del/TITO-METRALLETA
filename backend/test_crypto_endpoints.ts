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
  const endpoints = [
    "/v1/crypto/latest/bars?symbols=BTC/USD",
    "/v1/crypto/bars/latest?symbols=BTC/USD",
    "/v2/crypto/bars/latest?symbols=BTC/USD",
    "/v1/bars/latest?symbols=BTCUSD",
  ];
  
  console.log("🧪 PROBANDO ENDPOINTS CRYPTO\n");
  
  for (const endpoint of endpoints) {
    try {
      const url = `https://paper-api.alpaca.markets${endpoint}`;
      const res = await fetch(url, {
        headers: { Authorization: getAuthHeader() },
      });
      
      const text = await res.text();
      console.log(`${endpoint}`);
      console.log(`  Status: ${res.status}`);
      console.log(`  Response: ${text.substring(0, 100)}\n`);
    } catch (e: any) {
      console.log(`${endpoint}`);
      console.log(`  Error: ${e.message}\n`);
    }
  }
})();
