# Conclusión Ejecutiva — módulo 0DTE

> **Obligatoria después de todo análisis de flujo de opciones.** Va justo después del
> Options Flow Scorecard (Agresividad · Convicción · Inusualidad · Estructura · Contexto IV ·
> Confirmación de Precio). Sintetiza el flujo crudo en una decisión accionable.
>
> *"No es consejo financiero. Solo análisis inteligente."*

## Los 5 bloques (en orden)

### 1. Sesgo
Direccional del flujo: **alcista · bajista · neutral**. Una frase con el porqué
(dónde pega el dinero: calls al ask / puts al ask / mixto).

### 2. Niveles clave
- Soportes y resistencias del subyacente.
- **Walls de GEX** (gamma) y strikes de convicción del flujo.
- Nivel de invalidación del sesgo.

### 3. Escenarios más probables
2–3 escenarios, cada uno con su **condición de activación** explícita:
- Escenario A (base) — condición → reacción esperada.
- Escenario B (alterno) — condición → reacción esperada.
- Escenario C (cola/riesgo) — condición → reacción esperada.

### 4. Plan de acción
- **Gatillo de entrada** (nivel/confirmación).
- **Invalidación** (dónde muere la tesis → salir).
- **Objetivos** como **rango, nunca un precio único** (pasado sólido / futuro punteado en el visual).

### 5. Confianza
**Alta · Media · Baja** — separada del score. Un puntaje alto con **evento binario**
(earnings, Fed) o **flujo mixto** lleva confianza baja, y la confianza baja puede anular el trade.

## Formato del recuadro final
```
─────────────────────────
CONCLUSIÓN EJECUTIVA — <TICKER> (0DTE)
Sesgo:        <alcista | bajista | neutral>
Niveles:      <soportes / resistencias / walls GEX / strikes clave>
Escenarios:   A <cond→efecto> · B <cond→efecto> · C <cond→efecto>
Plan:         entrada <gatillo> · invalidación <nivel> · objetivo <rango>
Confianza:    <Alta | Media | Baja> (motivo)
─────────────────────────
```
Si el flujo no da una tesis clara → escribir **`HOY NO HAY TRADE`** con el motivo concreto.

**Convención de colores** (categoría del scorecard sobre su máximo): 🟢 alto (≥75%) ·
🟡 precaución (40–74% / advertencias) · 🔴 **solo** criterio fallido o problema real (<40% / invalidación).
Categoría sin datos, ej. Agresividad sin bid/ask (NOT_SCORABLE) → ⚪. No usar rojo para precaución.

## Resumen ejecutivo de una sola vista (capstone — glance <10s)
**Después de la tabla (scorecard) y el gráfico**, cerrar SIEMPRE con este bloque, legible en <10s:
```
👁️ RESUMEN EJECUTIVO (1 vista) — <TICKER>
Sesgo:        <🟢 Alcista | 🔴 Bajista | 🟡 Neutral>
Razón:        <la principal, 1 línea>
Imán:         <nivel imán / max pain-GEX>
Resistencia:  <nivel>
Soporte:      <nivel>
Escenario:    <el más probable, 1 línea>
Plan:         <acción concreta>
Confianza:    <🟢 Alta | 🟡 Media | 🔴 Baja>
```
Orden de salida: scorecard → conclusión ejecutiva → gráfico → resumen ejecutivo 1 vista.

**Gráfico:** franja de acción arriba (COMPRAR verde · ESPERAR ámbar · NO OPERAR gris · CERRAR POSICIÓN rojo)
y recuadro corto abajo (Confianza en % · Razón principal · Qué la invalida · Cuándo revisar).
Confianza: Baja 20–40% · Media 45–65% · Alta 70–90%.

*Toda ejecución la hace el usuario manualmente. "No es consejo financiero. Solo análisis inteligente."*
