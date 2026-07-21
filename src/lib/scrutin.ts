import { adminDb } from "@/lib/firebase-admin";

export const DEFAULT_SCRUTIN_ID = "mainsp-president-2026";
export const DEFAULT_SCRUTIN_TITRE = "ÉLECTION DU PRÉSIDENT DE LA MUTUELLE DES AGENTS DE L’INSP (MAINSP)";

export async function ensureDefaultScrutin() {
  const ref = adminDb.collection("scrutins").doc(DEFAULT_SCRUTIN_ID);
  const snap = await ref.get();
  if (!snap.exists) {
    const legacy = await adminDb.collection("configuration").doc("etat").get();
    await ref.set({
      titre: DEFAULT_SCRUTIN_TITRE,
      type: "OFFICIEL",
      statut: legacy.data()?.scrutinOuvert ? "OUVERT" : "FERME",
      actif: true,
      archive: false,
      dateCreation: new Date().toISOString(),
      dateOuverture: legacy.data()?.dateOuverture ?? null,
      dateFermeture: legacy.data()?.dateFermeture ?? null,
    });
  }
  const configRef = adminDb.collection("configuration").doc("etat");
  const config = await configRef.get();
  if (!config.data()?.scrutinActifId) await configRef.set({ scrutinActifId: DEFAULT_SCRUTIN_ID }, { merge: true });
  return ref;
}

export async function getActiveScrutin() {
  await ensureDefaultScrutin();
  const config = await adminDb.collection("configuration").doc("etat").get();
  const id = String(config.data()?.scrutinActifId || DEFAULT_SCRUTIN_ID);
  let snap = await adminDb.collection("scrutins").doc(id).get();
  if (!snap.exists) snap = await adminDb.collection("scrutins").doc(DEFAULT_SCRUTIN_ID).get();
  return { id: snap.id, ...(snap.data() as any) };
}
