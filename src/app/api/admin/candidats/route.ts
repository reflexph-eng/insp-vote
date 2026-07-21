import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdmin, UnauthorizedError } from "@/lib/require-admin";
import { FieldValue } from "firebase-admin/firestore";
import { getActiveScrutin } from "@/lib/scrutin";

async function guard(req: NextRequest) {
  try {
    return await requireAdmin(req);
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: 401 });
    }
    throw err;
  }
}

export async function GET(req: NextRequest) {
  const admin = await guard(req);
  if (admin instanceof NextResponse) return admin;

  const scrutin = await getActiveScrutin();
  const snap = await adminDb.collection("candidats").where("scrutinId", "==", scrutin.id).get();
  const candidats = snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a: any, b: any) => (a.ordre ?? 0) - (b.ordre ?? 0));

  return NextResponse.json({ ok: true, candidats });
}

export async function POST(req: NextRequest) {
  const admin = await guard(req);
  if (admin instanceof NextResponse) return admin;

  const body = await req.json();
  const { nom, photo, ordre, actif } = body;
  if (!nom) {
    return NextResponse.json({ ok: false, error: "nom_requis" }, { status: 400 });
  }

  const scrutin = await getActiveScrutin();
  const ref = await adminDb.collection("candidats").add({
    scrutinId: scrutin.id,
    nom,
    photo: photo ?? null,
    ordre: typeof ordre === "number" ? ordre : 0,
    actif: actif !== false,
  });

  await adminDb.collection("journalAdmin").add({
    action: "creation_candidat",
    detail: nom,
    date: FieldValue.serverTimestamp(),
    admin: (admin as any).email ?? (admin as any).uid,
  });

  return NextResponse.json({ ok: true, id: ref.id });
}

export async function PUT(req: NextRequest) {
  const admin = await guard(req);
  if (admin instanceof NextResponse) return admin;

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) {
    return NextResponse.json({ ok: false, error: "id_requis" }, { status: 400 });
  }

  await adminDb.collection("candidats").doc(id).set(updates, { merge: true });

  await adminDb.collection("journalAdmin").add({
    action: "modification_candidat",
    detail: id,
    date: FieldValue.serverTimestamp(),
    admin: (admin as any).email ?? (admin as any).uid,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await guard(req);
  if (admin instanceof NextResponse) return admin;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "id_requis" }, { status: 400 });
  }

  const votesForCandidat = await adminDb
    .collection("votes")
    .where("candidatId", "==", id)
    .limit(1)
    .get();

  if (!votesForCandidat.empty) {
    return NextResponse.json(
      { ok: false, error: "candidat_deja_vote_impossible_a_supprimer" },
      { status: 409 }
    );
  }

  await adminDb.collection("candidats").doc(id).delete();

  await adminDb.collection("journalAdmin").add({
    action: "suppression_candidat",
    detail: id,
    date: FieldValue.serverTimestamp(),
    admin: (admin as any).email ?? (admin as any).uid,
  });

  return NextResponse.json({ ok: true });
}
