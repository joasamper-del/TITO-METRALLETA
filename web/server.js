const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const http_proxy = require('http-proxy');

// Crear proxy para API calls
const apiProxy = http_proxy.createProxyServer({
  target: 'http://localhost:3001',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api'
  }
});

// Manejador de errores del proxy
apiProxy.on('error', (err, req, res) => {
  console.error('Proxy error:', err);
  res.writeHead(502, { 'Content-Type': 'text/html' });
  res.end('<h1>502 Bad Gateway - Backend no disponible</h1>');
});

// Handler para ambos servidores
const requestHandler = (req, res) => {
  // Proxy API requests
  if (req.url.startsWith('/api')) {
    apiProxy.web(req, res);
    return;
  }

  // Servir archivos estáticos
  let filePath = path.join(__dirname, req.url === '/' ? 'tito.html' : req.url);
  const ext = path.extname(filePath);
  let contentType = 'text/html';

  switch(ext) {
    case '.js':
      contentType = 'text/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.json':
      contentType = 'application/json';
      break;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 - Archivo no encontrado</h1>');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
};

// HTTP Server (respaldo en puerto 8080)
const httpServer = http.createServer(requestHandler);
httpServer.listen(8080, '0.0.0.0', () => {
  console.log('✅ HTTP Server en puerto 8080 (respaldo)');
  console.log('   http://localhost:8080');
  console.log('   http://10.0.0.13:8080');
});

// HTTPS Server (puerto 8443)
try {
  const options = {
    key: fs.readFileSync(path.join(__dirname, 'certs', 'server.key')),
    cert: fs.readFileSync(path.join(__dirname, 'certs', 'server.crt'))
  };

  const httpsServer = https.createServer(options, requestHandler);
  httpsServer.listen(8443, '0.0.0.0', () => {
    console.log('✅ HTTPS Server en puerto 8443 (producción)');
    console.log('   https://localhost:8443');
    console.log('   https://10.0.0.13:8443 (iPhone)');
    console.log('\n📝 API proxy activo: /api → localhost:3001');
    console.log('⚠️  HTTPS con certificado autofirmado (SAN: 10.0.0.13)');
  });
} catch (err) {
  console.error('❌ Error iniciando HTTPS server:', err.message);
  console.log('   Asegúrate de que existen los archivos:');
  console.log('   - ./certs/server.key');
  console.log('   - ./certs/server.crt');
}
