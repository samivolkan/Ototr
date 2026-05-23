const fs = require('fs');
const http = require('http');
const path = require('path');

const port = Number(process.env.PORT || 8787);
const root = path.resolve(__dirname, '..');

http
  .createServer((req, res) => {
    const requestedPath = req.url === '/' ? '/ototr-android-preview.html' : req.url;
    const safePath = decodeURIComponent(requestedPath.split('?')[0]);
    const filePath = path.join(root, safePath);

    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      res.writeHead(200, {
        'Content-Type': filePath.endsWith('.html')
          ? 'text/html; charset=utf-8'
          : 'text/plain; charset=utf-8',
      });
      res.end(data);
    });
  })
  .listen(port, '127.0.0.1', () => {
    console.log(`OTOTR preview: http://127.0.0.1:${port}/ototr-android-preview.html`);
  });
