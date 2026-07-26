import { NextRequest,NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin,UnauthorizedError } from "@/lib/require-admin";

// Cache court (20s) : le journal (jusqu'à 500 lectures) n'est pas re-téléchargé
// à chaque ouverture rapprochée de l'onglet. Contrairement aux électeurs et
// aux votants, aucune invalidation explicite n'est câblée ici (le journal est
// un historique de consultation, pas une donnée qui conditionne une décision
// immédiate) : la fraîcheur à 20s près est un compromis volontairement simple
// et à faible risque.
let journalCache: { value: unknown[]; expiresAt: number } | null = null;
const JOURNAL_CACHE_TTL_MS = 20_000;

export async function GET(req:NextRequest){
  try{await requireAdmin(req)}catch(e){if(e instanceof UnauthorizedError)return NextResponse.json({ok:false,error:e.message},{status:401});throw e}

  if (journalCache && journalCache.expiresAt > Date.now()) {
    return NextResponse.json({ok:true,journal:journalCache.value});
  }

  const snap=await adminDb.collection("journalAdmin").orderBy("date","desc").limit(500).get();
  const journal = snap.docs.map(d=>{const x=d.data();return{id:d.id,...x,date:x.date?.toDate?.().toISOString?.()??x.date??null}});
  journalCache = { value: journal, expiresAt: Date.now() + JOURNAL_CACHE_TTL_MS };

  return NextResponse.json({ok:true,journal});
}
