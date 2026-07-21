import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

// Toutes les operations Firestore de l'application passent par ce module,
// cote serveur uniquement (routes app/api/**). Le SDK Admin contourne les
// regles de securite Firestore par conception : c'est pourquoi les regles
// Firestore (firestore.rules) refusent tout acces direct depuis le client.
//
// L'initialisation est paresseuse (a la premiere utilisation reelle, au sein
// d'une requete) plutot qu'au chargement du module : cela evite que
// `next build` echoue lorsque les variables Firebase Admin ne sont pas
// encore renseignees (ex: build local sans .env.local complet).
function getAdminApp(): App {
  if (getApps().length) return getApps()[0];

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Configuration Firebase Admin manquante. Verifiez FIREBASE_ADMIN_PROJECT_ID, " +
        "FIREBASE_ADMIN_CLIENT_EMAIL et FIREBASE_ADMIN_PRIVATE_KEY dans .env.local"
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

let _db: Firestore | null = null;
let _auth: Auth | null = null;

function getDb(): Firestore {
  if (!_db) _db = getFirestore(getAdminApp());
  return _db;
}

function getAdm(): Auth {
  if (!_auth) _auth = getAuth(getAdminApp());
  return _auth;
}

// Proxies : le code appelant continue d'ecrire `adminDb.collection(...)` et
// `adminAuth.verifyIdToken(...)` normalement, mais l'initialisation reelle
// (et donc la lecture des variables d'environnement) n'a lieu qu'au premier
// acces, dans le contexte d'une requete entrante.
export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_target, prop, receiver) {
    return Reflect.get(getAdm(), prop, receiver);
  },
});
