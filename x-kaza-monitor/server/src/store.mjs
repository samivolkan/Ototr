import fs from 'node:fs/promises';
import path from 'node:path';
import { createId } from '../../core.mjs';

const CURRENT_SCHEMA_VERSION = 2;
const EMPTY_STORE = Object.freeze({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  rules: [],
  sources: [],
  articles: [],
  scans: [],
  candidates: [],
  audit: [],
});

function cloneEmptyStore() {
  return JSON.parse(JSON.stringify(EMPTY_STORE));
}

export function migrateStore(parsed = {}) {
  const migrated = {
    ...cloneEmptyStore(),
    ...parsed,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    rules: Array.isArray(parsed.rules) ? parsed.rules : [],
    sources: Array.isArray(parsed.sources) ? parsed.sources : [],
    articles: Array.isArray(parsed.articles) ? parsed.articles : [],
    scans: Array.isArray(parsed.scans) ? parsed.scans : [],
    candidates: Array.isArray(parsed.candidates) ? parsed.candidates : [],
    audit: Array.isArray(parsed.audit) ? parsed.audit : [],
  };
  return migrated;
}

export class JsonStore {
  #filePath;
  #state = cloneEmptyStore();
  #writeChain = Promise.resolve();

  constructor(filePath) {
    this.#filePath = filePath;
  }

  async init() {
    await fs.mkdir(path.dirname(this.#filePath), { recursive: true });
    try {
      const raw = await fs.readFile(this.#filePath, 'utf8');
      this.#state = migrateStore(JSON.parse(raw));
      await this.#persist();
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await this.#persist();
    }
    return this;
  }

  snapshot() { return structuredClone(this.#state); }

  listRules() { return structuredClone(this.#state.rules); }
  getRule(id) {
    const value = this.#state.rules.find((item) => item.id === id);
    return value ? structuredClone(value) : null;
  }
  async upsertRule(rule) {
    const index = this.#state.rules.findIndex((item) => item.id === rule.id);
    if (index >= 0) this.#state.rules[index] = structuredClone(rule);
    else this.#state.rules.unshift(structuredClone(rule));
    await this.#persist();
    return structuredClone(rule);
  }
  async deleteRule(id) {
    const before = this.#state.rules.length;
    this.#state.rules = this.#state.rules.filter((item) => item.id !== id);
    if (this.#state.rules.length === before) return false;
    await this.#persist();
    return true;
  }

  listSources() { return structuredClone(this.#state.sources); }
  getSource(id) {
    const value = this.#state.sources.find((item) => item.id === id);
    return value ? structuredClone(value) : null;
  }
  async upsertSource(source) {
    const index = this.#state.sources.findIndex((item) => item.id === source.id);
    if (index >= 0) this.#state.sources[index] = { ...this.#state.sources[index], ...structuredClone(source) };
    else this.#state.sources.unshift(structuredClone(source));
    await this.#persist();
    return this.getSource(source.id);
  }

  listArticles(filters = {}) {
    let values = [...this.#state.articles];
    if (filters.sourceId) values = values.filter((item) => item.sourceId === filters.sourceId);
    return structuredClone(values.sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt))));
  }
  getArticle(id) {
    const value = this.#state.articles.find((item) => item.id === id || item.articleId === id);
    return value ? structuredClone(value) : null;
  }
  findArticleByCanonical(sourceId, canonicalUrl) {
    const value = this.#state.articles.find((item) => item.sourceId === sourceId && item.articleUrl === canonicalUrl);
    return value ? structuredClone(value) : null;
  }
  async upsertArticle(article) {
    const index = this.#state.articles.findIndex((item) => item.articleId === article.articleId);
    if (index >= 0) this.#state.articles[index] = { ...this.#state.articles[index], ...structuredClone(article) };
    else this.#state.articles.unshift(structuredClone(article));
    await this.#persist();
    return this.getArticle(article.articleId);
  }

  listCandidates(filters = {}) {
    let values = [...this.#state.candidates];
    if (filters.status) values = values.filter((item) => item.status === filters.status);
    if (filters.plate) values = values.filter((item) => item.selectedPlateNormalized === filters.plate);
    if (filters.sourceId) values = values.filter((item) => item.sourceId === filters.sourceId);
    if (filters.sourcePlatform) values = values.filter((item) => item.sourcePlatform === filters.sourcePlatform);
    if (filters.sourceAvailable != null) values = values.filter((item) => item.sourceAvailable === filters.sourceAvailable);
    return structuredClone(values.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
  }
  getCandidate(id) {
    const value = this.#state.candidates.find((item) => item.id === id);
    return value ? structuredClone(value) : null;
  }
  findCandidateBySource(postId, mediaKey) {
    const value = this.#state.candidates.find((item) => item.postId === String(postId) && item.mediaKey === String(mediaKey));
    return value ? structuredClone(value) : null;
  }
  findNewsCandidate(sourceId, articleId, imageUrl, plateNormalized) {
    const value = this.#state.candidates.find((item) =>
      item.sourceId === sourceId
      && item.articleId === articleId
      && item.imageUrl === imageUrl
      && item.selectedPlateNormalized === plateNormalized,
    );
    return value ? structuredClone(value) : null;
  }
  async upsertCandidate(candidate) {
    const index = this.#state.candidates.findIndex((item) => item.id === candidate.id);
    if (index >= 0) this.#state.candidates[index] = structuredClone(candidate);
    else this.#state.candidates.unshift(structuredClone(candidate));
    await this.#persist();
    return structuredClone(candidate);
  }
  async updateCandidate(id, patch) {
    const index = this.#state.candidates.findIndex((item) => item.id === id);
    if (index < 0) return null;
    this.#state.candidates[index] = { ...this.#state.candidates[index], ...structuredClone(patch), updatedAt: new Date().toISOString() };
    await this.#persist();
    return structuredClone(this.#state.candidates[index]);
  }

  async addScan(scan) {
    const value = { id: scan.id || createId('scan'), ...structuredClone(scan) };
    this.#state.scans.unshift(value);
    this.#state.scans = this.#state.scans.slice(0, 500);
    await this.#persist();
    return structuredClone(value);
  }
  listScans(limit = 50) { return structuredClone(this.#state.scans.slice(0, Math.max(1, limit))); }

  async addAudit(entry) {
    const value = { id: entry.id || createId('audit'), occurredAt: entry.occurredAt || new Date().toISOString(), ...structuredClone(entry) };
    this.#state.audit.unshift(value);
    this.#state.audit = this.#state.audit.slice(0, 5000);
    await this.#persist();
    return structuredClone(value);
  }
  listAudit(limit = 100) { return structuredClone(this.#state.audit.slice(0, Math.max(1, limit))); }

  async seedDemo(seed) {
    if (this.#state.rules.length || this.#state.candidates.length || this.#state.sources.length) return false;
    this.#state.rules = structuredClone(seed.rules ?? []);
    this.#state.sources = structuredClone(seed.sources ?? []);
    this.#state.articles = structuredClone(seed.articles ?? []);
    this.#state.candidates = structuredClone(seed.candidates ?? []);
    this.#state.audit = structuredClone(seed.audit ?? []);
    await this.#persist();
    return true;
  }

  async #persist() {
    const state = JSON.stringify(this.#state, null, 2);
    const tempPath = `${this.#filePath}.tmp`;
    this.#writeChain = this.#writeChain.then(async () => {
      await fs.writeFile(tempPath, state, 'utf8');
      await fs.rename(tempPath, this.#filePath);
    });
    return this.#writeChain;
  }
}
