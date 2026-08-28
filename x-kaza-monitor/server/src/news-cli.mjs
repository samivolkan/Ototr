import { getConfig } from './env.mjs';
import { JsonStore } from './store.mjs';
import { createTrtHaberSource, TRT_HABER_SOURCE_CONFIG } from './sources/trt-haber-source.mjs';
import { scanNewsSource } from './news-pipeline.mjs';
import { closeOcrWorker } from './ocr.mjs';

const config = getConfig();
const store = await new JsonStore(config.dataFile).init();

if (!store.getSource('trt-haber')) {
  const now = new Date().toISOString();
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

const sourceState = store.getSource('trt-haber');
if (sourceState?.enabled === false) {
  console.error('TRT Haber kaynağı pasif. Kaynak ayarından etkinleştirin.');
  process.exitCode = 2;
} else {
  const source = createTrtHaberSource(sourceState ?? {});
  try {
    const scan = await scanNewsSource({
      source,
      store,
      maximumImageBytes: config.maxImageBytes,
      ocrMinimumConfidence: config.ocrMinConfidence,
      trigger: 'cli',
    });
    console.log(JSON.stringify({
      ok: true,
      source: source.metadata.name,
      xTokenRequired: false,
      articlesMatched: scan.articlesMatched,
      articlesFetched: scan.articlesFetched,
      imagesScanned: scan.imagesScanned,
      candidatesCreated: scan.candidatesCreated,
      duplicatesSkipped: scan.duplicatesSkipped,
      errorCount: scan.errorCount,
    }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, code: error.code ?? 'NEWS_SCAN_FAILED', message: error.message }, null, 2));
    process.exitCode = 1;
  } finally {
    await closeOcrWorker().catch(() => undefined);
  }
}
