/**
 * API endpoint to serve Phase D trading logs
 * Reads from backend/phase_d_logs/ directory
 */

import { NextRequest, NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const logsDir = path.join(process.cwd(), "..", "backend", "phase_d_logs");

    // Check if logs directory exists
    if (!fs.existsSync(logsDir)) {
      return NextResponse.json({ trades: [], summary: null, timestamp: new Date().toISOString() });
    }

    // Get today's date for log file names
    const today = new Date().toISOString().split("T")[0];
    const tradesFile = path.join(logsDir, `trades_${today}.jsonl`);
    const summaryFile = path.join(logsDir, `summary_${today}.json`);

    let trades: any[] = [];
    let summary: any = null;

    // Read trades
    if (fs.existsSync(tradesFile)) {
      const tradesContent = fs.readFileSync(tradesFile, "utf8");
      trades = tradesContent
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .filter((t) => t !== null);
    }

    // Read summary
    if (fs.existsSync(summaryFile)) {
      const summaryContent = fs.readFileSync(summaryFile, "utf8");
      summary = JSON.parse(summaryContent);
    }

    return NextResponse.json({
      trades,
      summary,
      timestamp: new Date().toISOString(),
      paperStatus: "ACTIVE",
      autonomyEnabled: false,
    });
  } catch (error: any) {
    console.error("Error reading Phase D logs:", error);
    return NextResponse.json(
      { error: error.message, trades: [], summary: null },
      { status: 500 }
    );
  }
}
