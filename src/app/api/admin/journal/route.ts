import { NextRequest,NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin,UnauthorizedError } from "@/lib/require-admin";
export async function GET(req:NextRequest){try{await requireAdmin(req)}catch(e){if(e instanceof UnauthorizedError)return NextResponse.json({ok:false,error:e.message},{status:401});throw e}const snap=await adminDb.collection("journalAdmin").orderBy("date","desc").limit(500).get();return NextResponse.json({ok:true,journal:snap.docs.map(d=>{const x=d.data();return{id:d.id,...x,date:x.date?.toDate?.().toISOString?.()??x.date??null}})});}
