import sharp from 'sharp';
import { extractPlateCandidates } from '../../core.mjs';

let workerPromise = null;
let recognitionQueue = Promise.resolve();

async function getWorker() {
  if (!workerPromise) {
    workerPromise = import('tesseract.js').then(async ({ createWorker }) => createWorker('eng'));
  }
  return workerPromise;
}

function clampConfidence(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function mergeCandidates(target, candidates, passName) {
  for (const candidate of candidates ?? []) {
    const existing = target.get(candidate.normalized);
    const next = {
      ...candidate,
      confidence: clampConfidence(candidate.confidence),
      detectedIn: passName,
    };
    if (!existing || next.confidence > existing.confidence) target.set(candidate.normalized, next);
  }
}

async function createPreprocessedPasses(imageBuffer) {
  const base = sharp(imageBuffer, { failOn: 'none' }).rotate();
  const metadata = await base.metadata();
  const width = Number(metadata.width || 0);
  const height = Number(metadata.height || 0);
  const resizeWidth = width > 0 ? Math.min(2200, Math.max(1400, width)) : 1800;

  const normalized = await sharp(imageBuffer, { failOn: 'none' })
    .rotate()
    .resize({ width: resizeWidth, withoutEnlargement: false })
    .grayscale()
    .normalize()
    .sharpen({ sigma: 1.2 })
    .png()
    .toBuffer();

  const threshold = await sharp(normalized)
    .threshold(165)
    .png()
    .toBuffer();

  const passes = [
    { name: 'normalized_full', buffer: normalized },
    { name: 'threshold_full', buffer: threshold },
  ];

  if (width >= 320 && height >= 240) {
    const lowerTop = Math.floor(height * 0.38);
    const lowerHeight = Math.max(1, height - lowerTop);
    const lower = await sharp(imageBuffer, { failOn: 'none' })
      .rotate()
      .extract({ left: 0, top: lowerTop, width, height: lowerHeight })
      .resize({ width: Math.min(2400, Math.max(1600, width * 2)), withoutEnlargement: false })
      .grayscale()
      .normalize()
      .sharpen({ sigma: 1.4 })
      .png()
      .toBuffer();
    passes.push({ name: 'lower_vehicle_zone', buffer: lower });
  }

  return passes;
}

async function recognizePass(worker, buffer, name) {
  const result = await worker.recognize(buffer);
  const text = String(result.data?.text ?? '');
  const confidence = clampConfidence(result.data?.confidence);
  return {
    name,
    text,
    confidence,
    plateCandidates: extractPlateCandidates(text, confidence),
  };
}

export async function recognizePlateCandidates(imageBuffer, options = {}) {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new TypeError('OCR için geçerli bir görsel tamponu gereklidir.');
  }

  const strongMatchConfidence = Math.max(50, Math.min(95, Number(options.strongMatchConfidence ?? 72)));
  const task = recognitionQueue.then(async () => {
    const worker = await getWorker();
    const passes = [];
    const candidates = new Map();

    const original = await recognizePass(worker, imageBuffer, 'original');
    passes.push(original);
    mergeCandidates(candidates, original.plateCandidates, original.name);

    const bestOriginal = Math.max(0, ...original.plateCandidates.map((item) => Number(item.confidence || 0)));
    if (original.plateCandidates.length && bestOriginal >= strongMatchConfidence) {
      return {
        text: original.text,
        confidence: original.confidence,
        plateCandidates: [...candidates.values()],
        ocrPassCount: 1,
        bestPass: 'original',
        passes: passes.map(({ name, confidence, plateCandidates }) => ({
          name,
          confidence,
          plateCount: plateCandidates.length,
        })),
      };
    }

    const enhancedPasses = await createPreprocessedPasses(imageBuffer);
    for (const enhanced of enhancedPasses) {
      const result = await recognizePass(worker, enhanced.buffer, enhanced.name);
      passes.push(result);
      mergeCandidates(candidates, result.plateCandidates, result.name);
      const best = Math.max(0, ...result.plateCandidates.map((item) => Number(item.confidence || 0)));
      if (result.plateCandidates.length && best >= strongMatchConfidence) break;
    }

    const ranked = [...candidates.values()].sort((a, b) => b.confidence - a.confidence);
    const passWithBestPlate = ranked[0]
      ? passes.find((pass) => pass.name === ranked[0].detectedIn)
      : passes.reduce((best, pass) => (pass.confidence > best.confidence ? pass : best), passes[0]);

    return {
      text: passWithBestPlate?.text ?? original.text,
      confidence: passWithBestPlate?.confidence ?? original.confidence,
      plateCandidates: ranked,
      ocrPassCount: passes.length,
      bestPass: passWithBestPlate?.name ?? 'original',
      passes: passes.map(({ name, confidence, plateCandidates }) => ({
        name,
        confidence,
        plateCount: plateCandidates.length,
      })),
    };
  });

  recognitionQueue = task.catch(() => undefined);
  return task;
}

export async function closeOcrWorker() {
  if (!workerPromise) return;
  const worker = await workerPromise;
  await worker.terminate();
  workerPromise = null;
}
