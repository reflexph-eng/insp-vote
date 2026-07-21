# INSP VOTE

Application de vote electronique — Election du President de la Mutuelle,
Institut National de Sante Publique.

Sprint 1 execute selon le cahier des charges verrouille : Next.js 15, TypeScript,
Tailwind, Firebase (Auth admin + Firestore), Vercel, sans Firebase Storage.

## Stack

- Next.js 15.5 (App Router) + TypeScript strict
- Tailwind CSS
- Firebase Auth (administration uniquement) + Firestore (via Firebase Admin SDK, cote serveur)
- xlsx (import Excel des electeurs)

## Architecture de securite (a savoir avant de deployer)

Le navigateur n'accede **jamais** directement a Firestore. Toutes les lectures
et ecritures passent par les routes `/api/**` de Next.js, qui utilisent le SDK
Firebase Admin (cle de compte de service). Consequences :

- `firestore.rules` refuse tout acces client direct (`allow read, write: if false`).
- Un vote est soumis avec un jeton signe (HMAC) emis apres verification du
  matricule — impossible de forger un vote pour un autre matricule sans ce
  jeton.
- Le document d'un vote (`votes/{id}`) ne contient **jamais** le matricule :
  le secret du vote est garanti par le modele de donnees, pas seulement par
  les regles d'acces.
- Chaque vote passe par une transaction Firestore qui verifie a nouveau,
  au moment de l'ecriture : matricule existant, scrutin ouvert, pas deja vote.
- Les actions admin (ouverture/fermeture du scrutin, gestion des candidats,
  import) sont journalisees dans la collection `journalAdmin`.

## Mise en route

### 1. Installer les dependances

```bash
npm install
```

### 2. Creer un projet Firebase

Dans la [console Firebase](https://console.firebase.google.com) :

1. Creer un projet.
2. Activer **Authentication > Email/Password**, puis creer un compte
   pour chaque administrateur (Authentication > Users > Add user).
3. Activer **Firestore Database** (mode production).
4. Deployer les regles du fichier `firestore.rules` fourni.
5. Recuperer la config web : Parametres du projet > Vos applications > Web.
6. Generer une cle de compte de service : Parametres du projet > Comptes de
   service > Generer une nouvelle cle privee (fichier JSON).

### 3. Variables d'environnement

Copier `.env.example` en `.env.local` et remplir :

```bash
cp .env.example .env.local
```

- Les `NEXT_PUBLIC_FIREBASE_*` viennent de la config web (etape 5).
- Les `FIREBASE_ADMIN_*` viennent du JSON du compte de service (etape 6) :
  `project_id`, `client_email`, `private_key` (conserver les `\n`).
- `SESSION_SECRET` : une chaine aleatoire longue (ex: `openssl rand -hex 32`).

### 4. Initialiser les donnees Firestore

Deux documents/collections a creer manuellement (console Firebase ou script) :

- `configuration/etat` → `{ scrutinOuvert: false, dateOuverture: null, dateFermeture: null }`
- `candidats/{id}` → `{ nom, photo: null, ordre: 0, actif: true }` (un document par candidat)

Les electeurs sont ensuite ajoutes via **Administration > Import Excel**
(colonnes `matricule`, `nom`, `prenom`).

### 5. Remplacer le logo

Le fichier `public/logo-insp.png` est un sceau de substitution genere pour ce
livrable. Remplacer par le logo officiel de l'INSP (meme nom de fichier,
format PNG recommande carre, fond transparent).

### 6. Lancer en local

```bash
npm run dev
```

### 7. Deployer sur Vercel

```bash
vercel
```

Renseigner les memes variables d'environnement dans Vercel (Project Settings
> Environment Variables), puis redeployer.

## Pages

| Route | Description |
|---|---|
| `/` | Accueil — saisie du matricule |
| `/vote` | Selection du candidat et validation irreversible |
| `/admin/login` puis `/admin` | Tableau de bord administrateur (connexion Firebase Auth requise) |
| `/observateur` | Statistiques et resultats en lecture seule, sans connexion |

## Points d'attention pour la mise a l'echelle

- Le calcul des statistiques (`/api/admin/stats`, `/api/observateur/stats`)
  relit l'integralite des collections `electeurs` et `votes` a chaque appel.
  Pour un scrutin de quelques milliers d'electeurs, cela reste tres rapide ;
  au-dela, envisager des compteurs denormalises mis a jour a chaque vote.
- L'import Excel verifie chaque matricule un par un pour eviter d'ecraser un
  electeur ayant deja vote. Pour des fichiers de plusieurs dizaines de
  milliers de lignes, ce point peut etre optimise avec des lectures groupees.

## Licence des polices

Fraunces et Inter sont auto-hebergees (`src/app/fonts/`) sous licence SIL
Open Font License (voir `OFL-Fraunces.txt` et `OFL-Inter.txt`).

## Patch 2.0 — Multi-scrutins
- Scrutin initial : ÉLECTION DU PRÉSIDENT DE LA MUTUELLE DES AGENTS DE L’INSP (MAINSP)
- Création/activation/modification/suppression de scrutins de test
- Ajout et suppression manuelle d’électeurs
- Candidats, participations et votes séparés par scrutin
- Un électeur peut voter une fois par scrutin
- Suppression d’un électeur refusée dès qu’il a participé à un scrutin
