import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(testDirectory, '..');
const moduleRoot = path.resolve(serverRoot, '..');
const envModuleUrl = pathToFileURL(path.join(serverRoot, 'src', 'env.mjs')).href;

function probeConfig(overrides = {}, removals = []) {
  const environment = { ...process.env };
  for (const key of [
    'OTOTR_LOCAL_DEMO',
    'DEMO_MODE',
    'HOST',
    'PORT',
    'PUBLIC_BASE_URL',
    'X_BEARER_TOKEN',
    'ADMIN_API_TOKEN',
    ...removals,
  ]) {
    delete environment[key];
  }
  Object.assign(environment, overrides);

  const source = `
    import { getConfig } from ${JSON.stringify(envModuleUrl)};
    const config = getConfig();
    console.log(JSON.stringify({
      host: config.host,
      port: config.port,
      publicBaseUrl: config.publicBaseUrl,
      demoMode: config.demoMode,
      localDemo: config.localDemo,
      hasXToken: Boolean(config.xBearerToken),
      hasAdminToken: Boolean(config.adminApiToken)
    }));
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', source], {
    cwd: serverRoot,
    env: environment,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim());
}

test('Windows başlatıcı depo konumundan bağımsız ve tek tık akışını içerir', async () => {
  const [batch, powerShell] = await Promise.all([
    fs.readFile(path.join(moduleRoot, 'OTOTR_DEMO_BASLAT.bat'), 'utf8'),
    fs.readFile(path.join(moduleRoot, 'OTOTR_DEMO_BASLAT.ps1'), 'utf8'),
  ]);

  assert.match(batch, /cd \/d "%~dp0"/i);
  assert.match(batch, /OTOTR_DEMO_BASLAT\.ps1/i);
  assert.match(batch, /%\*/);
  assert.match(batch, /OTOTR_NO_PAUSE/i);

  assert.match(powerShell, /\$PSScriptRoot/);
  assert.match(powerShell, /Join-Path/);
  assert.match(powerShell, /Node\.js 20/);
  assert.match(powerShell, /npmCommand\.Source install --no-audit --no-fund/);
  assert.match(powerShell, /Copy-Item -LiteralPath \$envExamplePath -Destination \$envPath/);
  assert.match(powerShell, /\/api\/health/);
  assert.match(powerShell, /mainResponse/);
  assert.match(powerShell, /Start-Process/);
  assert.match(powerShell, /Get-PortOwner/);
  assert.match(powerShell, /ExitAfterHealth/);
  assert.match(powerShell, /OTOTR_LOCAL_DEMO/);
  assert.match(powerShell, /Start-Process \$Url/);

  assert.doesNotMatch(powerShell, /(?:X_BEARER_TOKEN|ADMIN_API_TOKEN)\s*=\s*['"][^'"]{8,}['"]/);
});

test('DEMO_MODE açıkken X anahtarı tanımlı olsa bile canlı X erişimi devre dışıdır', () => {
  const config = probeConfig({
    DEMO_MODE: 'true',
    X_BEARER_TOKEN: 'test-only-secret-that-must-not-be-used',
    HOST: '127.0.0.1',
    PORT: '8787',
  });

  assert.equal(config.demoMode, true);
  assert.equal(config.hasXToken, false);
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.port, 8787);
});

test('tek tık yerel demo loopback, dinamik URL ve parolasız yerel panel uygular', () => {
  const config = probeConfig({
    OTOTR_LOCAL_DEMO: '1',
    DEMO_MODE: 'false',
    HOST: '0.0.0.0',
    PORT: '8792',
    X_BEARER_TOKEN: 'test-only-x-token',
    ADMIN_API_TOKEN: 'test-only-admin-token',
  });

  assert.deepEqual(config, {
    host: '127.0.0.1',
    port: 8792,
    publicBaseUrl: 'http://127.0.0.1:8792',
    demoMode: true,
    localDemo: true,
    hasXToken: false,
    hasAdminToken: false,
  });
});

test('canlı mod yalnız DEMO_MODE=false ve X anahtarı birlikteyken etkinleşebilir', () => {
  const config = probeConfig({
    DEMO_MODE: 'false',
    X_BEARER_TOKEN: 'test-only-live-token',
    HOST: '127.0.0.1',
    PORT: '8787',
  });

  assert.equal(config.demoMode, false);
  assert.equal(config.hasXToken, true);
});

test('README loopback ile LAN erişimini açıkça ayırır ve doctor komutunu belgeler', async () => {
  const readme = await fs.readFile(path.join(moduleRoot, 'README.md'), 'utf8');
  assert.match(readme, /Windows'ta en kolay çalıştırma/);
  assert.match(readme, /127\.0\.0\.1.*aynı bilgisayar/is);
  assert.match(readme, /HOST=0\.0\.0\.0/);
  assert.match(readme, /ADMIN_API_TOKEN/);
  assert.match(readme, /npm run doctor/);
  assert.match(readme, /OTOTR_DEMO_BASLAT\.bat/);
});

test('doctor gizli değerleri rapora yazmaz', () => {
  const xSecret = 'x-secret-sentinel-never-print';
  const adminSecret = 'admin-secret-sentinel-never-print';
  const result = spawnSync(process.execPath, ['src/doctor.mjs'], {
    cwd: serverRoot,
    env: {
      ...process.env,
      DEMO_MODE: 'true',
      X_BEARER_TOKEN: xSecret,
      ADMIN_API_TOKEN: adminSecret,
      HOST: '127.0.0.1',
      PORT: '18787',
      PUBLIC_BASE_URL: 'http://127.0.0.1:18787',
    },
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, new RegExp(xSecret));
  assert.doesNotMatch(result.stdout, new RegExp(adminSecret));
  assert.match(result.stdout, /X_BEARER_TOKEN=tanımlı/);
  assert.match(result.stdout, /ADMIN_API_TOKEN=tanımlı/);
});
