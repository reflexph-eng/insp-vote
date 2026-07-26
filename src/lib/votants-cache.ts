let votantsCache: { value: unknown[]; expiresAt: number } | null = null;
const VOTANTS_CACHE_TTL_MS = 20_000;

export function getVotantsCache(): unknown[] | null {
  if (votantsCache && votantsCache.expiresAt > Date.now()) return votantsCache.value;
  return null;
}

export function setVotantsCache(value: unknown[]) {
  votantsCache = { value, expiresAt: Date.now() + VOTANTS_CACHE_TTL_MS };
}

export function invalidateVotantsCache() {
  votantsCache = null;
}
