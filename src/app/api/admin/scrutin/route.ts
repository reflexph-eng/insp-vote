import { invalidateStatsCache } from "@/lib/stats";
import { invalidateActiveScrutinCache } from "@/lib/scrutin";
import { NextRequest,NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin,UnauthorizedError } from "@/lib/require-admin";
import { getActiveScrutin } from "@/lib/scrutin";
import { FieldValue } from "firebase-admin/firestore";
export async function POST(req:NextRequest){let a;try{a=await requireAdmin(req)}catch(e){if(e instanceof UnauthorizedError)return NextResponse.json({ok:false,error:e.message},{status:401});throw e}const b=await req.json();const statut=["OUVERT","SUSPENDU","FERME"].includes(b.statut)?b.statut:(b.open?"OUVERT":"FERME");const motif=String(b.motif||"").trim();if(statut==="SUSPENDU"&&!motif)return NextResponse.json({ok:false,error:"motif_requis"},{status:400});const s=await getActiveScrutin();const now=new Date().toISOString();await adminDb.collection("scrutins").doc(s.id).set({statut,...(statut==="OUVERT"?{dateOuverture:now}:statut==="FERME"?{dateFermeture:now}:{})},{merge:true});await adminDb.collection("journalAdmin").add({action:statut==="OUVERT"?"ouverture_reprise_scrutin":statut==="SUSPENDU"?"suspension_scrutin":"fermeture_scrutin",detail:s.id,motif,date:FieldValue.serverTimestamp(),admin:a.email??a.uid});invalidateActiveScrutinCache();invalidateStatsCache();return NextResponse.json({ok:true});}
