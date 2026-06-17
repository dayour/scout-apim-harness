const http = require('http');
const fs = require('fs');
const path = require('path');
const appDir = 'C:\\Users\\AntonTimelarp\\scout-apim';

const MIME = {
  '.html': 'text/html',
  '.json': 'application/json',
  '.png':  'image/png',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.zip':  'application/zip',
};

function proxyRelay(req, res) {
  const options = {
    hostname: 'localhost', port: 3978,
    path: req.url.replace('/relay', ''),
    method: req.method
  };
  const relayReq = http.request(options, (relayRes) => {
    res.writeHead(relayRes.statusCode, Object.assign({}, relayRes.headers, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    }));
    relayRes.pipe(res);
  });
  relayReq.on('error', () => {
    res.writeHead(503, {'Content-Type':'application/json','Access-Control-Allow-Origin':'*'});
    res.end(JSON.stringify({ok:false,error:'relay offline'}));
  });
  relayReq.end();
}

http.createServer((req, res) => {
  if (req.url.startsWith('/relay/')) return proxyRelay(req, res);
  const urlPath = req.url === '/' ? '/ui/index.html' : req.url;
  const fp = path.join(appDir, urlPath);
  if (fs.existsSync(fp) && !fs.statSync(fp).isDirectory()) {
    const ext = path.extname(fp).toLowerCase();
    const ct = MIME[ext] || 'application/octet-stream';
    const headers = { 'Content-Type': ct };
    if (ext === '.zip') {
      headers['Content-Disposition'] = `attachment; filename="${path.basename(fp)}"`;
    }
    res.writeHead(200, headers);
    fs.createReadStream(fp).pipe(res);
  } else {
    res.writeHead(404); res.end('Not found: ' + urlPath);
  }
}).listen(9090, '0.0.0.0', () => console.log('UI+proxy server on :9090'));
