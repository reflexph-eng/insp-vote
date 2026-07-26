let electeursCache: { value: unknown[]; expiresAt: number } | null = null;
const ELECTEURS_CACHE_TTL_MS = 20_000;

export function getElecteursCache(): unknown[] | null {
  if (electeursCache && electeursCache.expiresAt > Date.now()) return electeursCache.value;
  return null;
}

export function setElecteursCache(value: unknown[]) {
  electeursCache = { value, expiresAt: Date.now() + ELECTEURS_CACHE_TTL_MS };
}

export function invalidateElecteursCache() {
  electeursCache = null;
}
