# 0DTE Framework - Valores Numéricos Consolidados

## Tabla Maestra de Configuración

| Parámetro | Valor | Unidad | Tipo | Estado |
|-----------|-------|--------|------|--------|
| **TAMAÑO Y RIESGO** | | | | |
| Tamaño máximo por trade | $2,000 | USD | Hard limit | CONGELADO |
| Máximo de contratos | 13-40 | contracts | Variable (depende premium) | CALCULADO |
| Pérdida máxima por operación | $2,000 | USD | Hard limit | CONGELADO |
| Pérdida máxima diaria | $5,000 | USD | Hard limit | CONGELADO |
| Ganancia máxima diaria | $8,000 | USD | Soft limit | MONITOREO |
| Máximo de trades por día | 10 | trades | Hard limit | CONGELADO |
| **HORARIOS** | | | | |
| Horario de entrada | 9:30 AM - 4:00 PM | ET | Hard limit | CONGELADO |
| Hora límite para cerrar 0DTE | 3:55 PM | ET | Hard limit | CONGELADO |
| Cierre forzado de mercado | 4:00 PM | ET | Hard limit | CONGELADO |
| **FILTROS DE ENTRADA** | | | | |
| Spread bid/ask máximo | 5% | % of mid | Hard limit | CONGELADO |
| Volumen mínimo | 500 | contracts/hour | Hard limit | CONGELADO |
| Open interest mínimo | 100 | contracts | Hard limit | CONGELADO |
| Tiempo mínimo a expiración | 15 | minutos | Hard limit | CONGELADO |
| **GREEKS Y POSICIONAMIENTO** | | | | |
| Delta permitida (CALL) | 0.30 - 0.70 | delta | Rango aceptable | MONITOREO |
| Delta permitida (PUT) | -0.70 - -0.30 | delta | Rango aceptable | MONITOREO |
| Theta decay máximo tolerado | -0.10 | decay/day | Trigger manual review | MONITOREO |
| IV Rank mínimo aceptable | 30% | % | Avoid si bajo | MONITOREO |
| IV Rank máximo aceptable | 90% | % | Avoid si muy alto | MONITOREO |
| **EXITS** | | | | |
| Stop Loss | Premium × 0.99 | % of premium | Hard limit | CONGELADO |
| Stop Loss en $ | -1% | % loss | Hard limit | CONGELADO |
| Take Profit | Premium × 1.02 | % of premium | Hard limit | CONGELADO |
| Take Profit en $ | +2% | % gain | Hard limit | CONGELADO |
| Trailing Stop | DISABLED | status | N/A | DESHABILITADO |
| **MONITOREO** | | | | |
| Intervalo de chequeo SL | 10 | segundos | Real-time | CONGELADO |
| Intervalo de chequeo P&L | 10 | segundos | Real-time | CONGELADO |
| Chequeo de límite diario | Continuo | real-time | Enforcement | CONGELADO |
| **SÍMBOLOS APROBADOS** | | | | |
| SPY | Enabled | 0DTE | Hard limit | ACTIVO |
| QQQ | Enabled | 0DTE | Hard limit | ACTIVO |
| IWM | Enabled | 0DTE | Hard limit | ACTIVO |
| Otros | DISABLED | N/A | Hard limit | DESHABILITADO |
| **TRADING MODE** | | | | |
| Endpoint | paper-api.alpaca.markets | URL | Hard limit | CONGELADO |
| Trading mode | PAPER | status | Hard limit | CONGELADO |
| Real money | NO | boolean | Hard limit | CONGELADO |
| Live trading | DISABLED | status | Hard limit | DESHABILITADO |

---

## Protocolo: Pérdida de Conexión con Alpaca

### Situación: Conexión Perdida Durante Posición Abierta

```
ESCENARIO: Existe posición abierta, Alpaca no responde

ACCIÓN INMEDIATA:
  1. Detener cálculo de nuevas entradas
  2. Mantener SL monitoring local (cada 10 segundos)
  3. Intentar reconectar a Alpaca
  4. Después de 3 intentos fallidos → Auto-liquidar

LIQUIDACIÓN FORZADA:
  • Si no se reconecta en 30 segundos: MARKET SELL
  • Precio: mejor precio disponible en el mercado
  • Logging: registrar pérdida, razón, timestamp

PROTECCIONES ACTIVAS:
  ✅ No abrir nuevas posiciones sin conexión
  ✅ SL sigue funcionando localmente
  ✅ Auto-close después de timeout
  ✅ Notificación de cierre de emergencia
  ✅ Reporte de incidente
```

---

## Validación Pre-Activación

| Requerimiento | ¿Listo? | Notas |
|---------------|--------|-------|
| Tabla de valores consolidada | ✅ | Arriba |
| Protocolo de pérdida de conexión | ✅ | Definido |
| ETHUSD recovery validada | ✅ | $2458.12 entry |
| Paper Trading verificado | ✅ | Endpoint paper-api |
| Logger activo | ✅ | Escribiendo |
| Learning engine listo | ✅ | Analítica activada |
| Código compilado | ✅ | Sin errores |
| Valores numéricos congelados | ✅ | Tabla de arriba |

---

## Status Actual

```
🔴 0DTE NO ACTIVADO
   Valores consolidados ✅
   Framework revisado ✅
   Protecciones definidas ✅
   Conexión loss protocolo ✅
   
   AWAITING EXPLICIT APPROVAL TO ACTIVATE
```

---

**Confirma estos valores o especifica ajustes antes de activar 0DTE.**
