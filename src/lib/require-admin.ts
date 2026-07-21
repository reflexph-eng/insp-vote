import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export class UnauthorizedError extends Error {}

/**
 * Verifie le jeton Firebase Auth envoye par l'admin (Authorization: Bearer <idToken>).
 * Seuls les comptes crees dans Firebase Auth (console) peuvent administrer le scrutin.
 */
export async function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) throw new UnauthorizedError("Jeton manquant.");

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return decoded; // decoded.email, decoded.uid, ...
  } catch {
    throw new UnauthorizedError("Jeton invalide ou expire.");
  }
}
