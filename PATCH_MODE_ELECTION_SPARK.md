# Patch Mode Élection — Spark optimisé

## Objectif
Réduire les lectures Firestore pendant le scrutin avec deux administrateurs et un écran public.

## Fonctionnement
- Un document léger `system/live` contient uniquement un numéro de version.
- Après chaque vote, annulation ou changement d’état du scrutin, cette version est incrémentée.
- Les pages Admin, Statistiques publiques et Observateur vérifient seulement cette version toutes les 60 secondes.
- Les statistiques complètes ne sont rechargées que lorsque la version a changé.
- Les vérifications sont suspendues lorsque l’onglet du navigateur est masqué.
- Une protection empêche les requêtes simultanées en doublon.

## Consommation estimée du contrôle de version
Pour 9 heures avec 2 administrateurs et 1 écran public :
- 540 contrôles par écran
- 1 620 lectures légères au total

Les listes détaillées restent chargées uniquement à l’ouverture de leur rubrique.

## Vérifications réalisées
- `npx tsc --noEmit` : réussi.
- `npm run build` : compilation lancée, mais l’environnement de test n’a pas pu télécharger le binaire SWC de Next.js (HTTP 503). Ce blocage est externe au code.

## Déploiement
Conserver le fichier `.env.local` existant, puis exécuter :

```bash
npm install
npm run build
git add .
git commit -m "Mode Election Spark optimise"
git push origin main
```

Vercel redéploiera automatiquement le projet déjà connecté.
