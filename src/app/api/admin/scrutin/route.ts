import { NextRequest,NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin,UnauthorizedError } from "@/lib/require-admin";
import { getActiveScrutin } from "@/lib/scrutin";
import { FieldValue } from "firebase-admin/firestore";
export async function POST(req:NextRequest){let a;try{a=await requireAdmin(req)}catch(e){if(e instanceof UnauthorizedError)return NextResponse.json({ok:false,error:e.message},{status:401});throw e}const open=Boolean((await req.json()).open);const s=await getActiveScrutin();const now=new Date().toISOString();await adminDb.collection("scrutins").doc(s.id).set({statut:open?"OUVERT":"FERME",...(open?{dateOuverture:now}:{dateFermeture:now})},{merge:true});await adminDb.collection("journalAdmin").add({action:open?"ouverture_scrutin":"fermeture_scrutin",detail:s.id,date:FieldValue.serverTimestamp(),admin:a.email??a.uid});return NextResponse.json({ok:true});}
