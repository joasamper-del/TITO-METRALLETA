const fs = require('fs');
const path = require('path');

console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║   MARKETSNACK — VALIDACIÓN v2 (backend/.env.local)        ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

// Cargar cookie
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const cookieMatch = envContent.match(/^MARKETSNACK_COOKIE=(.+)$/m);

if (!cookieMatch || !cookieMatch[1].trim()) {
  console.error('❌ Cookie vacía o no encontrada');
  process.exit(1);
}

const cookie = cookieMatch[1].trim();
console.log('✅ Cookie cargada: backend/.env.local');
console.log(`   Tamaño: ${cookie.length} bytes`);
console.log('');
console.log('Enviando validación con headers adicionales...');
console.log('');

const url = 'https://app.marketsnack.com/api/flow_feed?filter[scope]=all&period=1d&limit=1';

(async () => {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cookie': cookie,
        'User-Agent': 'Bibliotecario-v1/HealthCheck',
        'Referer': 'https://app.marketsnack.com/',
        'Origin': 'https://app.marketsnack.com'
      },
      redirect: 'manual',
      timeout: 15000
    });

    const body = await res.text();
    console.log(`HTTP ${res.status}`);
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');

    if (res.status === 200) {
      try {
        const json = JSON.parse(body);
        if (Array.isArray(json.list) && json.list.length > 0) {
          console.log('🟢 GREEN — ¡VALIDACIÓN EXITOSA!');
          console.log('   ✅ Cookie funcional');
          process.exit(0);
        } else {
          console.log('🟡 YELLOW — Auth OK pero sin datos');
          console.log('   (Reintentar con period=5d)');
          process.exit(1);
        }
      } catch {
        console.log('🟡 YELLOW — Status 200 pero respuesta inválida');
        process.exit(1);
      }
    } else if (res.status === 401) {
      console.log('🔴 RED — UNAUTHORIZED');
      console.log('   ❌ Cookie rechazada/expirada/inválida');
      console.log('');
      console.log('VERIFICAR:');
      console.log('  1. ¿Sesión expiró desde que la copiaste?');
      console.log('  2. ¿Se pegó COMPLETA (con todos los ; )?');
      console.log('  3. ¿Algún carácter se cortó?');
      process.exit(2);
    } else {
      console.log(`❓ HTTP ${res.status}`);
      process.exit(4);
    }
  } catch (err) {
    console.log('⚪ GRAY — Network error');
    process.exit(3);
  }
})();
