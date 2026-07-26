# INSP VOTE — Audit Firestore & Durcissement Élection Réelle (445–550 électeurs)

Date : 26 juillet 2026
Portée : audit complet du projet fourni (`insp-vote__4_.zip`), puis application
exclusive des optimisations à **risque Faible**. Toute optimisation à risque
Moyen ou Élevé est documentée en fin de rapport, **non implémentée**.

Aucune règle métier, aucun modèle de données, aucune transaction de vote,
aucune règle de sécurité n'a été modifiée. Le comportement observable de
l'application reste strictement identique, à trois exceptions volontaires et
explicitement demandées : la disposition des cartes sur la page de vote
(LOT 10), la correction d'un écart entre le texte affiché et le comportement
réel de l'onglet Tendances, et un correctif de build (détaillé plus bas).

---

## 1. Méthodologie

Tous les fichiers TypeScript/TSX du projet (31 fichiers, routes API, pages,
composants, bibliothèques) ont été lus intégralement avant toute modification,
conformément à la RÈGLE N°1. Un grep exhaustif a confirmé :

- **Aucun `onSnapshot`** dans tout le projet (aucun listener temps réel).
- **3 boucles de sondage** seulement, toutes à 60 secondes (`/admin`,
  `/statistiques`, `/observateur`).
- **2 transactions Firestore** (`vote/submit`, `votes/annuler`).

Un build de référence (`next build`) a été lancé avant toute modification.
Il a révélé un bug de build préexistant (voir §5).

---

## 2. Tableau d'audit — LOT 1

| Fichier / mécanisme | Nature | Fréquence | Classification |
|---|---|---|---|
| `lib/stats.ts` → `buildStats()` | 6 requêtes `count()` agrégées (inscrits, votants, annulations, N candidats, nuls) | ~1x par vote (invalidation immédiate) + cache serveur 30s | ✅ indispensable — déjà optimal (voir §6) |
| `lib/scrutin.ts` → `getActiveScrutin()` | 1-2 `get()`, cache 30s | à la demande | ✅ indispensable |
| `lib/live-version.ts` → `getLiveVersion()` | 1 `get()` | 1x/60s/écran actif | ⚠ optimisable — **corrigé** (cache 5s ajouté) |
| `lib/scrutin.ts` → `ensureDefaultScrutin()` | jusqu'à 2 `get()` | à **chaque** ouverture de l'onglet Scrutins (bug : le commentaire du code dit explicitement de ne pas faire ça) | ⚠ optimisable — **corrigé** (garde en mémoire) |
| `api/vote/submit` (transaction) | 3-4 lectures, 5 écritures | 1x par vote | ✅ indispensable — logique métier, non touchée |
| `api/electeur/verify` | 1 à 5 lectures selon variante du matricule | 1x par tentative | ✅ indispensable — conception déjà coût-optimale (voir §6), à ne pas paralléliser |
| `api/vote/candidats` | 1 requête (2-4 docs) | 1x par électeur arrivant sur `/vote` | ✅ indispensable |
| `api/admin/electeurs` (GET) | jusqu'à 1000 lectures, collection complète | à chaque ouverture d'onglet | ⚠ optimisable — **corrigé** (cache 20s + invalidation sur écriture) |
| `api/admin/votants` (GET) | jusqu'à ~2×N lectures (participations + électeurs) + recherche O(N²) en mémoire | à chaque ouverture d'onglet | ⚠ optimisable — **corrigé** (cache 20s + invalidation sur annulation + Map O(1)) |
| `api/admin/journal` (GET) | jusqu'à 500 lectures | à chaque ouverture d'onglet | ⚠ optimisable — **corrigé** (cache 20s, TTL seul) |
| `api/admin/scrutins` (GET) | petite collection + `ensureDefaultScrutin()` | à chaque ouverture d'onglet | ⚠ optimisable — voir ligne `ensureDefaultScrutin` |
| `api/admin/candidats`, `scrutin`, `votes/annuler` | faible volume | actions ponctuelles | ✅ indispensable |
| `api/admin/import` | lecture par lots (`getAll`), déjà groupée | quelques fois (setup) | ✅ indispensable |
| `api/admin/export/*` (PDF/CSV/Excel) | lectures complètes (électeurs, participations, journal) | actions ponctuelles, déclenchées manuellement | ✅ indispensable — fréquence trop faible pour justifier un cache |
| `admin/page.tsx` — onglet **Tendances** | `buildStats(true)` forcé | déclenché **automatiquement à l'ouverture de l'onglet**, alors que le texte affiché promet "aucun rafraîchissement automatique" | ❌ incohérence — **corrigée** |
| Hooks React (`useCallback`, `useMemo`, gardes anti-doublon, pause sur onglet masqué) | — | — | ✅ indispensable — déjà bien conçus, aucun re-render superflu détecté |
| Dossiers vides `{vote,admin...}`, `{components,lib}` | résidus `mkdir` Windows | — | ❌ inutile — **supprimés** |
| Logs de debug, `TODO`/`FIXME`, imports d'icônes inutilisés | — | — | ❌ inutile — **aucun trouvé**, rien à supprimer |
| `Stats.progression` (graphique horaire) | toujours `[]` par conception (désactivé pour économiser des lectures) | — | ⚠ observation — section d'interface qui ne peut jamais afficher de données ; **non retirée** (décision produit, pas une pure optimisation technique) |

---

## 3. Corrections appliquées (risque Faible)

Chaque changement ci-dessous est isolé, réversible, et ne touche à aucune
transaction, aucune règle de sécurité, aucun modèle de données.

1. **Cache 20s sur `/api/admin/electeurs`** (GET), invalidé après ajout,
   suppression ou import. Fichier ajouté : `src/lib/electeurs-cache.ts`.
2. **Cache 20s sur `/api/admin/votants`** (GET), invalidé après annulation de
   vote. Recherche de participation passée d'un scan O(N²) à une `Map` O(1).
   Fichier ajouté : `src/lib/votants-cache.ts`.
3. **Cache 20s sur `/api/admin/journal`** (GET), TTL seul (sans invalidation
   croisée, pour limiter la surface de modification).
4. **`ensureDefaultScrutin()`** ne relit plus 2 documents à chaque ouverture de
   l'onglet Scrutins : une garde en mémoire fait que la vérification n'a lieu
   qu'une fois par instance serveur active.
5. **`getLiveVersion()`** mis en cache 5 secondes : plusieurs visiteurs qui
   consultent la version au même moment partagent une seule lecture au lieu
   d'une lecture chacun. Sans effet perceptible (le sondage client reste à 60s).
6. **Onglet Tendances** : l'ouverture de l'onglet ne déclenche plus de
   rafraîchissement automatique (`buildStats(true)`) — seul le bouton
   « Actualiser les tendances » le fait désormais, exactement comme annoncé à
   l'écran.
7. **Bug de build corrigé** : `live-version.ts` construisait sa référence
   Firestore au chargement du module (`const LIVE_REF = adminDb...`), ce qui
   empêchait `next build` de collecter les données de page dès que les
   identifiants Firebase Admin n'étaient pas encore disponibles — cause
   probable des échecs de build mentionnés dans `PATCH_MODE_ELECTION_SPARK.md`.
   La référence est maintenant construite paresseusement, comme partout
   ailleurs dans le projet.
8. **Nettoyage** : suppression des dossiers vides résiduels
   (`src/app/{vote,admin...}`, `src/{components,lib}`), sans effet sur le
   fonctionnement.
9. **LOT 10 — Disposition de la page de vote** : `CandidateCard` redessiné en
   carte compacte verticale (photo/icône en haut, nom en dessous, badge de
   sélection en coin), et la page de vote utilise désormais une grille
   `grid-cols-3` au lieu d'un empilement vertical. Les 3 choix (candidat 1,
   candidat 2, vote nul) restent visibles sans défilement sur mobile, tablette
   et desktop. Le bouton « Valider mon vote » n'a pas été modifié. Aucune
   logique métier touchée.
10. **Hygiène** : Next.js passé de 15.5.21 à 15.5.22 (patch mineur, même ligne
    de version, aucune rupture de compatibilité). Point hors périmètre des
    LOTs demandés, signalé par prudence.

### Fichiers modifiés ou ajoutés

```
modifié   src/lib/live-version.ts
modifié   src/lib/scrutin.ts
modifié   src/app/api/admin/electeurs/route.ts
modifié   src/app/api/admin/votants/route.ts
modifié   src/app/api/admin/journal/route.ts
modifié   src/app/api/admin/import/route.ts
modifié   src/app/api/admin/votes/annuler/route.ts
modifié   src/app/admin/page.tsx            (fonction openSection uniquement)
modifié   src/app/vote/page.tsx             (disposition uniquement)
modifié   src/components/CandidateCard.tsx  (disposition uniquement)
modifié   package.json                      (next 15.5.21 → 15.5.22)
ajouté    src/lib/electeurs-cache.ts
ajouté    src/lib/votants-cache.ts
supprimé  dossiers vides résiduels
```

---

## 4. Optimisations à risque Moyen ou Élevé — documentées, NON appliquées

### 4.1 — Risque Moyen : compteur `system/live` en document unique ("hot document")

Chaque vote et chaque action administrateur incrémente le même document
(`system/live`) à l'intérieur d'une transaction. Firestore verrouille au
niveau du document : si de nombreux votes arrivaient de façon quasi
simultanée (rush en tout début de scrutin), ces transactions pourraient entrer
en conflit et se relancer automatiquement (comportement standard du SDK, pas
un bug), avec un impact potentiel sur la latence.

**Solution standard** : compteur shardé (répartir l'incrément sur plusieurs
sous-documents choisis aléatoirement, additionnés à la lecture). **Non
appliqué** : cela restructure un mécanisme central utilisé par toutes les
routes d'écriture, avec un risque de régression disproportionné par rapport au
bénéfice réel pour 445-550 électeurs répartis sur une journée. À envisager
uniquement si un usage à très forte concurrence (ex : vote obligatoire sur un
créneau de quelques minutes) était prévu.

### 4.2 — Risque Moyen : invalidation systématique du cache de statistiques à chaque vote

`invalidateStatsCache()` est appelé à chaque vote, ce qui force une
reconstruction complète des statistiques (6 requêtes `count()`) dès la
prochaine consultation — indépendamment du cache de 30 secondes. C'est ce qui
explique la majeure partie du volume de lectures estimé (§5) : environ une
reconstruction par vote.

**Option de réduction** : laisser le cache de 30s gouverner naturellement la
fraîcheur, sans invalidation forcée à chaque vote. Cela plafonnerait le nombre
de reconstructions à au plus une toutes les 30 secondes, quel que soit le
rythme des votes, réduisant potentiellement ce poste de plusieurs milliers de
lectures.

**Non appliqué** : cela change un comportement observable — un administrateur
qui rafraîchit juste après un vote pourrait voir un chiffre vieux de 30
secondes au lieu du chiffre immédiat actuel. Plusieurs correctifs précédents
(`PATCH_2.1.md` notamment) ont explicitement recherché ce retour immédiat.
Modifier ce point sans validation reviendrait à changer un choix produit
déjà fait consciemment.

### 4.3 — Risque Moyen à Élevé : pagination des listes Électeurs / Votants

Réduirait le coût par ouverture d'onglet, mais changerait l'expérience de
recherche actuelle (recherche instantanée sur la liste chargée en mémoire).
**Non appliqué.**

---

## 5. Estimation lectures / écritures — scrutin de 445 à 550 électeurs

### Partie déterministe (proportionnelle au nombre de votants, incompressible)

| Poste | Détail | Lectures | Écritures |
|---|---|---:|---:|
| Vérification matricule | 1 à 2 lectures/tentative en cas typique | ~550 – 1 200 | — |
| Candidats (page de vote) | 1 requête/électeur (2-4 docs) | ~1 100 – 2 200 | — |
| Soumission du vote (transaction) | 3-4 lectures, 5 écritures/vote | ~1 650 – 2 200 | ~2 750 |
| **Sous-total** | | **~3 300 – 5 600** | **~2 750** |

### Partie "surveillance" (dépend de l'usage réel le jour du scrutin)

| Poste | Détail | Lectures estimées |
|---|---:|---:|
| Reconstruction des statistiques | ~6 requêtes `count()` × ~1 par vote (voir §4.2) | ~3 300 |
| Vérification de version (60s/écran actif) | 2 admins + observateurs publics, cache 5s ajouté | ~1 000 – 3 000+ selon audience |
| Ouvertures ponctuelles Électeurs/Votants/Journal | désormais cachées 20s, mais chaque ouverture "à froid" coûte jusqu'à ~550/~1100/~500 lectures | variable selon discipline opérationnelle |

### Total estimé

**Environ 8 000 à 11 000 lectures** pour l'ensemble du scrutin dans un usage
raisonnable (2 administrateurs, peu d'observateurs simultanés, sections
Électeurs/Votants/Journal consultées avec parcimonie). **~2 800 écritures.**

Ce total reste proche de l'objectif de 10 000 mais peut le dépasser si :
- de nombreux observateurs publics gardent `/statistiques` ou `/observateur`
  ouverts en continu ;
- l'onglet **Électeurs** est rouvert fréquemment pendant le scrutin (à
  réserver à la phase de préparation, comme déjà recommandé dans
  `OPTIMISATION_ADMIN_2_COMPTES.md`).

Le poste le plus significatif et le plus difficile à réduire sans risque est
la reconstruction des statistiques à chaque vote (§4.2) — c'est le seul levier
qui changerait sensiblement ce total, et il implique un compromis produit
documenté ci-dessus mais non appliqué.

---

## 6. Pourquoi certains points restent "✅ indispensables" sans changement

- **`buildStats()`** utilise déjà des requêtes `count()` agrégées : chacune
  coûte au minimum 1 lecture facturée pour 1000 entrées d'index balayées, donc
  le coût ne dépend quasiment pas du nombre d'électeurs. Télécharger les
  collections complètes serait bien pire ; ce n'est pas fait.
- **`electeur/verify`** essaie plusieurs variantes du matricule en séquence
  avec sortie anticipée dès qu'une correspondance est trouvée. Dans le cas
  courant (le matricule correspond à l'identifiant du document créé à
  l'import), une seule lecture suffit. **Paralléliser ces tentatives
  augmenterait le coût moyen** (on paierait systématiquement 3 lectures au
  lieu d'une la plupart du temps) : la conception actuelle est déjà
  coût-optimale et n'a pas été modifiée.

---

## 7. Validation effectuée

- `npm install` : réussi.
- `next build` : **réussi**, 29 routes compilées, 0 erreur TypeScript.
- `next lint` : **0 avertissement, 0 erreur**.
- Toutes les routes API, toutes les transactions et tous les composants
  React ont été relus après modification.

---

## 8. Recommandations opérationnelles pour le jour du scrutin

(Reprises et complétées à partir de vos notes précédentes, toujours valables) :

- Réserver l'onglet **Électeurs** à la phase de préparation ; l'éviter pendant
  le vote.
- Consulter **Votants** et **Journal** avec parcimonie (les caches de 20s
  aident pour les vérifications rapprochées, pas pour un usage répété toute la
  journée).
- Ne pas multiplier les onglets/écrans publics ouverts en continu.
- Les deux administrateurs peuvent garder le tableau de bord principal
  ouvert : il ne coûte plus qu'une lecture légère toutes les 60 secondes tant
  qu'aucun vote n'a eu lieu entre-temps.
