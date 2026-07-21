import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/lib/require-admin";
import { buildStats } from "@/lib/stats";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    throw err;
  }

  const stats = await buildStats();
  return NextResponse.json({ ok: true, stats });
}
