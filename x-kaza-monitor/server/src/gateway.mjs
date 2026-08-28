import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { getConfig } from './env.mjs';
import { JsonStore } from './store.mjs';
import { createTrtHaberSource, TRT_HABER_SOURCE_CONFIG } from './sources/trt-haber-source.mjs';
import { scanNewsSource } from './news-pipeline.mjs';
import { closeOcrWorker } from './ocr.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');
const staticRoot = path.resolve(serverRoot, '..');
const config = getConfig();
const publicPort = config.port;
const internalPort = publicPort + 1;
const publicHost = config.host;
const internalBase = `http://127.0.0.1:${internalPort}`;
const store = await new JsonStore(config.dataFile).init();
let child = null;
let childStarting = null;
let newsScanRunning = false;

function nowIso() { return new Date().toISOString(); }

async function ensureSourceSeed() {
  if (store.getSource('trt-haber')) return;
  const now = nowIso();
  await store.upsertSource({
    ...TRT_HABER_SOURCE_CONFIG,
    lastScanAt: null,
    lastSuccessfulScanAt: null,
    lastError: null,
    totalArticlesFound: 0,
    totalImagesScanned: 0,
    totalPlateCandidates: 0,
    createdAt: now,
    updatedAt: now,
  });
}
await ensureSourceSeed();

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

function requireAdmin(req) {
  if (!config.adminApiToken) return true;
  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  return Boolean(token) && safeEqual(token, config.adminApiToken);
}

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

async function readJson(req, max = 256 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > max) throw new Error('İstek gövdesi çok büyük.');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function waitForLegacy(timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const r = await fetch(`${internalBase}/api/health`, { signal: AbortSignal.timeout(1200) });
      if (r.ok) return true;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('İç OtoTR sunucusu başlatılamadı.');
}

async function startLegacy() {
  if (childStarting) return childStarting;
  childStarting = (async () => {
    if (child && !child.killed) return;
    child = spawn(process.execPath, [path.join(__dirname, 'server.mjs')], {
      cwd: serverRoot,
      env: {
        ...process.env,
        HOST: '127.0.0.1',
        PORT: String(internalPort),
        PUBLIC_BASE_URL: internalBase,
      },
      stdio: ['ignore', 'inherit', 'inherit'],
      windowsHide: true,
    });
    child.on('exit', () => { child = null; });
    await waitForLegacy();
  })().finally(() => { childStarting = null; });
  return childStarting;
}

async function stopLegacy() {
  if (!child || child.killed) return;
  const proc = child;
  child = null;
  proc.kill('SIGTERM');
  await new Promise((resolve) => {
    const timer = setTimeout(() => { try { proc.kill('SIGKILL'); } catch {} resolve(); }, 2500);
    proc.once('exit', () => { clearTimeout(timer); resolve(); });
  });
}

async function restartLegacy() {
  await stopLegacy();
  await startLegacy();
}

function sourceSummary(source) {
  const articles = store.listArticles({ sourceId: source.id });
  const candidates = store.listCandidates().filter((c) => c.sourceId === source.id || c.sourcePlatform === 'NEWS');
  return {
    ...source,
    currentArticles: articles.length,
    currentCandidates: candidates.length,
    pendingCandidates: candidates.filter((c) => c.status === 'review_pending').length,
    approvedCandidates: candidates.filter((c) => ['approved_internal', 'approved_customer'].includes(c.status)).length,
    scanRunning: source.id === 'trt-haber' && newsScanRunning,
  };
}

async function runTrtScan() {
  if (newsScanRunning) {
    const error = new Error('TRT Haber taraması zaten çalışıyor.');
    error.status = 409;
    throw error;
  }
  const sourceState = store.getSource('trt-haber');
  if (!sourceState || sourceState.enabled === false) {
    const error = new Error('TRT Haber kaynağı pasif.');
    error.status = 409;
    throw error;
  }
  newsScanRunning = true;
  try {
    const source = createTrtHaberSource(sourceState);
    const result = await scanNewsSource({
      source,
      store,
      maximumImageBytes: config.maxImageBytes,
      ocrMinimumConfidence: config.ocrMinConfidence,
      trigger: 'panel',
    });
    await restartLegacy();
    return result;
  } finally {
    newsScanRunning = false;
    await closeOcrWorker().catch(() => undefined);
  }
}

async function serveSourceAsset(res, filename, contentType) {
  const body = await fs.readFile(path.join(staticRoot, filename));
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': body.length,
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'",
  });
  res.end(body);
}

async function proxy(req, res, url) {
  const target = new URL(url.pathname + url.search, internalBase);
  const headers = { ...req.headers, host: `127.0.0.1:${internalPort}` };
  delete headers['content-length'];
  const init = { method: req.method, headers, redirect: 'manual' };
  if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    init.body = Buffer.concat(chunks);
  }
  const upstream = await fetch(target, init);
  let body = Buffer.from(await upstream.arrayBuffer());
  const responseHeaders = Object.fromEntries(upstream.headers.entries());
  delete responseHeaders['content-encoding'];
  delete responseHeaders['transfer-encoding'];
  if ((url.pathname === '/' || url.pathname === '/index.html') && upstream.ok) {
    let html = body.toString('utf8');
    if (!html.includes('href="/sources"')) {
      html = html.replace('</nav>', '<a class="nav-item" href="/sources"><span class="nav-icon" aria-hidden="true">◎</span><span>Kaynaklar</span></a></nav>');
    }
    body = Buffer.from(html);
    responseHeaders['content-length'] = String(body.length);
  } else {
    responseHeaders['content-length'] = String(body.length);
  }
  res.writeHead(upstream.status, responseHeaders);
  res.end(body);
}

await startLegacy();

const gateway = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${publicHost}:${publicPort}`);

    if (req.method === 'GET' && (url.pathname === '/sources' || url.pathname === '/sources.html')) {
      return serveSourceAsset(res, 'sources.html', 'text/html; charset=utf-8');
    }
    if (req.method === 'GET' && url.pathname === '/sources.js') {
      return serveSourceAsset(res, 'sources.js', 'text/javascript; charset=utf-8');
    }

    if (url.pathname.startsWith('/api/sources') || url.pathname === '/api/articles') {
      if (!requireAdmin(req)) return sendJson(res, 401, { ok: false, error: { code: 'API_AUTH_REQUIRED', message: 'Yönetim API anahtarı gerekli.' } });

      if (req.method === 'GET' && url.pathname === '/api/sources') {
        return sendJson(res, 200, { ok: true, data: store.listSources().map(sourceSummary) });
      }
      if (req.method === 'GET' && url.pathname === '/api/articles') {
        const sourceId = url.searchParams.get('source') || null;
        return sendJson(res, 200, { ok: true, data: store.listArticles({ sourceId }).slice(0, 200) });
      }
      const match = url.pathname.match(/^\/api\/sources\/([^/]+)$/);
      if (match && req.method === 'PATCH') {
        const id = decodeURIComponent(match[1]);
        const existing = store.getSource(id);
        if (!existing) return sendJson(res, 404, { ok: false, error: { code: 'SOURCE_NOT_FOUND', message: 'Kaynak bulunamadı.' } });
        const body = await readJson(req);
        const updated = await store.upsertSource({ ...existing, enabled: body.enabled ?? existing.enabled, updatedAt: nowIso() });
        await restartLegacy();
        return sendJson(res, 200, { ok: true, data: sourceSummary(updated) });
      }
      const scanMatch = url.pathname.match(/^\/api\/sources\/([^/]+)\/scan$/);
      if (scanMatch && req.method === 'POST') {
        const id = decodeURIComponent(scanMatch[1]);
        if (id !== 'trt-haber') return sendJson(res, 400, { ok: false, error: { code: 'SOURCE_SCAN_UNSUPPORTED', message: 'Bu kaynak için panel taraması henüz desteklenmiyor.' } });
        const result = await runTrtScan();
        return sendJson(res, 200, { ok: true, data: result });
      }
      return sendJson(res, 404, { ok: false, error: { code: 'SOURCE_API_NOT_FOUND', message: 'Kaynak API yolu bulunamadı.' } });
    }

    return proxy(req, res, url);
  } catch (error) {
    console.error('[gateway]', error);
    return sendJson(res, error.status || 500, { ok: false, error: { code: error.code || 'GATEWAY_ERROR', message: error.message || 'Gateway işlemi başarısız.' } });
  }
});

gateway.listen(publicPort, publicHost, () => {
  console.log(`OtoTR Kaynak Gateway: http://${publicHost}:${publicPort}`);
  console.log(`İç panel sunucusu: ${internalBase}`);
});

async function shutdown(signal) {
  console.log(`\n${signal} alındı, gateway kapatılıyor...`);
  gateway.close();
  await stopLegacy();
  await closeOcrWorker().catch(() => undefined);
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
