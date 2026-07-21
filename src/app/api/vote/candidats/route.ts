import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { getActiveScrutin } from "@/lib/scrutin";
export async function GET(){const s=await getActiveScrutin();const snap=await adminDb.collection("candidats").where("scrutinId","==",s.id).where("actif","==",true).get();const candidats=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a:any,b:any)=>(a.ordre??0)-(b.ordre??0));return NextResponse.json({ok:true,candidats,scrutinTitre:s.titre});}
