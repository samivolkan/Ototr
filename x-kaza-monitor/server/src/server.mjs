import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildXQuery,
  canApproveCandidate,
  createId,
  formatPlate,
  isValidTurkishPlate,
  normalizeDateTime,
  normalizePlate,
} from '../../core.mjs';
import { getConfig } from './env.mjs';
import { JsonStore } from './store.mjs';
import {
  XApiError,
  fetchXImageBuffer,
  lookupXPosts,
  searchXPosts,
} from './x-api.mjs';
import { closeOcrWorker, recognizePlateCandidates } from './ocr.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const config = getConfig();
const loopbackHosts = new Set(['127.0.0.1', '::1', 'localhost']);
if (!loopbackHosts.has(config.host) && !config.adminApiToken && !config.allowInsecureRemote) {
  throw new Error('Uzak ağ dinlemesi için ADMIN_API_TOKEN tanımlayın veya bilinçli olarak ALLOW_INSECURE_REMOTE=true kullanın.');
}
const store = await new JsonStore(config.dataFile).init();
const runningScans = new Set();

function nowIso() {
  return new Date().toISOString();
}

function demoImageDataUrl(plate, caption) {
  const safePlate = String(plate).replace(/[<>&"']/g, '');
  const safeCaption = String(caption).replace(/[<>&"']/g, '');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#20242a"/><stop offset="1" stop-color="#61666d"/></linearGradient></defs>
      <rect width="960" height="540" fill="url(#g)"/>
      <path d="M165 360 L230 245 Q250 215 300 210 H675 Q720 215 742 250 L800 360 Z" fill="#343a40" stroke="#e9ecef" stroke-width="5"/>
      <path d="M275 245 H650 Q682 246 699 275 L718 315 H245 L266 270 Q271 252 275 245" fill="#a7b0ba" opacity=".55"/>
      <circle cx="285" cy="375" r="67" fill="#151719" stroke="#9299a1" stroke-width="14"/><circle cx="690" cy="375" r="67" fill="#151719" stroke="#9299a1" stroke-width="14"/>
      <path d="M735 256 l76 -52 25 18-55 73z" fill="#a30d16"/><path d="M700 215 l48 -70 32 13-22 88z" fill="#bd1923"/>
      <rect x="384" y="336" width="210" height="65" rx="8" fill="white" stroke="#111" stroke-width="4"/>
      <rect x="384" y="336" width="30" height="65" rx="5" fill="#204c9e"/>
      <text x="426" y="381" font-family="Arial, sans-serif" font-size="38" font-weight="700" fill="#111">${safePlate}</text>
      <rect x="20" y="20" width="270" height="44" rx="22" fill="#c51924"/><text x="43" y="50" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="white">SENTETİK DEMO GÖRSELİ</text>
      <text x="480" y="495" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" fill="white">${safeCaption}</text>
    </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

await store.seedDemo({
  rules: [
    {
      id: 'rule_demo_bursa',
      name: 'Bursa trafik kazaları — demo',
      terms: ['kaza', 'kazalı', 'trafik kazası', 'çarpıştı', 'takla attı'],
      excludedTerms: ['oyun', 'film', 'reklam'],
      locations: ['Bursa', 'Nilüfer', 'Osmangazi', 'İnegöl'],
      mediaType: 'image',
      language: 'tr',
      mode: 'recent',
      active: false,
      intervalMinutes: 60,
      maxPosts: 50,
      query: '(kaza OR kazalı OR "trafik kazası" OR "çarpıştı" OR "takla attı") (Bursa OR Nilüfer OR Osmangazi OR İnegöl) has:images lang:tr -is:retweet -oyun -film -reklam',
      createdAt: nowIso(),
      updatedAt: nowIso(),
      lastRunAt: null,
      nextRunAt: null,
      demo: true,
    },
  ],
  candidates: [
    {
      id: 'candidate_demo_pending',
      postId: 'demo-post-001',
      mediaKey: 'demo-media-001',
      sourcePlatform: 'X',
      sourceUrl: null,
      sourceAvailable: true,
      author: { name: 'Demo Kaynak', username: 'demo' },
      postText: 'Bursa çevre yolunda maddi hasarlı trafik kazası — sentetik demo kaydı.',
      postedAt: '2026-08-20T09:15:00.000Z',
      imageUrl: demoImageDataUrl('16 OTR 26', 'İnsan onayı bekleyen OCR adayı'),
      mediaType: 'photo',
      ocrText: '16 OTR 26',
      ocrConfidence: 92,
      ocrLowConfidence: false,
      plateCandidates: [{ plate: '16 OTR 26', normalized: '16OTR26', confidence: 92 }],
      selectedPlate: '16 OTR 26',
      selectedPlateNormalized: '16OTR26',
      status: 'review_pending',
      review: null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      demo: true,
    },
    {
      id: 'candidate_demo_internal',
      postId: 'demo-post-002',
      mediaKey: 'demo-media-002',
      sourcePlatform: 'X',
      sourceUrl: null,
      sourceAvailable: true,
      author: { name: 'Demo Kaynak', username: 'demo' },
      postText: 'İstanbul yönünde iki araçlı kaza — sentetik demo kaydı.',
      postedAt: '2026-07-12T16:45:00.000Z',
      imageUrl: demoImageDataUrl('34 DEM 123', 'Usta kullanımına onaylı demo kaydı'),
      mediaType: 'photo',
      ocrText: '34 DEM 123',
      ocrConfidence: 88,
      ocrLowConfidence: false,
      plateCandidates: [{ plate: '34 DEM 123', normalized: '34DEM123', confidence: 88 }],
      selectedPlate: '34 DEM 123',
      selectedPlateNormalized: '34DEM123',
      status: 'approved_internal',
      review: {
        reviewer: 'Demo Moderatör',
        reviewedAt: nowIso(),
        plateFullyVisible: true,
        belongsToDamagedVehicle: true,
        accidentContextConfirmed: true,
        customerDisplayAuthorized: false,
      },
      createdAt: nowIso(),
      updatedAt: nowIso(),
      demo: true,
    },
    {
      id: 'candidate_demo_customer',
      postId: 'demo-post-003',
      mediaKey: 'demo-media-003',
      sourcePlatform: 'X',
      sourceUrl: null,
      sourceAvailable: true,
      author: { name: 'Demo Kaynak', username: 'demo' },
      postText: 'Ankara şehir içi kaza — alıcı ekranı akışını göstermek için sentetik kayıt.',
      postedAt: '2026-06-03T11:20:00.000Z',
      imageUrl: demoImageDataUrl('06 KAZ 26', 'Alıcı gösterimine onaylı demo kaydı'),
      mediaType: 'photo',
      ocrText: '06 KAZ 26',
      ocrConfidence: 95,
      ocrLowConfidence: false,
      plateCandidates: [{ plate: '06 KAZ 26', normalized: '06KAZ26', confidence: 95 }],
      selectedPlate: '06 KAZ 26',
      selectedPlateNormalized: '06KAZ26',
      status: 'approved_customer',
      review: {
        reviewer: 'Demo Hukuk/Moderasyon',
        reviewedAt: nowIso(),
        plateFullyVisible: true,
        belongsToDamagedVehicle: true,
        accidentContextConfirmed: true,
        customerDisplayAuthorized: true,
      },
      createdAt: nowIso(),
      updatedAt: nowIso(),
      demo: true,
    },
  ],
});

class HttpError extends Error {
  constructor(status, code, message, details = null) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function json(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(body);
}

function success(response, data, meta = undefined) {
  json(response, 200, { ok: true, data, ...(meta ? { meta } : {}) });
}

async function readJsonBody(request, maximumBytes = Math.ceil(config.maxImageBytes * 4 / 3) + 2 * 1024 * 1024) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > maximumBytes) throw new HttpError(413, 'BODY_TOO_LARGE', 'İstek gövdesi boyut sınırını aşıyor.');
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'JSON_INVALID', 'Geçersiz JSON gövdesi.');
  }
}

function sanitizeString(value, maximum = 500) {
  return String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, maximum);
}

function constantTimeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

function requireApiAccess(request) {
  if (!config.adminApiToken) return;
  const authorization = String(request.headers.authorization ?? '');
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!supplied || !constantTimeEqual(supplied, config.adminApiToken)) {
    throw new HttpError(401, 'API_AUTH_REQUIRED', 'Yönetim API anahtarı gerekli veya geçersiz.');
  }
}

function sanitizeList(value, maximumItems = 50, maximumLength = 80) {
  const list = Array.isArray(value) ? value : String(value ?? '').split(/[\n,;]/);
  return [...new Set(list.map((item) => sanitizeString(item, maximumLength)).filter(Boolean))].slice(0, maximumItems);
}

function validateRuleInput(body, existing = null) {
  const mode = body.mode ?? existing?.mode ?? 'recent';
  if (!['recent', 'full_archive'].includes(mode)) {
    throw new HttpError(400, 'RULE_MODE_INVALID', 'Tarama modu recent veya full_archive olmalıdır.');
  }

  const terms = sanitizeList(body.terms ?? existing?.terms ?? []);
  const excludedTerms = sanitizeList(body.excludedTerms ?? existing?.excludedTerms ?? []);
  const locations = sanitizeList(body.locations ?? existing?.locations ?? []);
  const startTime = normalizeDateTime(body.startTime ?? existing?.startTime);
  const endTime = normalizeDateTime(body.endTime ?? existing?.endTime);
  if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
    throw new HttpError(400, 'RULE_DATE_RANGE_INVALID', 'Başlangıç tarihi bitiş tarihinden önce olmalıdır.');
  }

  const intervalMinutes = Math.max(15, Math.min(1440, Number(body.intervalMinutes ?? existing?.intervalMinutes ?? 60)));
  const maxPosts = Math.max(10, Math.min(config.maxPostsPerScan, Number(body.maxPosts ?? existing?.maxPosts ?? 100)));
  const rule = {
    id: existing?.id ?? createId('rule'),
    name: sanitizeString(body.name ?? existing?.name ?? 'Yeni kaza taraması', 120),
    terms,
    excludedTerms,
    locations,
    mediaType: body.mediaType === 'video' ? 'video' : 'image',
    language: sanitizeString(body.language ?? existing?.language ?? 'tr', 8),
    mode,
    active: body.active ?? existing?.active ?? false,
    excludeRetweets: body.excludeRetweets ?? existing?.excludeRetweets ?? true,
    excludeReplies: body.excludeReplies ?? existing?.excludeReplies ?? false,
    intervalMinutes,
    maxPosts,
    pageSize: Math.max(10, Math.min(100, Number(body.pageSize ?? existing?.pageSize ?? 100))),
    startTime,
    endTime,
    createdAt: existing?.createdAt ?? nowIso(),
    updatedAt: nowIso(),
    lastRunAt: existing?.lastRunAt ?? null,
    nextRunAt: existing?.nextRunAt ?? null,
    demo: false,
  };
  rule.query = buildXQuery(rule);
  return rule;
}

async function mapLimit(values, limit, worker) {
  const output = new Array(values.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      output[index] = await worker(values[index], index);
    }
  });
  await Promise.all(runners);
  return output;
}

async function runScan(rule, trigger = 'manual') {
  if (runningScans.has(rule.id)) {
    throw new HttpError(409, 'SCAN_ALREADY_RUNNING', 'Bu tarama kuralı için işlem zaten devam ediyor.');
  }
  if (!config.xBearerToken) {
    throw new HttpError(503, 'X_TOKEN_MISSING', 'Gerçek tarama için sunucuda X_BEARER_TOKEN tanımlanmalıdır.');
  }

  runningScans.add(rule.id);
  const startedAt = nowIso();
  const scanErrors = [];
  let postsScanned = 0;
  let mediaScanned = 0;
  let candidatesCreated = 0;
  let duplicatesSkipped = 0;

  try {
    const result = await searchXPosts(rule, config);
    postsScanned = result.posts.length;
    const mediaJobs = result.posts.flatMap((post) =>
      post.media
        .filter((media) => media.type === 'photo' && media.url)
        .map((media) => ({ post, media })),
    );
    mediaScanned = mediaJobs.length;

    await mapLimit(mediaJobs, 2, async ({ post, media }) => {
      try {
        if (store.findCandidateBySource(post.postId, media.mediaKey)) {
          duplicatesSkipped += 1;
          return;
        }
        const imageBuffer = await fetchXImageBuffer(media.url, config);
        const ocr = await recognizePlateCandidates(imageBuffer);
        if (ocr.plateCandidates.length === 0) return;

        const selected = ocr.plateCandidates[0];
        const timestamp = nowIso();
        await store.upsertCandidate({
          id: createId('candidate'),
          ruleId: rule.id,
          postId: post.postId,
          mediaKey: media.mediaKey,
          sourcePlatform: 'X',
          sourceUrl: post.sourceUrl,
          sourceAvailable: true,
          author: post.author,
          postText: post.text,
          postedAt: post.createdAt,
          imageUrl: media.url,
          previewImageUrl: media.previewImageUrl,
          mediaType: media.type,
          imageWidth: media.width,
          imageHeight: media.height,
          ocrText: ocr.text.slice(0, 5000),
          ocrConfidence: ocr.confidence,
          ocrLowConfidence: ocr.confidence < config.ocrMinConfidence,
          plateCandidates: ocr.plateCandidates,
          selectedPlate: selected.plate,
          selectedPlateNormalized: selected.normalized,
          status: 'review_pending',
          review: null,
          createdAt: timestamp,
          updatedAt: timestamp,
          mediaPersisted: false,
        });
        candidatesCreated += 1;
      } catch (error) {
        scanErrors.push({
          postId: post.postId,
          mediaKey: media.mediaKey,
          code: error.code ?? 'MEDIA_PROCESSING_FAILED',
          message: error.message,
        });
      }
    });

    const finishedAt = nowIso();
    const nextRunAt = rule.active
      ? new Date(Date.now() + rule.intervalMinutes * 60_000).toISOString()
      : null;
    const updatedRule = { ...rule, lastRunAt: finishedAt, nextRunAt, updatedAt: finishedAt };
    await store.upsertRule(updatedRule);
    const scan = await store.addScan({
      ruleId: rule.id,
      ruleName: rule.name,
      trigger,
      status: scanErrors.length ? 'completed_with_errors' : 'completed',
      startedAt,
      finishedAt,
      postsScanned,
      mediaScanned,
      candidatesCreated,
      duplicatesSkipped,
      errorCount: scanErrors.length,
      errors: scanErrors.slice(0, 50),
    });
    return scan;
  } catch (error) {
    await store.addScan({
      ruleId: rule.id,
      ruleName: rule.name,
      trigger,
      status: 'failed',
      startedAt,
      finishedAt: nowIso(),
      postsScanned,
      mediaScanned,
      candidatesCreated,
      duplicatesSkipped,
      errorCount: 1,
      errors: [{ code: error.code ?? 'SCAN_FAILED', message: error.message }],
    });
    throw error;
  } finally {
    runningScans.delete(rule.id);
  }
}

async function recheckSources(limit = 100) {
  if (!config.xBearerToken) {
    throw new HttpError(503, 'X_TOKEN_MISSING', 'Kaynak denetimi için X_BEARER_TOKEN tanımlanmalıdır.');
  }
  const candidates = store
    .listCandidates()
    .filter((candidate) => !candidate.demo)
    .slice(0, Math.max(1, Math.min(500, limit)));
  const byPost = new Map();
  for (const candidate of candidates) {
    const bucket = byPost.get(candidate.postId) ?? [];
    bucket.push(candidate);
    byPost.set(candidate.postId, bucket);
  }

  const postIds = [...byPost.keys()];
  let checked = 0;
  let available = 0;
  let removed = 0;
  for (let offset = 0; offset < postIds.length; offset += 100) {
    const batch = postIds.slice(offset, offset + 100);
    const result = await lookupXPosts(batch, config);
    const postMap = new Map(result.posts.map((post) => [post.postId, post]));
    for (const postId of batch) {
      const post = postMap.get(postId);
      for (const candidate of byPost.get(postId) ?? []) {
        checked += 1;
        if (!post) {
          removed += 1;
          await store.updateCandidate(candidate.id, {
            sourceAvailable: false,
            status: 'source_removed',
            statusBeforeRemoval: candidate.status === 'source_removed'
              ? candidate.statusBeforeRemoval
              : candidate.status,
            sourceCheckedAt: nowIso(),
            imageUrl: null,
          });
          await store.addAudit({
            type: 'source_removed',
            candidateId: candidate.id,
            postId,
            actor: 'compliance-job',
          });
          continue;
        }

        available += 1;
        const media = post.media.find((item) => item.mediaKey === candidate.mediaKey);
        await store.updateCandidate(candidate.id, {
          sourceAvailable: true,
          sourceCheckedAt: nowIso(),
          sourceUrl: post.sourceUrl,
          imageUrl: media?.url ?? candidate.imageUrl,
          previewImageUrl: media?.previewImageUrl ?? candidate.previewImageUrl,
          ...(candidate.status === 'source_removed'
            ? { status: candidate.statusBeforeRemoval || 'review_pending', statusBeforeRemoval: null }
            : {}),
        });
      }
    }
  }
  return { checked, available, removed };
}

function getStats() {
  const candidates = store.listCandidates();
  const scans = store.listScans(10);
  const byStatus = candidates.reduce((accumulator, candidate) => {
    accumulator[candidate.status] = (accumulator[candidate.status] ?? 0) + 1;
    return accumulator;
  }, {});
  return {
    mode: config.xBearerToken ? 'live' : 'demo',
    xConfigured: Boolean(config.xBearerToken),
    rules: store.listRules().length,
    activeRules: store.listRules().filter((rule) => rule.active).length,
    candidates: candidates.length,
    byStatus,
    latestScan: scans[0] ?? null,
    runningScans: [...runningScans],
  };
}

function candidateForAudience(candidate, audience) {
  const base = {
    id: candidate.id,
    plate: candidate.selectedPlate,
    plateNormalized: candidate.selectedPlateNormalized,
    postedAt: candidate.postedAt,
    sourcePlatform: candidate.sourcePlatform,
    sourceUrl: candidate.sourceUrl,
    sourceAvailable: candidate.sourceAvailable,
    imageUrl: candidate.imageUrl,
    previewImageUrl: candidate.previewImageUrl,
    postText: candidate.postText,
    author: candidate.author,
    status: candidate.status,
    review: candidate.review
      ? {
          reviewedAt: candidate.review.reviewedAt,
          reviewer: audience === 'technician' ? candidate.review.reviewer : undefined,
        }
      : null,
    disclaimer:
      'Bu kayıt resmî hasar/Tramer kaydı değildir; kamuya açık kaynak görseli ile plakanın doğrulanmış teknik eşleşmesidir.',
  };
  if (audience === 'technician') {
    return {
      ...base,
      ocrConfidence: candidate.ocrConfidence,
      ocrLowConfidence: candidate.ocrLowConfidence,
      plateCandidates: candidate.plateCandidates,
    };
  }
  return base;
}

async function handleApi(request, response, url) {
  const method = request.method || 'GET';
  const pathname = url.pathname;

  if (method === 'GET' && pathname === '/api/health') {
    return success(response, {
      service: 'ototr-x-kaza-monitor',
      version: '0.1.0',
      status: 'ok',
      mode: config.xBearerToken ? 'live' : 'demo',
      xConfigured: Boolean(config.xBearerToken),
      adminAuthConfigured: Boolean(config.adminApiToken),
      storeMedia: config.storeMedia,
      time: nowIso(),
    });
  }

  requireApiAccess(request);

  if (method === 'GET' && pathname === '/api/stats') return success(response, getStats());
  if (method === 'GET' && pathname === '/api/rules') return success(response, store.listRules());
  if (method === 'GET' && pathname === '/api/scans') {
    const limit = Math.max(1, Math.min(200, Number(url.searchParams.get('limit') || 50)));
    return success(response, store.listScans(limit));
  }
  if (method === 'GET' && pathname === '/api/audit') {
    const limit = Math.max(1, Math.min(500, Number(url.searchParams.get('limit') || 100)));
    return success(response, store.listAudit(limit));
  }

  if (method === 'POST' && pathname === '/api/rules') {
    const body = await readJsonBody(request);
    const rule = validateRuleInput(body);
    await store.upsertRule(rule);
    return json(response, 201, { ok: true, data: rule });
  }

  const ruleMatch = pathname.match(/^\/api\/rules\/([^/]+)$/);
  if (ruleMatch && method === 'PATCH') {
    const existing = store.getRule(decodeURIComponent(ruleMatch[1]));
    if (!existing) throw new HttpError(404, 'RULE_NOT_FOUND', 'Tarama kuralı bulunamadı.');
    const body = await readJsonBody(request);
    const rule = validateRuleInput(body, existing);
    await store.upsertRule(rule);
    return success(response, rule);
  }
  if (ruleMatch && method === 'DELETE') {
    const deleted = await store.deleteRule(decodeURIComponent(ruleMatch[1]));
    if (!deleted) throw new HttpError(404, 'RULE_NOT_FOUND', 'Tarama kuralı bulunamadı.');
    return success(response, { deleted: true });
  }

  if (method === 'POST' && pathname === '/api/scans') {
    const body = await readJsonBody(request);
    const rule = store.getRule(sanitizeString(body.ruleId, 200));
    if (!rule) throw new HttpError(404, 'RULE_NOT_FOUND', 'Tarama kuralı bulunamadı.');
    const scan = await runScan(rule, 'manual');
    return success(response, scan);
  }

  if (method === 'GET' && pathname === '/api/candidates') {
    const status = sanitizeString(url.searchParams.get('status'), 50) || null;
    const plateValue = url.searchParams.get('plate');
    const plate = plateValue ? normalizePlate(plateValue) : null;
    return success(response, store.listCandidates({ status, plate }));
  }

  const reviewMatch = pathname.match(/^\/api\/candidates\/([^/]+)\/review$/);
  if (reviewMatch && method === 'PATCH') {
    const candidateId = decodeURIComponent(reviewMatch[1]);
    const candidate = store.getCandidate(candidateId);
    if (!candidate) throw new HttpError(404, 'CANDIDATE_NOT_FOUND', 'Aday kayıt bulunamadı.');
    const body = await readJsonBody(request);
    const action = body.action;
    if (!['approve_internal', 'approve_customer', 'reject'].includes(action)) {
      throw new HttpError(400, 'REVIEW_ACTION_INVALID', 'Geçersiz moderasyon işlemi.');
    }

    const selectedPlate = formatPlate(body.selectedPlate ?? candidate.selectedPlate);
    const review = {
      selectedPlate,
      plateFullyVisible: body.plateFullyVisible === true,
      belongsToDamagedVehicle: body.belongsToDamagedVehicle === true,
      accidentContextConfirmed: body.accidentContextConfirmed === true,
      sourceAvailable: candidate.sourceAvailable,
      manualPlateOverride: body.manualPlateOverride === true,
      customerDisplayAuthorized: body.customerDisplayAuthorized === true,
      reviewer: sanitizeString(body.reviewer || 'Yetkili moderatör', 120),
      note: sanitizeString(body.note, 1000),
      reviewedAt: nowIso(),
    };

    let status = 'rejected';
    if (action !== 'reject') {
      const gate = canApproveCandidate(candidate, review);
      if (!gate.allowed) {
        throw new HttpError(422, 'REVIEW_GATE_FAILED', 'Onay koşulları tamamlanmadı.', gate.reasons);
      }
      if (action === 'approve_customer' && review.customerDisplayAuthorized !== true) {
        throw new HttpError(
          422,
          'CUSTOMER_DISPLAY_AUTH_REQUIRED',
          'Alıcı gösterimi için ayrıca aktarım/gösterim yetkisi onaylanmalıdır.',
        );
      }
      status = action === 'approve_customer' ? 'approved_customer' : 'approved_internal';
    }

    const updated = await store.updateCandidate(candidateId, {
      selectedPlate,
      selectedPlateNormalized: normalizePlate(selectedPlate),
      status,
      review,
    });
    await store.addAudit({
      type: 'candidate_review',
      candidateId,
      postId: candidate.postId,
      actor: review.reviewer,
      action,
      status,
      selectedPlate,
      note: review.note,
    });
    return success(response, updated);
  }

  const plateMatch = pathname.match(/^\/api\/plates\/(.+)$/);
  if (plateMatch && method === 'GET') {
    const rawPlate = decodeURIComponent(plateMatch[1]);
    if (!isValidTurkishPlate(rawPlate)) {
      throw new HttpError(400, 'PLATE_INVALID', 'Geçerli bir Türkiye plakası girilmelidir.');
    }
    const normalized = normalizePlate(rawPlate);
    const audience = url.searchParams.get('audience') === 'customer' ? 'customer' : 'technician';
    const allowedStatuses = audience === 'customer'
      ? new Set(['approved_customer'])
      : new Set(['approved_internal', 'approved_customer']);
    const matches = store
      .listCandidates({ plate: normalized })
      .filter((candidate) => candidate.sourceAvailable && allowedStatuses.has(candidate.status))
      .map((candidate) => candidateForAudience(candidate, audience));
    return success(response, {
      plate: formatPlate(rawPlate),
      normalized,
      audience,
      exactMatch: true,
      count: matches.length,
      matches,
    });
  }

  if (method === 'POST' && pathname === '/api/ocr') {
    const body = await readJsonBody(request);
    const match = String(body.imageDataUrl ?? '').match(/^data:image\/(?:png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) throw new HttpError(400, 'IMAGE_DATA_INVALID', 'PNG, JPEG veya WEBP veri adresi gereklidir.');
    const buffer = Buffer.from(match[1], 'base64');
    if (buffer.length > config.maxImageBytes) throw new HttpError(413, 'MEDIA_TOO_LARGE', 'Görsel boyut sınırını aşıyor.');
    const result = await recognizePlateCandidates(buffer);
    return success(response, result);
  }

  if (method === 'POST' && pathname === '/api/compliance/recheck') {
    const body = await readJsonBody(request);
    const result = await recheckSources(Number(body.limit || 100));
    return success(response, result);
  }

  throw new HttpError(404, 'API_NOT_FOUND', 'API yolu bulunamadı.');
}

const STATIC_FILES = new Map([
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/styles.css', 'styles.css'],
  ['/app.js', 'app.js'],
  ['/core.mjs', 'core.mjs'],
]);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
};

async function serveStatic(response, pathname) {
  const relativePath = STATIC_FILES.get(pathname);
  if (!relativePath) throw new HttpError(404, 'STATIC_NOT_FOUND', 'Dosya bulunamadı.');
  const filePath = path.join(config.staticRoot, relativePath);
  const content = await fs.readFile(filePath);
  response.writeHead(200, {
    'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream',
    'Content-Length': content.length,
    'Cache-Control': pathname === '/' || pathname.endsWith('.html') ? 'no-cache' : 'public, max-age=300',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https://pbs.twimg.com https://*.twimg.com; style-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  });
  response.end(content);
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', config.publicBaseUrl);
    if (url.pathname.startsWith('/api/')) await handleApi(request, response, url);
    else await serveStatic(response, url.pathname);
  } catch (error) {
    const status = error instanceof HttpError || error instanceof XApiError ? error.status : 500;
    const code = error.code || (status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED');
    const message = status === 500 ? 'Sunucu işlemi tamamlanamadı.' : error.message;
    if (status === 500) console.error(error);
    json(response, status, {
      ok: false,
      error: {
        code,
        message,
        ...(error.details ? { details: error.details } : {}),
        ...(error instanceof XApiError && error.response ? { upstream: error.response } : {}),
      },
    });
  }
});

const scheduler = setInterval(async () => {
  if (!config.xBearerToken) return;
  const currentTime = Date.now();
  const dueRules = store.listRules().filter((rule) => {
    if (!rule.active || runningScans.has(rule.id)) return false;
    if (!rule.nextRunAt) return true;
    return new Date(rule.nextRunAt).getTime() <= currentTime;
  });
  for (const rule of dueRules) {
    runScan(rule, 'scheduled').catch((error) => {
      console.error(`[scheduler] ${rule.id}:`, error.message);
    });
  }
}, 60_000);
scheduler.unref();

server.listen(config.port, config.host, () => {
  console.log(`OtoTR X Kaza Monitor: http://${config.host}:${config.port}`);
  console.log(`Çalışma modu: ${config.xBearerToken ? 'LIVE X API' : 'DEMO (X token yok)'}`);
  console.log(`Yönetim API koruması: ${config.adminApiToken ? 'AKTİF' : 'kapalı (yalnız loopback)'}`);
});

async function shutdown(signal) {
  console.log(`\n${signal} alındı, sunucu kapatılıyor...`);
  clearInterval(scheduler);
  server.close(async () => {
    await closeOcrWorker().catch(() => undefined);
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
