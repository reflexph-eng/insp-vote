import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// La référence est construite à l'intérieur des fonctions (et non au chargement
// du module) pour rester cohérente avec l'initialisation paresseuse de
// `adminDb` : cela évite tout échec de `next build` lorsque les identifiants
// Firebase Admin ne sont pas encore disponibles au moment où Next.js importe
// les modules pour collecter les informations de page.
function liveRef() {
  return adminDb.collection("system").doc("live");
}

export function bumpLiveVersion(
  transaction?: FirebaseFirestore.Transaction,
  reason = "update",
) {
  const payload = {
    version: FieldValue.increment(1),
    updatedAt: FieldValue.serverTimestamp(),
    reason,
  };

  if (transaction) {
    transaction.set(liveRef(), payload, { merge: true });
    invalidateLiveVersionCache();
    return Promise.resolve();
  }

  invalidateLiveVersionCache();
  return liveRef().set(payload, { merge: true });
}

// Cache très court (quelques secondes) : plusieurs visiteurs publics qui
// vérifient la version au même moment partagent une seule lecture Firestore
// au lieu d'une lecture par visiteur. La fraîcheur réelle reste dominée par
// l'intervalle de sondage (60s) côté client, donc ce délai supplémentaire est
// sans conséquence perceptible.
let versionCache: { value: number; expiresAt: number } | null = null;
const VERSION_CACHE_TTL_MS = 5_000;

function invalidateLiveVersionCache() {
  versionCache = null;
}

export async function getLiveVersion(): Promise<number> {
  if (versionCache && versionCache.expiresAt > Date.now()) return versionCache.value;

  const snapshot = await liveRef().get();
  const value = snapshot.data()?.version;
  const result = typeof value === "number" && Number.isFinite(value) ? value : 0;

  versionCache = { value: result, expiresAt: Date.now() + VERSION_CACHE_TTL_MS };
  return result;
}
