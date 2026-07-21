import { NextResponse } from "next/server";
import { buildStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await buildStats();
    return NextResponse.json({
      ok: true,
      stats: {
        scrutin: stats.scrutin,
        scrutinOuvert: stats.scrutinOuvert,
        inscrits: stats.inscrits,
        votants: stats.votants,
        participation: stats.participation,
        restants: stats.restants,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "scrutin_indisponible" }, { status: 503 });
  }
}
