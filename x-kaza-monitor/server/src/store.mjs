import fs from 'node:fs/promises';
import path from 'node:path';
import { createId } from '../../core.mjs';

const EMPTY_STORE = Object.freeze({
  schemaVersion: 1,
  rules: [],
  scans: [],
  candidates: [],
  audit: [],
});

function cloneEmptyStore() {
  return JSON.parse(JSON.stringify(EMPTY_STORE));
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
      const parsed = JSON.parse(raw);
      this.#state = {
        ...cloneEmptyStore(),
        ...parsed,
        rules: Array.isArray(parsed.rules) ? parsed.rules : [],
        scans: Array.isArray(parsed.scans) ? parsed.scans : [],
        candidates: Array.isArray(parsed.candidates) ? parsed.candidates : [],
        audit: Array.isArray(parsed.audit) ? parsed.audit : [],
      };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      await this.#persist();
    }
    return this;
  }

  snapshot() {
    return structuredClone(this.#state);
  }

  listRules() {
    return structuredClone(this.#state.rules);
  }

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

  listCandidates(filters = {}) {
    let values = [...this.#state.candidates];
    if (filters.status) values = values.filter((item) => item.status === filters.status);
    if (filters.plate) {
      values = values.filter((item) => item.selectedPlateNormalized === filters.plate);
    }
    if (filters.sourceAvailable != null) {
      values = values.filter((item) => item.sourceAvailable === filters.sourceAvailable);
    }
    return structuredClone(values.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
  }

  getCandidate(id) {
    const value = this.#state.candidates.find((item) => item.id === id);
    return value ? structuredClone(value) : null;
  }

  findCandidateBySource(postId, mediaKey) {
    const value = this.#state.candidates.find(
      (item) => item.postId === String(postId) && item.mediaKey === String(mediaKey),
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
    this.#state.candidates[index] = {
      ...this.#state.candidates[index],
      ...structuredClone(patch),
      updatedAt: new Date().toISOString(),
    };
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

  listScans(limit = 50) {
    return structuredClone(this.#state.scans.slice(0, Math.max(1, limit)));
  }

  async addAudit(entry) {
    const value = {
      id: entry.id || createId('audit'),
      occurredAt: entry.occurredAt || new Date().toISOString(),
      ...structuredClone(entry),
    };
    this.#state.audit.unshift(value);
    this.#state.audit = this.#state.audit.slice(0, 5000);
    await this.#persist();
    return structuredClone(value);
  }

  listAudit(limit = 100) {
    return structuredClone(this.#state.audit.slice(0, Math.max(1, limit)));
  }

  async seedDemo(seed) {
    if (this.#state.rules.length || this.#state.candidates.length) return false;
    this.#state.rules = structuredClone(seed.rules ?? []);
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
