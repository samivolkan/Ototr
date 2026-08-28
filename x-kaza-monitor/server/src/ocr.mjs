import { extractPlateCandidates } from '../../core.mjs';

let workerPromise = null;
let recognitionQueue = Promise.resolve();

async function getWorker() {
  if (!workerPromise) {
    workerPromise = import('tesseract.js').then(async ({ createWorker }) => createWorker('eng'));
  }
  return workerPromise;
}

export async function recognizePlateCandidates(imageBuffer) {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new TypeError('OCR için geçerli bir görsel tamponu gereklidir.');
  }

  const task = recognitionQueue.then(async () => {
    const worker = await getWorker();
    const result = await worker.recognize(imageBuffer);
    const text = String(result.data?.text ?? '');
    const confidence = Number(result.data?.confidence ?? 0);
    return {
      text,
      confidence: Math.max(0, Math.min(100, Math.round(confidence))),
      plateCandidates: extractPlateCandidates(text, confidence),
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
