import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin, UnauthorizedError } from "@/lib/require-admin";
import { parseElecteursWorkbook } from "@/lib/electeur-import";
import { FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let admin;
  try {
    admin = await requireAdmin(req);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    throw err;
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const mode = String(formData.get("mode") ?? "preview");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "fichier_requis" }, { status: 400 });
  }

  let parsed;
  try {
    parsed = parseElecteursWorkbook(Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    const message = err instanceof Error ? err.message : "fichier_invalide";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }

  if (mode === "preview") {
    return NextResponse.json({ ok: true, preview: true, analysis: parsed.analysis });
  }

  if (mode !== "commit") {
    return NextResponse.json({ ok: false, error: "mode_invalide" }, { status: 400 });
  }

  let ajoutes = 0;
  let ignores = 0;
  const erreurs = [...parsed.analysis.erreurs];
  const BATCH_SIZE = 400;

  for (let i = 0; i < parsed.electeurs.length; i += BATCH_SIZE) {
    const chunk = parsed.electeurs.slice(i, i + BATCH_SIZE);
    const refs = chunk.map((electeur) => adminDb.collection("electeurs").doc(electeur.matricule));
    const existingSnapshots = refs.length > 0 ? await adminDb.getAll(...refs) : [];
    const batch = adminDb.batch();
    let opsInBatch = 0;

    for (let index = 0; index < chunk.length; index += 1) {
      const electeur = chunk[index];
      const ref = refs[index];
      const existing = existingSnapshots[index];

      if (existing?.exists) {
        ignores += 1;
        continue;
      }

      const normalizedMatch = await adminDb
        .collection("electeurs")
        .where("matriculeNormalise", "==", electeur.matriculeNormalise)
        .limit(1)
        .get();

      if (!normalizedMatch.empty) {
        ignores += 1;
        continue;
      }

      batch.set(ref, {
        matricule: electeur.matricule,
        matriculeNormalise: electeur.matriculeNormalise,
        ...(electeur.matriculeOriginal ? { matriculeOriginal: electeur.matriculeOriginal } : {}),
        matriculeGenere: electeur.matriculeGenere,
        nom: electeur.nom,
        prenom: electeur.prenom,
        aVote: false,
        dateVote: null,
      });
      opsInBatch += 1;
      ajoutes += 1;
    }

    if (opsInBatch > 0) await batch.commit();
  }

  await adminDb.collection("journalAdmin").add({
    action: "import_electeurs",
    detail: `${ajoutes} ajoutes, ${ignores} ignores, ${parsed.analysis.matriculesGeneres} matricules generes, ${parsed.analysis.doublons} doublons fichier`,
    date: FieldValue.serverTimestamp(),
    admin: admin.email ?? admin.uid,
  });

  return NextResponse.json({
    ok: true,
    preview: false,
    ajoutes,
    ignores,
    erreurs,
    analysis: parsed.analysis,
  });
}
