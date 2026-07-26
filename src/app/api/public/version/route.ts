import { NextResponse } from "next/server";
import { getLiveVersion } from "@/lib/live-version";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const version = await getLiveVersion();
    return NextResponse.json(
      { ok: true, version },
      { headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "version_indisponible" },
      { status: 503 },
    );
  }
}
