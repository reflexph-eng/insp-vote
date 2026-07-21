import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin, UnauthorizedError } from "@/lib/require-admin";

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

  const snap = await adminDb.collection("electeurs").orderBy("nom").get();

  const rows: string[][] = [
    ["Matricule", "Nom", "Prenom", "A vote", "Date du vote"],
    ...snap.docs.map((doc) => {
      const d = doc.data();
      return [d.matricule, d.nom, d.prenom, d.aVote ? "Oui" : "Non", d.dateVote ?? ""];
    }),
  ];

  const csv = "\uFEFF" + toCsv(rows);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="emargement-insp-vote.csv"`,
    },
  });
}
