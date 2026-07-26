import { adminDb } from "@/lib/firebase-admin";
import type { Stats } from "@/lib/types";
import { getActiveScrutin } from "@/lib/scrutin";

let statsCache: { value: Stats; expiresAt: number } | null = null;
const STATS_CACHE_TTL_MS = 30_000;

export function invalidateStatsCache() {
  statsCache = null;
}

async function countQuery(query: FirebaseFirestore.Query): Promise<number> {
  const snap = await query.count().get();
  return snap.data().count;
}

/**
 * Statistiques optimisées : aucune collection volumineuse n'est téléchargée.
 * Les compteurs Firestore lisent les index et coûtent environ 1 lecture par
 * tranche de 1 000 entrées, au lieu d'une lecture par document.
 */
export async function buildStats(forceRefresh = false): Promise<Stats> {
  if (!forceRefresh && statsCache && statsCache.expiresAt > Date.now()) return statsCache.value;

  const scrutin = await getActiveScrutin();
  const candidatsSnap = await adminDb
    .collection("candidats")
    .where("scrutinId", "==", scrutin.id)
    .get();

  const candidats = candidatsSnap.docs.map((doc) => ({
    id: doc.id,
    nom: String(doc.data().nom ?? "Candidat"),
  }));

  const [inscrits, votants, votesAnnules, ...voteCounts] = await Promise.all([
    countQuery(adminDb.collection("electeurs")),
    countQuery(adminDb.collection("participations").where("scrutinId", "==", scrutin.id)),
    countQuery(adminDb.collection("annulationsVote").where("scrutinId", "==", scrutin.id)),
    ...candidats.map((candidat) =>
      countQuery(
        adminDb
          .collection("votes")
          .where("scrutinId", "==", scrutin.id)
          .where("candidatId", "==", candidat.id),
      ),
    ),
    countQuery(
      adminDb
        .collection("votes")
        .where("scrutinId", "==", scrutin.id)
        .where("candidatId", "==", null),
    ),
  ]);

  const nulCount = voteCounts[candidats.length] ?? 0;
  const totalVotes = voteCounts.reduce((sum, count) => sum + count, 0);
  const resultats: Stats["resultats"] = candidats
    .map((candidat, index) => ({
      candidatId: candidat.id,
      nom: candidat.nom,
      voix: voteCounts[index] ?? 0,
      pourcentage: totalVotes ? Math.round(((voteCounts[index] ?? 0) / totalVotes) * 1000) / 10 : 0,
    })) as Stats["resultats"];

  resultats.push(...(
      nulCount > 0
        ? [{
            candidatId: null,
            nom: "Vote nul",
            voix: nulCount,
            pourcentage: totalVotes ? Math.round((nulCount / totalVotes) * 1000) / 10 : 0,
          }]
        : []
    ));
  resultats.sort((a, b) => b.voix - a.voix);

  const value: Stats = {
    inscrits,
    votants,
    participation: inscrits ? Math.round((votants / inscrits) * 1000) / 10 : 0,
    restants: Math.max(0, inscrits - votants),
    dernierVote: null,
    scrutinOuvert: scrutin.statut === "OUVERT",
    votesAnnules,
    reprisesVote: 0,
    // Désactivé en temps réel pour éviter de relire toutes les participations.
    progression: [],
    scrutin: {
      id: scrutin.id,
      titre: scrutin.titre,
      type: scrutin.type,
      statut: scrutin.statut,
    },
    resultats,
  };

  statsCache = { value, expiresAt: Date.now() + STATS_CACHE_TTL_MS };
  return value;
}
