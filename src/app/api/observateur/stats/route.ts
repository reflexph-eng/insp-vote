import { NextResponse } from "next/server";
import { buildStats } from "@/lib/stats";

// Route publique, en lecture seule : aucune authentification, aucune action
// possible. Reutilise le meme calcul que le tableau de bord admin.
export async function GET() {
  const stats = await buildStats();
  return NextResponse.json({ ok: true, stats });
}
