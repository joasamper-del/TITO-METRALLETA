#!/bin/bash

# MarketSnack Cookie Test (SIN MOSTRAR COOKIE)
# Propósito: Verificar si la cookie existente en web/.env.local funciona contra MarketSnack API
# Patrón: Load de web/.env.local → Test de lectura → Clasificación por respuesta

set -a
source web/.env.local
set +a

echo "═══════════════════════════════════════════════════════════"
echo "MARKETSNACK COOKIE REAL TEST"
echo "═══════════════════════════════════════════════════════════"
echo "Cookie loaded from: web/.env.local ✓"
echo "Cookie length: ${#MARKETSNACK_COOKIE} bytes"
echo ""
echo "ENDPOINT: GET /api/flow_feed (lectura, sin modificación)"
echo "PARAMS: filter[scope]=all&period=1d&limit=1"
echo ""
echo "Ejecutando request..."
echo ""

# Test read-only contra MarketSnack Flow Feed
# Timeout 15s, follow redirects, verbose headers, sin exponer cookie en stderr
HTTP_CODE=$(curl -s -w "%{http_code}" \
  -H "Cookie: $MARKETSNACK_COOKIE" \
  -H "Content-Type: application/json" \
  -H "User-Agent: Bibliotecario/v1" \
  --max-time 15 \
  --connect-timeout 10 \
  "https://app.marketsnack.com/api/flow_feed?filter[scope]=all&period=1d&limit=1" \
  -o /tmp/marketsnack_response.json 2>&1)

# Separa status code
HTTP_STATUS="${HTTP_CODE: -3}"
RESPONSE=$(cat /tmp/marketsnack_response.json 2>/dev/null || echo "{}")

echo "HTTP Status: $HTTP_STATUS"
echo ""
echo "Response (first 500 chars):"
echo "$RESPONSE" | head -c 500
echo ""
echo ""

# Clasificación por evidencia
echo "═══════════════════════════════════════════════════════════"
echo "CLASIFICACIÓN POR EVIDENCIA"
echo "═══════════════════════════════════════════════════════════"

if [ "$HTTP_STATUS" = "200" ]; then
  # Verifica si la respuesta tiene datos reales
  if echo "$RESPONSE" | grep -q '"trades"' || echo "$RESPONSE" | grep -q '"data"'; then
    echo "🟢 GREEN — Sesión activa + datos recibidos correctamente"
    echo "   • Código HTTP 200 ✓"
    echo "   • Respuesta contiene estructura de datos ✓"
    echo "   • Autenticación: VÁLIDA"
    echo "   • Estado: CONECTADO Y FUNCIONANDO HOY"
    EXIT_CODE=0
  else
    echo "🟡 YELLOW — Autenticación válida pero respuesta vacía"
    echo "   • Código HTTP 200 ✓"
    echo "   • Pero estructura de datos incompleta"
    echo "   • Posible: sesión válida pero datos pendientes"
    EXIT_CODE=1
  fi
elif [ "$HTTP_STATUS" = "401" ]; then
  echo "🔴 RED — Cookie rechazada o expirada"
  echo "   • Código HTTP 401 Unauthorized"
  echo "   • Autenticación: INVÁLIDA"
  echo "   • Acción: Sesión requiere renovación"
  EXIT_CODE=2
elif [ "$HTTP_STATUS" = "403" ]; then
  echo "🔴 RED — Cookie válida pero acceso prohibido"
  echo "   • Código HTTP 403 Forbidden"
  echo "   • Posible: Cookie perdió permisos"
  EXIT_CODE=2
elif [ "$HTTP_STATUS" = "000" ]; then
  echo "⚪ GRAY — No se pudo establecer conexión"
  echo "   • No hay respuesta HTTP"
  echo "   • Posible: servidor no responde / DNS fail"
  EXIT_CODE=3
else
  echo "❓ DESCONOCIDO — Estado no clasificable"
  echo "   • Código HTTP: $HTTP_STATUS"
  echo "   • Revisar respuesta manualmente"
  EXIT_CODE=4
fi

echo ""
echo "═══════════════════════════════════════════════════════════"

exit $EXIT_CODE
