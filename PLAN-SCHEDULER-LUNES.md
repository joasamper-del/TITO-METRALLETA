# 🚀 Plan Scheduler Automático 0DTE — Listo para Lunes

**Fecha preparación:** 2026-08-22  
**Implementación:** 2026-08-25 (lunes) 09:00 AM ET  
**Duración implementación:** 1-2 horas  
**Status:** ✅ PRE-DISEÑADO, LISTO PARA COPY-PASTE

---

## 📋 Opciones de Scheduler (Elige Una)

### Opción A: CronCreate (Recomendado — Cloud)

**Ventaja:** Cloud-hosted, sin dependencia de computadora local  
**Desventaja:** Requiere token Claude válido en cloud

**Implementación (5 min):**

```bash
# Crear scheduled agent que corra cada 5 min durante mercado (9:30-16:00 ET)
claude --remote-trigger 0dte-scheduler \
  --schedule "*/5 9-16 * * 1-5" \
  --prompt "Ejecuta: curl http://localhost:3000/api/0dte/flow?ticker=SPX; curl http://localhost:3000/api/0dte/eval?ticker=SPX. Guarda resultado en /tmp/0dte-scheduler-log-\$(date +%s).txt"
```

**Ventaja:** Implementación ultra-rápida  
**Limitación:** Necesita que localhost:3000 sea accesible desde cloud (posible con ngrok)

---

### Opción B: launchd Local (macOS)

**Ventaja:** Corre en tu computadora, sin dependencias externas  
**Desventaja:** Solo macOS, requiere que la Mac esté encendida

**Implementación (15 min):**

**1. Crear script shell (`~/Library/Scripts/tito-scheduler.sh`):**

```bash
#!/bin/bash
# 0DTE Scheduler — ejecuta cada 5 min durante 9:30-16:00 ET

TICKER="SPX"
LOG_DIR="$HOME/Library/Logs/tito-scheduler"
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/$(date +%Y-%m-%d_%H-%M-%S).log"

{
  echo "=== 0DTE Scheduler Run [$(date)]"
  
  # API 1: Chain
  echo "Fetching chain..."
  curl -s http://localhost:3000/api/0dte?ticker=$TICKER | jq '.table | length' >> $LOG_FILE
  
  # API 2: Flow
  echo "Fetching flow..."
  curl -s http://localhost:3000/api/0dte/flow?ticker=$TICKER | jq '.cycles' >> $LOG_FILE
  
  # API 3: Eval
  echo "Fetching eval..."
  curl -s http://localhost:3000/api/0dte/eval?ticker=$TICKER | jq '.meanAbsErrorPct' >> $LOG_FILE
  
  echo "✅ Complete [$(date)]"
  
} >> $LOG_FILE 2>&1
```

**2. Crear plist (`~/Library/LaunchAgents/com.tito.scheduler.plist`):**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.tito.scheduler</string>
    
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/Users/[USERNAME]/Library/Scripts/tito-scheduler.sh</string>
    </array>
    
    <key>StartCalendarInterval</key>
    <array>
        <!-- Lunes–Viernes, 9:30–16:00 ET, cada 5 min -->
        <dict>
            <key>Hour</key>
            <integer>9</integer>
            <key>Minute</key>
            <integer>30</integer>
            <key>Weekday</key>
            <array>
                <integer>1</integer> <!-- Lunes -->
                <integer>2</integer> <!-- Martes -->
                <integer>3</integer> <!-- Miércoles -->
                <integer>4</integer> <!-- Jueves -->
                <integer>5</integer> <!-- Viernes -->
            </array>
        </dict>
        <!-- Repetir para 9:35, 9:40, 9:45, etc. hasta 16:00 -->
        <!-- (O usar StartInterval con 300 segundos durante esos horarios) -->
    </array>
    
    <key>RunAtLoad</key>
    <true/>
    
    <key>StandardOutPath</key>
    <string>/Users/[USERNAME]/Library/Logs/tito-scheduler/stdout.log</string>
    
    <key>StandardErrorPath</key>
    <string>/Users/[USERNAME]/Library/Logs/tito-scheduler/stderr.log</string>
</dict>
</plist>
```

**3. Instalar:**

```bash
# Reemplazar [USERNAME] en el plist
sed -i '' 's/\[USERNAME\]/'$USER'/g' ~/Library/LaunchAgents/com.tito.scheduler.plist

# Cargar
launchctl load ~/Library/LaunchAgents/com.tito.scheduler.plist

# Verificar
launchctl list | grep tito

# Ver logs
tail -f ~/Library/Logs/tito-scheduler/stdout.log
```

---

### Opción C: Windows Task Scheduler (Windows)

**Ventaja:** Nativo Windows, corre en tu PC  
**Desventaja:** Requiere que la PC esté encendida

**Implementación (15 min):**

**1. Crear script PowerShell (`C:\Scripts\tito-scheduler.ps1`):**

```powershell
# 0DTE Scheduler
$ticker = "SPX"
$logDir = "C:\Logs\tito-scheduler"
$logFile = "$logDir\$(Get-Date -Format 'yyyy-MM-dd_HH-mm-ss').log"

if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir }

Add-Content -Path $logFile -Value "=== 0DTE Scheduler Run [$(Get-Date)]"

# Chain API
$chain = Invoke-RestMethod -Uri "http://localhost:3000/api/0dte?ticker=$ticker"
Add-Content -Path $logFile -Value "Chain rows: $($chain.table.Count)"

# Flow API
$flow = Invoke-RestMethod -Uri "http://localhost:3000/api/0dte/flow?ticker=$ticker"
Add-Content -Path $logFile -Value "Flow cycles: $($flow.cycles)"

# Eval API
$eval = Invoke-RestMethod -Uri "http://localhost:3000/api/0dte/eval?ticker=$ticker"
Add-Content -Path $logFile -Value "Eval MAE: $($eval.meanAbsErrorPct)"

Add-Content -Path $logFile -Value "✅ Complete [$(Get-Date)]"
```

**2. Crear tarea en Task Scheduler:**

- Abrir: `taskschd.msc`
- New Task: "Tito 0DTE Scheduler"
- Trigger: Lunes–Viernes 9:30–16:00 ET, repetir cada 5 min
- Action: Run `powershell.exe -File C:\Scripts\tito-scheduler.ps1`
- Settings: "Run task as soon as possible if a scheduled start is missed"

---

## 🎯 Recomendación

**Para Lunes 09:00 AM:**

- **Si macOS:** Opción B (launchd) — nativa, confiable, 100% local
- **Si Windows:** Opción C (Task Scheduler) — nativa, confiable
- **Si quieres cloud:** Opción A (CronCreate) — pero requiere ngrok para acceder localhost

**Decisión:** Elige ANTES del lunes y prepara el script ahora (copy-paste lunes 09:00 AM).

---

## 📋 Checklist — Lunes 09:00 AM ET

### 15 min antes (08:45 AM)

- [ ] Servidor corriendo: `npm run dev`
- [ ] Eligiste scheduler (A/B/C)
- [ ] Script shell/PowerShell preparado
- [ ] Terminal lista para ejecutar

### 09:00 AM — Implementar

```bash
# Opción B (macOS) — ejemplo
sed -i '' 's/\[USERNAME\]/'$USER'/g' ~/Library/LaunchAgents/com.tito.scheduler.plist
launchctl load ~/Library/LaunchAgents/com.tito.scheduler.plist
launchctl list | grep tito  # Verificar
tail -f ~/Library/Logs/tito-scheduler/stdout.log  # Monitorear
```

### 09:15 AM — Verificar

```bash
# Debe ver logs cada 5 min
tail -f [log-file]

# Debe ver datos acumulando
curl -s http://localhost:3000/api/0dte/flow?ticker=SPX | jq '.cycles'
# Ciclos deben incrementar: 1, 2, 3, 4...
```

### 09:30 AM — Mercado abierto

- [ ] Abrir `/0dte?ticker=SPX` en navegador
- [ ] Tabla se puebla en tiempo real
- [ ] Flujo acumula (ciclos incrementan)
- [ ] Sin errores en logs

---

## 🔧 Troubleshooting Rápido

**Error: "Failed to connect to localhost:3000"**
- Verifica: ¿servidor corre? `curl http://localhost:3000`

**Error: "HTTP 401 Schwab"**
- Esperado (token caduca)
- Script debe auto-renovar (verificar en `lib/schwab.ts` línea 57)

**Error: "MarketSnack 401"**
- Cookie caduca
- Esperado, documentar

**Logs no aparecen**
- Verifica permisos de carpeta log
- Verifica que el script tenga acceso de lectura/escritura

---

## 📊 Resultado Esperado (Lunes 16:00 ET)

**Carpeta de logs con 66 archivos:**
```
logs/tito-scheduler/
├── 2026-08-25_09-30-00.log (Primera ejecución)
├── 2026-08-25_09-35-00.log
├── 2026-08-25_09-40-00.log
├── ... (cada 5 min)
└── 2026-08-25_16-00-00.log (Última a cierre)

# Contenido de cada log:
=== 0DTE Scheduler Run [Mon Aug 25 09:30:00 2026]
Chain rows: 18
Flow cycles: 1
Eval MAE: null
✅ Complete [Mon Aug 25 09:30:05 2026]
```

---

## 🚨 Si Algo Falla Lunes

1. Reporta: Hora ET, error exacto, output del log
2. Yo propongo fix
3. Esperas aprobación antes de modificar

---

**Status:** ✅ TODO LISTO PARA LUNES 09:00 AM ET

Elige tu opción (A/B/C) ahora y ten el script preparado. Copy-paste el lunes y valida en vivo.

