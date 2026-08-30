# 🚀 Tito S51 Startup Guide

## Cómo Iniciar Tito Mañana (Opción Fácil)

### **Opción 1: Doble-click en Desktop (RECOMENDADO)**

1. Mira tu escritorio
2. Busca el archivo: `Iniciar-Tito-S51.vbs`
3. **Doble-click** en él
4. Aparecerá un mensaje de confirmación
5. Se abrirá ventana PowerShell con logs de Tito

✅ **Eso es todo. Tito inicia automático.**

---

### **Opción 2: Terminal Manual**

Si prefieres más control, abre PowerShell:

```powershell
cd "C:\Users\18327\Downloads\Agente Tito Metralleta\backend"
npx ts-node scripts/s51-cron-scheduler.ts
```

---

## ¿Qué Verás en Pantalla?

```
╔════════════════════════════════════════════════════════════╗
║        S51 CRON SCHEDULER - AUTOMATED PAPER TRADING        ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  ✅ Scheduler started                                     ║
║                                                            ║
║  Schedule:                                                ║
║    • START: Mon-Fri 9:30 AM ET                           ║
║    • STOP:  Mon-Fri 4:00 PM ET                           ║
║    • CHECK: Every hour (health monitoring)               ║
║                                                            ║
║  🟢 Ready. Waiting for market hours...
║
```

Eso significa que **Tito está esperando a las 9:30 AM**.

---

## Durante la Semana

### **Lunes 9:30 AM**
```
🟢 Starting S51 Paper Trading Loop...
✅ S51 Loop started successfully
```
→ Tito empieza a operar

### **Cada 5 minutos**
```
Tito checks: SPY, QQQ, BTC
→ Si hay oportunidad, ejecuta trade
→ Registra decision + resultado
```

### **Cada hora**
```
✅ HEALTH CHECK: Loop OK | Trades: 12 | Balance: $100,245.32 | Win Rate: 58.3%
```
→ Status automático

### **Lunes-Viernes 4:00 PM**
```
🔴 Stopping S51 Paper Trading Loop...
✅ S51 Loop stopped successfully

╔═══════════════════════════════════════╗
║    S51 END-OF-DAY SUMMARY             ║
║                                       ║
║  Trades: 15 executed, 2 rejected     ║
║  Win Rate: 60.0%                      ║
║  P&L: +$340.50                       ║
║  Balance: $100,340.50                 ║
╚═══════════════════════════════════════╝
```
→ Reporte diario automático

---

## 🛑 Para Parar Anytime

En la ventana PowerShell:
```
Ctrl+C
```

→ Cierra gracefully, genera report final

---

## 📋 Logs y Reportes

Se guardan en: `backend/logs/s51/`

- **scheduler.log** → Todos los eventos
- **report-2026-09-01.txt** → Reporte del lunes
- **report-2026-09-02.txt** → Reporte del martes
- etc.

Revisa estos viernes para análisis.

---

## ✅ Checklist Mañana

- [ ] Doble-click en `Iniciar-Tito-S51.vbs` (escritorio)
- [ ] Confirma mensaje
- [ ] PowerShell abre con logs
- [ ] Ves "🟢 Ready. Waiting for market hours..."
- [ ] 9:30 AM: Ves "🟢 Starting S51 Paper Trading Loop..."
- [ ] Dejas corriendo todo el día
- [ ] 4 PM: Ve "🔴 Stopping..." + reporte
- [ ] Repite Martes-Viernes
- [ ] Viernes: Revisa logs/reportes

---

## 🆘 Si Algo Falla

**Error: Node/npm not found**
```
npm install
# Luego retry
```

**Error: PowerShell execution policy**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# Luego retry
```

**Loop no inicia a las 9:30 AM**
- Verifica que PowerShell window esté abierta
- Revisa scheduler.log para errores

---

**Mañana: Un doble-click. Toda la semana automática.** 🎯
