import { NextResponse } from "next/server";
import { getActiveScrutin } from "@/lib/scrutin";
export async function GET(){const s=await getActiveScrutin();return NextResponse.json({ok:true,scrutin:{id:s.id,titre:s.titre,type:s.type,statut:s.statut}});}
