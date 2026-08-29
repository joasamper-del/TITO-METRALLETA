/**
 * API Route: GET /api/positions
 * Devuelve posiciones abiertas en vivo de Alpaca Paper
 */

const API_KEY = process.env.ALPACA_API_KEY || "";
const SECRET_KEY = process.env.ALPACA_SECRET_KEY || "";

function getAuthHeader(): string {
  const credentials = `${API_KEY}:${SECRET_KEY}`;
  return "Basic " + Buffer.from(credentials).toString("base64");
}

export async function GET() {
  try {
    // Fetch positions
    const posRes = await fetch("https://paper-api.alpaca.markets/v2/positions", {
      headers: { Authorization: getAuthHeader() },
    });

    if (!posRes.ok) {
      return Response.json({ error: "Failed to fetch positions" }, { status: posRes.status });
    }

    const positions = (await posRes.json()) as any[];

    if (!Array.isArray(positions)) {
      return Response.json({ positions: [] });
    }

    // Format positions
    const formatted = positions.map((pos: any) => ({
      symbol: pos.symbol,
      qty: parseFloat(pos.qty),
      avgFillPrice: parseFloat(pos.avg_fill_price),
      currentPrice: parseFloat(pos.current_price),
      positionValue: parseFloat(pos.market_value),
      pnlDollars: parseFloat(pos.unrealized_pl),
      pnlPercent: parseFloat(pos.unrealized_plpc) * 100,
      assetClass: pos.asset_class || "unknown",
      entryTime: new Date().toISOString(),
      status: "OPEN",
    }));

    return Response.json({
      positions: formatted,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Positions API error:", error);
    return Response.json({ error: error.message, positions: [] }, { status: 500 });
  }
}
