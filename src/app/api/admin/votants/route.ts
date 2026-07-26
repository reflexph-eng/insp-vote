import { NextRequest,NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin,UnauthorizedError } from "@/lib/require-admin";
import { getActiveScrutin } from "@/lib/scrutin";
import { getVotantsCache, setVotantsCache } from "@/lib/votants-cache";

export async function GET(req:NextRequest){
  try{await requireAdmin(req)}catch(e){if(e instanceof UnauthorizedError)return NextResponse.json({ok:false,error:e.message},{status:401});throw e}

  const cached = getVotantsCache();
  if (cached) return NextResponse.json({ok:true,votants:cached});

  const s=await getActiveScrutin();
  const p=await adminDb.collection("participations").where("scrutinId","==",s.id).get();
  const participationByElecteurId = new Map(p.docs.map(d => [String(d.data().electeurId), d]));
  const ids=[...participationByElecteurId.keys()];
  const out=[] as any[];

  for(let i=0;i<ids.length;i+=100){
    const refs=ids.slice(i,i+100).map(id=>adminDb.collection("electeurs").doc(id));
    const docs=refs.length?await adminDb.getAll(...refs):[];
    for(const d of docs){
      const part=participationByElecteurId.get(d.id);
      out.push({id:d.id,matricule:d.data()?.matricule??d.id,nom:d.data()?.nom??"",prenom:d.data()?.prenom??"",dateVote:part?.data().dateVote??null,statut:"VALIDE"});
    }
  }

  out.sort((a,b)=>String(b.dateVote).localeCompare(String(a.dateVote)));
  setVotantsCache(out);

  return NextResponse.json({ok:true,votants:out});
}
