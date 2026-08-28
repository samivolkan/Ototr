import { createId } from '../../core.mjs';
import { recognizePlateCandidates } from './ocr.mjs';
import { assertAllowedUrl } from './sources/rss-news-source.mjs';

async function fetchImageBuffer(imageUrl, source, maximumBytes) {
  let url = assertAllowedUrl(imageUrl, source.allowedHosts);
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    const response = await fetch(url, {
      redirect: 'manual',
      headers: {
        Accept: 'image/*',
        'User-Agent': 'OtoTR-OpenSourceVehicleIncident/0.2 (+news-image-ocr)',
      },
      signal: AbortSignal.timeout(20_000),
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location || redirectCount === 3) throw new Error('Görsel yönlendirmesi tamamlanamadı.');
      url = assertAllowedUrl(new URL(location, url), source.allowedHosts);
      continue;
    }
    if (!response.ok) throw new Error(`Görsel indirilemedi (${response.status}).`);
    const type = response.headers.get('content-type') || '';
    if (!type.startsWith('image/')) throw new Error(`Beklenmeyen görsel türü: ${type || 'bilinmiyor'}`);
    const declared = Number(response.headers.get('content-length') || 0);
    if (declared && declared > maximumBytes) throw new Error('Görsel boyut sınırını aşıyor.');
    if (!response.body) throw new Error('Görsel yanıt gövdesi bulunamadı.');

    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximumBytes) {
        await reader.cancel();
        throw new Error('Görsel boyut sınırını aşıyor.');
      }
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks, total);
  }
  throw new Error('Görsel yönlendirme sınırı aşıldı.');
}

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function scanNewsSource({
  source,
  store,
  maximumImageBytes = 12 * 1024 * 1024,
  ocrMinimumConfidence = 35,
  terms = null,
  excludedTerms = null,
  startTime = null,
  endTime = null,
  trigger = 'manual',
  recognize = recognizePlateCandidates,
  fetchImage = fetchImageBuffer,
}) {
  const definition = source.metadata;
  const startedAt = new Date().toISOString();
  const errors = [];
  let articlesMatched = 0;
  let articlesFetched = 0;
  let imagesScanned = 0;
  let candidatesCreated = 0;
  let duplicatesSkipped = 0;

  try {
    const items = await source.fetchItems({ terms, excludedTerms, startTime, endTime });
    articlesMatched = items.length;

    for (let articleIndex = 0; articleIndex < items.length; articleIndex += 1) {
      const item = items[articleIndex];
      try {
        if (articleIndex > 0 && definition.rateLimitMs > 0) await wait(definition.rateLimitMs);
        const article = await source.fetchArticle(item);
        articlesFetched += 1;
        const existingArticle = store.findArticleByCanonical(definition.id, article.articleUrl);
        const now = new Date().toISOString();
        await store.upsertArticle({
          id: article.articleId,
          articleId: article.articleId,
          sourceId: definition.id,
          sourceName: definition.name,
          articleUrl: article.articleUrl,
          title: article.title,
          description: article.description,
          publishedAt: article.publishedAt,
          images: article.images,
          imageCount: article.images.length,
          firstSeenAt: existingArticle?.firstSeenAt ?? now,
          lastSeenAt: now,
          sourceAvailable: true,
        });

        for (let imageIndex = 0; imageIndex < article.images.length; imageIndex += 1) {
          const imageUrl = article.images[imageIndex];
          imagesScanned += 1;
          try {
            const imageBuffer = await fetchImage(imageUrl, definition, maximumImageBytes);
            const ocr = await recognize(imageBuffer);
            if (!ocr.plateCandidates?.length) continue;

            for (const plateCandidate of ocr.plateCandidates) {
              if (store.findNewsCandidate(definition.id, article.articleId, imageUrl, plateCandidate.normalized)) {
                duplicatesSkipped += 1;
                continue;
              }
              const timestamp = new Date().toISOString();
              await store.upsertCandidate({
                id: createId('candidate'),
                sourcePlatform: 'NEWS',
                sourceId: definition.id,
                sourceName: definition.name,
                sourceAvailable: true,
                sourceUrl: article.articleUrl,
                articleId: article.articleId,
                articleUrl: article.articleUrl,
                articleTitle: article.title,
                articlePublishedAt: article.publishedAt,
                postText: article.description,
                postedAt: article.publishedAt,
                imageUrl,
                imageIndex,
                mediaType: 'photo',
                ocrText: String(ocr.text ?? '').slice(0, 5000),
                ocrConfidence: Number(ocr.confidence ?? 0),
                ocrLowConfidence: Number(ocr.confidence ?? 0) < ocrMinimumConfidence,
                plateCandidates: ocr.plateCandidates,
                selectedPlate: plateCandidate.plate,
                selectedPlateNormalized: plateCandidate.normalized,
                status: 'review_pending',
                review: null,
                createdAt: timestamp,
                updatedAt: timestamp,
                mediaPersisted: false,
              });
              candidatesCreated += 1;
            }
          } catch (error) {
            errors.push({ articleId: article.articleId, imageUrl, code: error.code ?? 'NEWS_IMAGE_FAILED', message: error.message });
          }
        }
      } catch (error) {
        errors.push({ itemId: item.id, articleUrl: item.link, code: error.code ?? 'NEWS_ARTICLE_FAILED', message: error.message });
      }
    }

    const finishedAt = new Date().toISOString();
    const scan = await store.addScan({
      sourceType: 'HABER',
      sourceId: definition.id,
      sourceName: definition.name,
      trigger,
      status: errors.length ? 'completed_with_errors' : 'completed',
      startedAt,
      finishedAt,
      articlesMatched,
      articlesFetched,
      imagesScanned,
      candidatesCreated,
      duplicatesSkipped,
      errorCount: errors.length,
      errors: errors.slice(0, 50),
    });

    const previous = store.getSource(definition.id) ?? definition;
    await store.upsertSource({
      ...previous,
      id: definition.id,
      name: definition.name,
      type: definition.type,
      enabled: previous.enabled ?? definition.enabled,
      baseUrl: definition.baseUrl,
      feedUrl: definition.feedUrl,
      allowedHosts: definition.allowedHosts,
      rateLimitMs: definition.rateLimitMs,
      maxArticlesPerScan: definition.maxArticlesPerScan,
      lastScanAt: finishedAt,
      lastSuccessfulScanAt: finishedAt,
      lastError: errors[0]?.message ?? null,
      totalArticlesFound: Number(previous.totalArticlesFound ?? 0) + articlesMatched,
      totalImagesScanned: Number(previous.totalImagesScanned ?? 0) + imagesScanned,
      totalPlateCandidates: Number(previous.totalPlateCandidates ?? 0) + candidatesCreated,
      updatedAt: finishedAt,
    });
    return scan;
  } catch (error) {
    const finishedAt = new Date().toISOString();
    const previous = store.getSource(definition.id) ?? definition;
    await store.upsertSource({
      ...previous,
      lastScanAt: finishedAt,
      lastError: error.message,
      updatedAt: finishedAt,
    });
    await store.addScan({
      sourceType: 'HABER', sourceId: definition.id, sourceName: definition.name, trigger,
      status: 'failed', startedAt, finishedAt, articlesMatched, articlesFetched, imagesScanned,
      candidatesCreated, duplicatesSkipped, errorCount: 1,
      errors: [{ code: error.code ?? 'NEWS_SCAN_FAILED', message: error.message }],
    });
    throw error;
  }
}
