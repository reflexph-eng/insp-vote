import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin, UnauthorizedError } from "@/lib/require-admin";
import { getActiveScrutin } from "@/lib/scrutin";
import { createSimplePdf, paginateLines, type PdfLine } from "@/lib/simple-pdf";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
    }
    throw error;
  }

  const [scrutin, snapshot] = await Promise.all([
    getActiveScrutin(),
    adminDb.collection("electeurs").orderBy("nom").get(),
  ]);
  const bodyLines: PdfLine[] = snapshot.docs.flatMap((doc, index) => {
    const data = doc.data();
    return [{ text: `${String(index + 1).padStart(3, "0")}. ${data.matricule} | ${data.nom} ${data.prenom ?? ""}` }];
  });
  const chunks = paginateLines(bodyLines, 42);
  const pages = chunks.map((chunk, index) => [
    { text: "INSTITUT NATIONAL DE SANTÉ PUBLIQUE", bold: true, size: 14 },
    { text: "LISTE ÉLECTORALE", bold: true, size: 13 },
    { text: scrutin.titre, bold: true, size: 11 },
    { text: `Total inscrits : ${snapshot.size} | Page ${index + 1}/${chunks.length}` },
    { text: "" },
    ...chunk,
  ] satisfies PdfLine[]);

  const pdf = createSimplePdf(pages);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="liste-electorale-insp-vote.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
