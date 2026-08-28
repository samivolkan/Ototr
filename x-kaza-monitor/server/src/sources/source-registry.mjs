import { createTrtHaberSource, TRT_HABER_SOURCE_CONFIG } from './trt-haber-source.mjs';

const factories = new Map([
  ['trt-haber', createTrtHaberSource],
]);

export function listBuiltInSources() {
  return [structuredClone(TRT_HABER_SOURCE_CONFIG)];
}

export function createSource(sourceConfig) {
  const id = typeof sourceConfig === 'string' ? sourceConfig : sourceConfig?.id;
  const factory = factories.get(id);
  if (!factory) throw new Error(`Bilinmeyen kaynak: ${id}`);
  return factory(typeof sourceConfig === 'object' ? sourceConfig : {});
}

export function getSourceDefinition(id) {
  return listBuiltInSources().find((source) => source.id === id) ?? null;
}
