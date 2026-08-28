import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverRoot = path.resolve(__dirname, '..');

export function loadEnvFile(filePath = path.join(serverRoot, '.env')) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separator = trimmed.indexOf('=');
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function asBoolean(value, fallback = false) {
  if (value == null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function asInteger(value, fallback, minimum, maximum) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.min(maximum, parsed));
}

export function getConfig() {
  loadEnvFile();
  return Object.freeze({
    host: process.env.HOST || '127.0.0.1',
    port: asInteger(process.env.PORT, 8787, 1, 65535),
    publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:8787',
    adminApiToken: process.env.ADMIN_API_TOKEN || '',
    allowInsecureRemote: asBoolean(process.env.ALLOW_INSECURE_REMOTE, false),
    xBearerToken: process.env.X_BEARER_TOKEN || '',
    xRecentSearchUrl: process.env.X_RECENT_SEARCH_URL || 'https://api.x.com/2/tweets/search/recent',
    xAllSearchUrl: process.env.X_ALL_SEARCH_URL || 'https://api.x.com/2/tweets/search/all',
    xPostLookupUrl: process.env.X_POST_LOOKUP_URL || 'https://api.x.com/2/tweets',
    storeMedia: asBoolean(process.env.STORE_MEDIA, false),
    mediaRetentionDays: asInteger(process.env.MEDIA_RETENTION_DAYS, 7, 1, 365),
    maxPostsPerScan: asInteger(process.env.MAX_POSTS_PER_SCAN, 100, 10, 1000),
    maxImageBytes: asInteger(process.env.MAX_IMAGE_BYTES, 12 * 1024 * 1024, 1024, 50 * 1024 * 1024),
    ocrMinConfidence: asInteger(process.env.OCR_MIN_CONFIDENCE, 35, 0, 100),
    demoMode: asBoolean(process.env.DEMO_MODE, true),
    dataFile: process.env.DATA_FILE || path.join(serverRoot, 'data', 'store.json'),
    staticRoot: path.resolve(serverRoot, '..'),
    mediaHostAllowlist: new Set(
      (process.env.MEDIA_HOST_ALLOWLIST || 'pbs.twimg.com,video.twimg.com,abs.twimg.com,ton.twimg.com')
        .split(',')
        .map((host) => host.trim().toLowerCase())
        .filter(Boolean),
    ),
  });
}
