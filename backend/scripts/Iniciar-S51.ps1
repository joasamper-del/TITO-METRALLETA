# S51 Startup Script (PowerShell)
# Double-click to start Tito's automated paper trading week

Write-Host @"
╔════════════════════════════════════════════════════════════╗
║          S51 PAPER TRADING - STARTING TITO                ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  🟢 Initializing Tito Metralleta...                       ║
║                                                            ║
║  Configuration:                                            ║
║    • Symbols: SPY, QQQ, BTC                               ║
║    • Mode: Automated paper trading (simulation)           ║
║    • Schedule: Mon-Fri 9:30 AM - 4:00 PM ET              ║
║    • Duration: Full week                                  ║
║                                                            ║
║  Logs will appear below. Leave this window open.          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
"@ -ForegroundColor Green

# Navigate to backend directory
$backendDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Split-Path -Parent $backendDir
Set-Location $backendDir

Write-Host "`n📂 Working directory: $backendDir`n" -ForegroundColor Cyan

# Start S51 cron scheduler
Write-Host "🚀 Starting S51 Cron Scheduler..." -ForegroundColor Yellow
Write-Host "────────────────────────────────────────────────────────────`n" -ForegroundColor Gray

try {
    # Run the TypeScript script via ts-node
    & npx ts-node scripts/s51-cron-scheduler.ts
}
catch {
    Write-Host "`n❌ Error: $_" -ForegroundColor Red
    Write-Host "`nMake sure Node.js is installed and npm packages are updated." -ForegroundColor Yellow
    Write-Host "Run: npm install" -ForegroundColor Gray
    Read-Host "Press Enter to exit"
    exit 1
}
