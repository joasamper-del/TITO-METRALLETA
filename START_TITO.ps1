# 🚀 TITO METRALLETA - AUTO START SCRIPT
# Ejecutar: .\START_TITO.ps1
# O: pwsh -File START_TITO.ps1

param(
    [switch]$SkipBrowser = $false
)

# Colores para output
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"
$Cyan = "Cyan"

Write-Host "`n════════════════════════════════════════" -ForegroundColor $Cyan
Write-Host "🎯 TITO METRALLETA - AUTO START" -ForegroundColor $Cyan
Write-Host "════════════════════════════════════════`n" -ForegroundColor $Cyan

$ErrorLog = @()
$ProjectRoot = $PSScriptRoot
$BackendDir = "$ProjectRoot\backend"
$WebDir = "$ProjectRoot\web"

# ═════════════════════════════════════════
# 1. VERIFICAR UBICACIÓN
# ═════════════════════════════════════════

Write-Host "1️⃣  Verificando ubicación..." -ForegroundColor $Yellow

if (-not (Test-Path $BackendDir)) {
    $ErrorLog += "❌ Backend no encontrado en: $BackendDir"
    Write-Host "❌ Backend no encontrado" -ForegroundColor $Red
    exit 1
}
Write-Host "✅ Backend encontrado" -ForegroundColor $Green

if (-not (Test-Path $WebDir)) {
    Write-Host "⚠️  Web no encontrado (opcional para backend)" -ForegroundColor $Yellow
    $RunWeb = $false
} else {
    Write-Host "✅ Web encontrado" -ForegroundColor $Green
    $RunWeb = $true
}

# ═════════════════════════════════════════
# 2. VERIFICAR DEPENDENCIAS
# ═════════════════════════════════════════

Write-Host "`n2️⃣  Verificando dependencias..." -ForegroundColor $Yellow

# Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $ErrorLog += "❌ Node.js no instalado"
    Write-Host "❌ Node.js no encontrado" -ForegroundColor $Red
    exit 1
}
$NodeVersion = node --version
Write-Host "✅ Node.js $NodeVersion" -ForegroundColor $Green

# npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    $ErrorLog += "❌ npm no instalado"
    Write-Host "❌ npm no encontrado" -ForegroundColor $Red
    exit 1
}
Write-Host "✅ npm instalado" -ForegroundColor $Green

# PowerShell (ya estamos en PowerShell)
Write-Host "✅ PowerShell listo" -ForegroundColor $Green

# ═════════════════════════════════════════
# 3. INSTALAR/VERIFICAR DEPENDENCIAS
# ═════════════════════════════════════════

Write-Host "`n3️⃣  Verificando node_modules (backend)..." -ForegroundColor $Yellow

Set-Location $BackendDir

if (-not (Test-Path "$BackendDir\node_modules")) {
    Write-Host "📦 Instalando dependencias backend..." -ForegroundColor $Cyan
    npm install --legacy-peer-deps
    if ($LASTEXITCODE -ne 0) {
        $ErrorLog += "❌ npm install falló"
        Write-Host "❌ Error en npm install" -ForegroundColor $Red
        exit 1
    }
    Write-Host "✅ Dependencias instaladas" -ForegroundColor $Green
} else {
    Write-Host "✅ node_modules existe" -ForegroundColor $Green
}

# ═════════════════════════════════════════
# 4. CREAR .env.local SI NO EXISTE
# ═════════════════════════════════════════

Write-Host "`n4️⃣  Verificando configuración (.env.local)..." -ForegroundColor $Yellow

if (-not (Test-Path "$BackendDir\.env.local")) {
    Write-Host "📝 Creando .env.local..." -ForegroundColor $Cyan
    $EnvContent = @"
DATABASE_URL=postgresql://user:password@localhost:5432/tito_metralleta
JWT_SECRET=dev-secret-key-change-in-production
ALPHA_VANTAGE_KEY=
FINNHUB_KEY=
NODE_ENV=development
"@
    Set-Content -Path "$BackendDir\.env.local" -Value $EnvContent
    Write-Host "✅ .env.local creado (editar si es necesario)" -ForegroundColor $Green
} else {
    Write-Host "✅ .env.local existe" -ForegroundColor $Green
}

# ═════════════════════════════════════════
# 5. COMPILAR BACKEND
# ═════════════════════════════════════════

Write-Host "`n5️⃣  Compilando backend..." -ForegroundColor $Yellow

npm run build 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Build con warnings (continuando...)" -ForegroundColor $Yellow
} else {
    Write-Host "✅ Backend compilado" -ForegroundColor $Green
}

# ═════════════════════════════════════════
# 6. INICIAR BACKEND
# ═════════════════════════════════════════

Write-Host "`n6️⃣  Iniciando backend (puerto 3000)..." -ForegroundColor $Yellow
Write-Host "📡 Backend arrancando..." -ForegroundColor $Cyan

# Iniciar backend en background
$BackendProcess = Start-Process -FilePath "cmd" -ArgumentList "/c", "npm run start:dev" -PassThru -NoNewWindow
$BackendPID = $BackendProcess.Id

# Esperar a que el servidor esté listo
$MaxWait = 30
$Waited = 0
$ServerReady = $false

Write-Host "⏳ Esperando servidor (max 30s)..." -ForegroundColor $Yellow

while ($Waited -lt $MaxWait) {
    try {
        $Response = Invoke-WebRequest -Uri "http://localhost:3000/health" -ErrorAction SilentlyContinue
        if ($Response.StatusCode -eq 200) {
            $ServerReady = $true
            break
        }
    } catch {
        # Servidor aún no está listo
    }
    Start-Sleep -Seconds 1
    $Waited++
}

if ($ServerReady) {
    Write-Host "✅ Backend corriendo en http://localhost:3000" -ForegroundColor $Green
} else {
    Write-Host "❌ Backend no respondió después de 30s" -ForegroundColor $Red
    Write-Host "💡 Verifique los logs en la ventana del backend" -ForegroundColor $Yellow
    $ErrorLog += "⚠️  Backend no respondió en tiempo"
}

# ═════════════════════════════════════════
# 7. INICIAR FRONTEND (OPCIONAL)
# ═════════════════════════════════════════

if ($RunWeb) {
    Write-Host "`n7️⃣  Iniciando frontend..." -ForegroundColor $Yellow

    Set-Location $WebDir

    if (-not (Test-Path "$WebDir\node_modules")) {
        Write-Host "📦 Instalando dependencias frontend..." -ForegroundColor $Cyan
        npm install
    }

    Write-Host "⏳ Frontend arrancando (puede tardar)..." -ForegroundColor $Yellow
    $WebProcess = Start-Process -FilePath "cmd" -ArgumentList "/c", "npm run dev" -PassThru -NoNewWindow
    Write-Host "📡 Frontend en puerto 3001 (verificar en logs)" -ForegroundColor $Cyan
    Start-Sleep -Seconds 5
} else {
    Write-Host "`n7️⃣  Frontend no disponible (skipped)" -ForegroundColor $Yellow
}

# ═════════════════════════════════════════
# 8. ABRIR NAVEGADOR
# ═════════════════════════════════════════

if (-not $SkipBrowser) {
    Write-Host "`n8️⃣  Abriendo navegador..." -ForegroundColor $Yellow
    Start-Sleep -Seconds 2

    if ($ServerReady) {
        Start-Process "http://localhost:3000/health"
        Write-Host "✅ Navegador abierto en http://localhost:3000" -ForegroundColor $Green
    }
}

# ═════════════════════════════════════════
# 9. RESUMEN FINAL
# ═════════════════════════════════════════

Write-Host "`n════════════════════════════════════════" -ForegroundColor $Cyan
Write-Host "✅ TITO METRALLETA INICIADO" -ForegroundColor $Green
Write-Host "════════════════════════════════════════`n" -ForegroundColor $Cyan

Write-Host "📍 URLs:" -ForegroundColor $Cyan
Write-Host "  🔵 Backend:  http://localhost:3000" -ForegroundColor $Green
Write-Host "  🔵 Health:   http://localhost:3000/health" -ForegroundColor $Green

if ($RunWeb) {
    Write-Host "  🟢 Frontend: http://localhost:3001" -ForegroundColor $Green
}

Write-Host "`n📌 PROCESOS ACTIVOS:" -ForegroundColor $Cyan
Write-Host "  Backend PID: $BackendPID" -ForegroundColor $Green
if ($RunWeb) {
    Write-Host "  Frontend PID: $($WebProcess.Id)" -ForegroundColor $Green
}

if ($ErrorLog.Count -gt 0) {
    Write-Host "`n⚠️  ADVERTENCIAS:" -ForegroundColor $Yellow
    $ErrorLog | ForEach-Object { Write-Host "  $_" -ForegroundColor $Yellow }
}

Write-Host "`n💡 PARA DETENER:" -ForegroundColor $Cyan
Write-Host "  - Presiona Ctrl+C en las ventanas de comando" -ForegroundColor $Yellow
Write-Host "  - O ejecuta: Stop-Process -Id $BackendPID" -ForegroundColor $Yellow

Write-Host "`n📚 DOCUMENTACIÓN:" -ForegroundColor $Cyan
Write-Host "  - SESSION_SUMMARY.md" -ForegroundColor $Yellow
Write-Host "  - LOCAL_URLS.md" -ForegroundColor $Yellow
Write-Host "  - PROXIMOS_PASOS.md" -ForegroundColor $Yellow

Write-Host "`n════════════════════════════════════════" -ForegroundColor $Cyan
Write-Host "🚀 Tito Metralleta Listo" -ForegroundColor $Green
Write-Host "════════════════════════════════════════`n" -ForegroundColor $Cyan

# Mantener la ventana abierta
Write-Host "Presiona Ctrl+C para detener..." -ForegroundColor $Yellow
while ($true) {
    Start-Sleep -Seconds 1
}
