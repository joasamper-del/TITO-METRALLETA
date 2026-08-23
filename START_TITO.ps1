# TITO METRALLETA - AUTO START SCRIPT
# Ejecutar: .\START_TITO.ps1

param(
    [switch]$SkipBrowser = $false
)

$ProjectRoot = $PSScriptRoot
$BackendDir = "$ProjectRoot\backend"
$WebDir = "$ProjectRoot\web"

Write-Host 'Iniciando TITO METRALLETA...' -ForegroundColor Green

# Verificar ubicacion
if (-not (Test-Path $BackendDir)) {
    Write-Host 'Backend no encontrado' -ForegroundColor Red
    exit 1
}

# Verificar dependencias
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host 'Node.js no encontrado' -ForegroundColor Red
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host 'npm no encontrado' -ForegroundColor Red
    exit 1
}

# Backend
Set-Location $BackendDir

if (-not (Test-Path "$BackendDir\node_modules")) {
    Write-Host 'Instalando dependencias backend...' -ForegroundColor Cyan
    npm install --legacy-peer-deps
}

if (-not (Test-Path "$BackendDir\.env.local")) {
    Write-Host 'Creando .env.local...' -ForegroundColor Cyan
    @"
DATABASE_URL=postgresql://user:password@localhost:5432/tito_metralleta
JWT_SECRET=dev-secret-key-change-in-production
ALPHA_VANTAGE_KEY=
FINNHUB_KEY=
NODE_ENV=development
"@ | Set-Content -Path "$BackendDir\.env.local"
}

Write-Host 'Compilando backend...' -ForegroundColor Yellow
npm run build 2>&1 | Out-Null

Write-Host 'Iniciando backend...' -ForegroundColor Yellow
$BackendProcess = Start-Process -FilePath cmd -ArgumentList '/c', 'npm run start:dev' -PassThru -NoNewWindow
Write-Host "Backend iniciado (PID: $($BackendProcess.Id))" -ForegroundColor Green

# Esperar a que servidor este listo
$Waited = 0
$Ready = $false
while ($Waited -lt 30) {
    try {
        $Response = Invoke-WebRequest -Uri 'http://localhost:3000/health' -ErrorAction SilentlyContinue
        if ($Response.StatusCode -eq 200) {
            $Ready = $true
            break
        }
    } catch {
    }
    Start-Sleep -Seconds 1
    $Waited++
}

if ($Ready) {
    Write-Host 'Backend corriendo' -ForegroundColor Green
    Write-Host 'URLs:' -ForegroundColor Cyan
    Write-Host '  Backend: http://localhost:3000' -ForegroundColor Green
    Write-Host '  Health: http://localhost:3000/health' -ForegroundColor Green
} else {
    Write-Host 'Backend no respondio' -ForegroundColor Red
}

# Frontend (opcional)
if (Test-Path $WebDir) {
    Write-Host 'Iniciando frontend...' -ForegroundColor Yellow
    Set-Location $WebDir
    if (-not (Test-Path "$WebDir\node_modules")) {
        npm install
    }
    $WebProcess = Start-Process -FilePath cmd -ArgumentList '/c', 'npm run dev' -PassThru -NoNewWindow
    Write-Host "Frontend iniciado (PID: $($WebProcess.Id))" -ForegroundColor Green
    Write-Host '  Frontend: http://localhost:3001' -ForegroundColor Green
}

# Abrir navegador
if (-not $SkipBrowser -and $Ready) {
    Start-Process 'http://localhost:3000/health'
}

Write-Host 'Tito Metralleta iniciado correctamente' -ForegroundColor Green
