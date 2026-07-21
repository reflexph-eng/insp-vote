import { adminDb } from "@/lib/firebase-admin";
import type { Stats } from "@/lib/types";
import { getActiveScrutin } from "@/lib/scrutin";

export async function buildStats(): Promise<Stats> {
  const scrutin = await getActiveScrutin();
  const [electeursSnap, candidatsSnap, votesSnap, participationsSnap] = await Promise.all([
    adminDb.collection("electeurs").get(),
    adminDb.collection("candidats").where("scrutinId","==",scrutin.id).get(),
    adminDb.collection("votes").where("scrutinId","==",scrutin.id).get(),
    adminDb.collection("participations").where("scrutinId","==",scrutin.id).get(),
  ]);
  const inscrits=electeursSnap.size, votants=participationsSnap.size;
  let dernierVote:string|null=null;
  participationsSnap.forEach(d=>{const x=d.data(); if(x.dateVote && (!dernierVote||x.dateVote>dernierVote)) dernierVote=x.dateVote;});
  const noms=new Map<string,string>(); candidatsSnap.forEach(d=>noms.set(d.id,d.data().nom));
  const tally=new Map<string,number>(); votesSnap.forEach(d=>{const id=d.data().candidatId as string|null; const k=id??"NUL"; tally.set(k,(tally.get(k)??0)+1);});
  const total=votesSnap.size;
  const resultats=Array.from(tally.entries()).map(([k,voix])=>({candidatId:k==="NUL"?null:k,nom:k==="NUL"?"Vote nul":noms.get(k)??"Candidat supprimé",voix,pourcentage:total?Math.round(voix/total*1000)/10:0})).sort((a,b)=>b.voix-a.voix);
  return {inscrits,votants,participation:inscrits?Math.round(votants/inscrits*1000)/10:0,restants:inscrits-votants,dernierVote,scrutinOuvert:scrutin.statut==="OUVERT",scrutin:{id:scrutin.id,titre:scrutin.titre,type:scrutin.type,statut:scrutin.statut},resultats};
}
