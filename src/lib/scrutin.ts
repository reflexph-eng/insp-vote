import { adminDb } from "@/lib/firebase-admin";

export const DEFAULT_SCRUTIN_ID = "mainsp-president-2026";
export const DEFAULT_SCRUTIN_TITRE = "ÉLECTION DU PRÉSIDENT DE LA MUTUELLE DES AGENTS DE L’INSP (MAINSP)";

type ActiveScrutin = {
  id: string;
  titre: string;
  type: "TEST" | "OFFICIEL";
  statut: "OUVERT" | "SUSPENDU" | "FERME";
  actif?: boolean;
  archive?: boolean;
  dateCreation?: string;
  dateOuverture?: string | null;
  dateFermeture?: string | null;
};

let activeCache: { value: ActiveScrutin; expiresAt: number } | null = null;
const ACTIVE_CACHE_TTL_MS = 30_000;

export function invalidateActiveScrutinCache() {
  activeCache = null;
}

let defaultScrutinEnsured = false;

/**
 * Migration/initialisation explicite. Le résultat est mémorisé pour la durée
 * de vie de l'instance serveur (variable global au module) afin d'éviter de
 * relire ces documents à chaque ouverture de l'onglet Scrutins alors que la
 * migration n'a besoin d'avoir lieu qu'une seule fois par déploiement.
 */
export async function ensureDefaultScrutin() {
  if (defaultScrutinEnsured) return adminDb.collection("scrutins").doc(DEFAULT_SCRUTIN_ID);

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
  if (!config.data()?.scrutinActifId) {
    await configRef.set({ scrutinActifId: DEFAULT_SCRUTIN_ID }, { merge: true });
  }
  invalidateActiveScrutinCache();
  defaultScrutinEnsured = true;
  return ref;
}

/**
 * Lecture légère et mise en cache du scrutin actif.
 * Deux lectures au maximum toutes les 30 secondes par instance serveur.
 */
export async function getActiveScrutin(): Promise<ActiveScrutin> {
  if (activeCache && activeCache.expiresAt > Date.now()) return activeCache.value;

  const config = await adminDb.collection("configuration").doc("etat").get();
  const id = String(config.data()?.scrutinActifId || DEFAULT_SCRUTIN_ID);
  let snap = await adminDb.collection("scrutins").doc(id).get();

  if (!snap.exists && id !== DEFAULT_SCRUTIN_ID) {
    snap = await adminDb.collection("scrutins").doc(DEFAULT_SCRUTIN_ID).get();
  }
  if (!snap.exists) {
    throw new Error("Aucun scrutin configuré");
  }

  const value = { id: snap.id, ...(snap.data() as Omit<ActiveScrutin, "id">) };
  activeCache = { value, expiresAt: Date.now() + ACTIVE_CACHE_TTL_MS };
  return value;
}
