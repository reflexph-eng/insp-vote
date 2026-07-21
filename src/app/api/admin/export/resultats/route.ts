import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/lib/require-admin";
import { buildStats } from "@/lib/stats";

function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(";")).join("\r\n");
}

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

  const rows: string[][] = [
    ["Candidat", "Voix", "Pourcentage"],
    ...stats.resultats.map((r) => [r.nom, String(r.voix), `${r.pourcentage}%`]),
    [],
    ["Inscrits", String(stats.inscrits)],
    ["Votants", String(stats.votants)],
    ["Participation", `${stats.participation}%`],
  ];

  const csv = "\uFEFF" + toCsv(rows); // BOM pour Excel (accents)

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="resultats-insp-vote.csv"`,
    },
  });
}
