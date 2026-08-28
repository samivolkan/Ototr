import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getConfig } from './env.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');
const moduleRoot = path.resolve(serverRoot, '..');
const config = getConfig();

const results = [];
let hasCriticalFailure = false;

function addResult(level, label, detail, critical = false) {
  results.push({ level, label, detail });
  if (level === 'HATA' && critical) hasCriticalFailure = true;
}

function commandVersion(command, args = ['--version']) {
  try {
    return execFileSync(command, args, {
      cwd: serverRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5_000,
      windowsHide: true,
    }).trim();
  } catch {
    return null;
  }
}

function readEnvKeyState(filePath) {
  const state = new Map();
  if (!fs.existsSync(filePath)) return state;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
    state.set(key, value.length > 0);
  }
  return state;
}

function secretIsDefined(key, fileState) {
  return Boolean(process.env[key]) || fileState.get(key) === true;
}

function checkPort(host, port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.unref();
    probe.once('error', (error) => {
      resolve({ available: false, code: error.code || 'UNKNOWN', message: error.message });
    });
    probe.listen({ host, port, exclusive: true }, () => {
      probe.close(() => resolve({ available: true, code: null, message: null }));
    });
  });
}

function getWindowsPortOwner(port) {
  if (process.platform !== 'win32') return null;
  try {
    const output = execFileSync('netstat.exe', ['-ano', '-p', 'tcp'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 5_000,
      windowsHide: true,
    });
    const line = output
      .split(/\r?\n/)
      .find((entry) => entry.includes('LISTENING') && new RegExp(`(?:\\]|:|\\.)${port}\\s`).test(`${entry} `));
    const match = line?.match(/LISTENING\s+(\d+)\s*$/i);
    if (!match) return null;
    const pid = Number(match[1]);
    let processName = 'bilinmiyor';
    try {
      const task = execFileSync(
        'tasklist.exe',
        ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'],
        {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
          timeout: 5_000,
          windowsHide: true,
        },
      ).trim();
      const nameMatch = task.match(/^"([^"]+)"/);
      if (nameMatch) processName = nameMatch[1];
    } catch {
      // PID bilgisi tek başına da tanı için yeterlidir.
    }
    return { pid, processName };
  } catch {
    return null;
  }
}

async function checkHealth(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/api/health`, {
      signal: AbortSignal.timeout(2_500),
      headers: { Accept: 'application/json' },
    });
    const body = await response.json().catch(() => null);
    return {
      ok: response.status === 200 && body?.ok === true && body?.data?.status === 'ok',
      status: response.status,
      service: body?.data?.service || null,
      mode: body?.data?.mode || null,
    };
  } catch (error) {
    return { ok: false, status: null, service: null, mode: null, error: error.message };
  }
}

async function checkMainHtml(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/`, {
      signal: AbortSignal.timeout(2_500),
      headers: { Accept: 'text/html' },
    });
    return { ok: response.status === 200, status: response.status };
  } catch (error) {
    return { ok: false, status: null, error: error.message };
  }
}

async function run() {
  const envPath = path.join(serverRoot, '.env');
  const envExamplePath = path.join(serverRoot, '.env.example');
  const envState = readEnvKeyState(envPath);
  const nodeMajor = Number.parseInt(process.versions.node.split('.')[0], 10);
  const healthHost = ['0.0.0.0', '::'].includes(config.host) ? '127.0.0.1' : config.host;
  const baseUrl = `http://${healthHost}:${config.port}`;

  addResult(
    nodeMajor >= 20 ? 'OK' : 'HATA',
    'Node.js',
    `${process.version} (${process.execPath})`,
    true,
  );

  const npmVersion = process.env.npm_execpath
    ? commandVersion(process.execPath, [process.env.npm_execpath, '--version'])
    : process.platform === 'win32'
      ? commandVersion('cmd.exe', ['/d', '/s', '/c', 'npm.cmd --version'])
      : commandVersion('npm');
  addResult(
    npmVersion ? 'OK' : 'HATA',
    'npm',
    npmVersion ? `v${npmVersion}` : 'npm komutu bulunamadı.',
    true,
  );

  addResult(
    'OK',
    'İşletim sistemi',
    `${os.type()} ${os.release()} / ${os.arch()} / platform=${process.platform}`,
  );
  addResult('OK', 'Çalışma dizini', process.cwd());
  addResult('OK', 'Sunucu dizini', serverRoot);
  addResult('OK', 'Modül dizini', moduleRoot);

  if (fs.existsSync(envPath)) {
    addResult('OK', '.env', 'Mevcut. Gizli değerler raporda gösterilmedi.');
  } else if (fs.existsSync(envExamplePath)) {
    addResult('UYARI', '.env', 'Yok. OTOTR_DEMO_BASLAT.bat ilk çalıştırmada .env.example üzerinden oluşturur.');
  } else {
    addResult('HATA', '.env', '.env ve .env.example bulunamadı.', true);
  }

  addResult(
    'BİLGİ',
    'Gizli ayar durumu',
    `X_BEARER_TOKEN=${secretIsDefined('X_BEARER_TOKEN', envState) ? 'tanımlı' : 'tanımsız'}, `
      + `ADMIN_API_TOKEN=${secretIsDefined('ADMIN_API_TOKEN', envState) ? 'tanımlı' : 'tanımsız'}; değerler gösterilmedi.`,
  );
  addResult(
    'OK',
    'Etkin yerel ayarlar',
    `HOST=${config.host}, PORT=${config.port}, DEMO_MODE=${config.demoMode}, OTOTR_LOCAL_DEMO=${config.localDemo}`,
  );

  const nodeModulesPath = path.join(serverRoot, 'node_modules');
  const tesseractPath = path.join(nodeModulesPath, 'tesseract.js', 'package.json');
  if (fs.existsSync(tesseractPath)) {
    addResult('OK', 'Bağımlılıklar', 'node_modules ve tesseract.js mevcut.');
  } else if (fs.existsSync(nodeModulesPath)) {
    addResult('UYARI', 'Bağımlılıklar', 'node_modules mevcut fakat tesseract.js eksik; npm install çalıştırın.');
  } else {
    addResult('UYARI', 'Bağımlılıklar', 'node_modules yok; tek tık başlatıcı npm install çalıştırır.');
  }

  const staticFiles = ['index.html', 'styles.css', 'app.js', 'core.mjs'];
  const missingStatic = staticFiles.filter((fileName) => !fs.existsSync(path.join(moduleRoot, fileName)));
  addResult(
    missingStatic.length === 0 ? 'OK' : 'HATA',
    'Statik dosyalar',
    missingStatic.length === 0 ? staticFiles.join(', ') : `Eksik: ${missingStatic.join(', ')}`,
    true,
  );

  const dataDirectory = path.join(serverRoot, 'data');
  const writeProbe = path.join(dataDirectory, `.doctor-write-${process.pid}-${Date.now()}.tmp`);
  try {
    await fsp.mkdir(dataDirectory, { recursive: true });
    await fsp.writeFile(writeProbe, 'ok', 'utf8');
    await fsp.unlink(writeProbe);
    addResult('OK', 'Yazma izni', `${dataDirectory} yazılabilir.`);
  } catch (error) {
    await fsp.unlink(writeProbe).catch(() => undefined);
    addResult('HATA', 'Yazma izni', `${dataDirectory}: ${error.message}`, true);
  }

  const port = await checkPort(config.host, config.port);
  if (port.available) {
    addResult('OK', 'Port kullanımı', `${config.host}:${config.port} boş.`);
  } else if (port.code === 'EADDRINUSE') {
    const owner = getWindowsPortOwner(config.port);
    addResult(
      'UYARI',
      'Port kullanımı',
      owner
        ? `${config.host}:${config.port} dolu; PID=${owner.pid}, proses=${owner.processName}.`
        : `${config.host}:${config.port} dolu; proses bilgisi alınamadı.`,
    );
  } else {
    addResult('HATA', 'Port kullanımı', `${config.host}:${config.port} dinlenemiyor: ${port.code} ${port.message}`, true);
  }

  const health = await checkHealth(baseUrl);
  if (health.ok) {
    addResult('OK', 'Health', `${baseUrl}/api/health -> HTTP ${health.status}, servis=${health.service}, mod=${health.mode}`);
    const main = await checkMainHtml(baseUrl);
    addResult(
      main.ok ? 'OK' : 'HATA',
      'Ana HTML',
      main.ok ? `${baseUrl}/ -> HTTP ${main.status}` : `${baseUrl}/ yanıt vermedi: ${main.status ?? main.error}`,
      main.ok === false,
    );
  } else {
    addResult(
      'UYARI',
      'Health',
      `${baseUrl}/api/health erişilemiyor${health.status ? ` (HTTP ${health.status})` : ''}. Sunucu henüz çalışmıyor olabilir.`,
    );
  }

  console.log('');
  console.log('OtoTR X Kaza Monitor — Yerel Çalıştırma Tanısı');
  console.log('================================================');
  console.log(`Tarih: ${new Date().toISOString()}`);
  console.log('Gizli anahtar değerleri bilinçli olarak rapora yazılmaz.');
  console.log('');
  for (const item of results) {
    console.log(`[${item.level}] ${item.label}: ${item.detail}`);
  }
  console.log('');
  console.log(hasCriticalFailure ? 'Sonuç: Kritik hata bulundu.' : 'Sonuç: Kritik hata bulunmadı.');
  process.exitCode = hasCriticalFailure ? 1 : 0;
}

await run();
