const http = require('http');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { createManifestZip } = require('./lib/manifest');

dotenv.config({
  path: process.env.SCOUT_ENV_FILE || path.join(__dirname, '.env'),
  quiet: true,
});

const appDir = __dirname;
const relayPort = parsePort('SCOUT_HTTP_PORT', 3978);
const uiPort = parsePort('SCOUT_UI_PORT', 9090);
const uiHost = process.env.SCOUT_UI_HOST?.trim() || '127.0.0.1';

const MIME = {
  '.html': 'text/html',
  '.json': 'application/json',
  '.png':  'image/png',
  '.js':   'text/javascript',
  '.css':  'text/css',
  '.zip':  'application/zip',
};

function proxyRelay(req, res) {
  const requestUrl = new URL(req.url, 'http://localhost');
  const options = {
    hostname: 'localhost',
    port: relayPort,
    path: requestUrl.pathname.slice('/relay'.length) + requestUrl.search,
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

function parsePort(name, fallback) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }
  return value;
}

http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${uiHost}:${uiPort}`);
  if (requestUrl.pathname.startsWith('/relay/')) return proxyRelay(req, res);

  if (requestUrl.pathname === '/manifest.zip') {
    try {
      const zip = createManifestZip({
        botAppId: process.env.SCOUT_BOT_APP_ID?.trim() || '',
        relayWsUrl: process.env.SCOUT_RELAY_WS_URL?.trim() || '',
        manifestDir: path.join(appDir, 'teams-manifest'),
      });
      const buffer = zip.toBuffer();
      res.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="scout-teams-bot.zip"',
        'Content-Length': buffer.length,
      });
      res.end(buffer);
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  const urlPath = requestUrl.pathname === '/' ? '/ui/index.html' : requestUrl.pathname;
  const fp = path.resolve(appDir, `.${decodeURIComponent(urlPath)}`);
  if (!fp.startsWith(`${appDir}${path.sep}`)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
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
}).listen(uiPort, uiHost, () => console.log(`UI+proxy server on http://${uiHost}:${uiPort}`));
