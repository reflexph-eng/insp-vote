import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/lib/require-admin";
import { buildStats } from "@/lib/stats";

/**
 * Résultats provisoires chargés uniquement à la demande depuis l'administration.
 * Aucun polling n'est associé à cette route côté interface.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    throw err;
  }

  const tendances = await buildStats(true);
  return NextResponse.json({ ok: true, tendances });
}
