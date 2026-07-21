import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, UnauthorizedError } from "@/lib/require-admin";
import { buildStats } from "@/lib/stats";
import { createSimplePdf, type PdfLine } from "@/lib/simple-pdf";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
    }
    throw error;
  }

  const stats = await buildStats();
  const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeStyle: "short" }).format(new Date());
  const winner = stats.resultats.filter((item) => item.candidatId !== null)[0];
  const lines: PdfLine[] = [
    { text: "INSTITUT NATIONAL DE SANTÉ PUBLIQUE", bold: true, size: 15 },
    { text: "INSP VOTE - PROCÈS-VERBAL DES RÉSULTATS", bold: true, size: 13 },
    { text: "" },
    { text: stats.scrutin.titre, bold: true, size: 14 },
    { text: `Nature du scrutin : ${stats.scrutin.type}` },
    { text: `Statut : ${stats.scrutin.statut}` },
    { text: `Document généré le : ${date}` },
    { text: "" },
    { text: "SYNTHÈSE DE LA PARTICIPATION", bold: true, size: 12 },
    { text: `Nombre d'inscrits : ${stats.inscrits}` },
    { text: `Nombre de votants : ${stats.votants}` },
    { text: `Taux de participation : ${stats.participation}%` },
    { text: `Nombre de non-votants : ${stats.restants}` },
    { text: `Dernier vote enregistré : ${stats.dernierVote ?? "Aucun"}` },
    { text: "" },
    { text: "RÉSULTATS DÉTAILLÉS", bold: true, size: 12 },
    ...stats.resultats.flatMap((result, index) => [
      { text: `${index + 1}. ${result.nom}`, bold: true } satisfies PdfLine,
      { text: `${result.voix} voix - ${result.pourcentage}%`, indent: 16 } satisfies PdfLine,
    ]),
    { text: "" },
    { text: winner ? `Candidat arrivé en tête : ${winner.nom} avec ${winner.voix} voix (${winner.pourcentage}%).` : "Aucun candidat ne peut être déclaré en tête.", bold: true },
    { text: "" },
    { text: "Le présent document est généré automatiquement par INSP VOTE." },
    { text: "Signatures / validation de la commission électorale :" },
    { text: "" },
    { text: "Président de séance : ______________________________" },
    { text: "Rapporteur : ________________________________________" },
    { text: "Observateur(s) : ____________________________________" },
  ];

  const pdf = createSimplePdf([lines]);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="resultats-officiels-insp-vote.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
