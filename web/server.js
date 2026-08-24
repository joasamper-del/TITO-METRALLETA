const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;

const server = http.createServer((req, res) => {
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
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor web ejecutándose en http://0.0.0.0:${PORT}`);
  console.log(`Acceso local: http://localhost:${PORT}`);
  console.log(`Acceso desde red: http://10.0.0.13:${PORT} (iPhone)`);
});
