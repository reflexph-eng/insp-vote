import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const LIVE_REF = adminDb.collection("system").doc("live");

/**
 * Incrémente un marqueur très léger après toute action qui modifie les
 * statistiques visibles. Les écrans consultent uniquement ce document et ne
 * rechargent les statistiques complètes que lorsque la version change.
 */
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
    transaction.set(LIVE_REF, payload, { merge: true });
    return Promise.resolve();
  }

  return LIVE_REF.set(payload, { merge: true });
}

export async function getLiveVersion(): Promise<number> {
  const snapshot = await LIVE_REF.get();
  const value = snapshot.data()?.version;
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
