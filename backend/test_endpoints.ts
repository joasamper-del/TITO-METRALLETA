import * as fs from "fs";
import * as path from "path";

const envFilePath = path.join(__dirname, ".env.local");
const envContent = fs.readFileSync(envFilePath, "utf8");
const envLines = envContent.split("\n");
const envVars: Record<string, string> = {};
envLines.forEach((line) => {
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
    "/v2/stocks/latest?symbols=SPY",
    "/v1/bars/latest?symbols=SPY",
    "/v2/snapshot/locale/us/markets/stocks/tickers/SPY",
  ];

  for (const endpoint of endpoints) {
    const url = `https://paper-api.alpaca.markets${endpoint}`;
    try {
      const response = await fetch(url, {
        headers: { Authorization: getAuthHeader() },
      });
      console.log(`${endpoint}: ${response.status} ${response.statusText}`);
    } catch (e: any) {
      console.log(`${endpoint}: ERROR - ${e.message}`);
    }
  }
})();
