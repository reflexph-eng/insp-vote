# Optimisation Firestore — 2 administrateurs

Version préparée pour un scrutin de 445 électeurs, dimensionnée avec une marge jusqu'à 600 électeurs.

## Changements appliqués

- Rafraîchissement des statistiques Admin toutes les 60 secondes au lieu de 30 secondes.
- Une seule requête de statistiques peut être en cours à la fois.
- Arrêt des rafraîchissements automatiques lorsque l'onglet est masqué.
- Reprise immédiate à la réouverture de l'onglet.
- Au chargement de l'administration, seule la statistique légère est appelée.
- Les listes Scrutins, Électeurs, Candidats, Votants et Journal sont chargées uniquement quand leur rubrique est ouverte.
- Après une action administrative, seules les statistiques et la rubrique concernée sont rechargées.
- Cache serveur des statistiques porté à 30 secondes.
- Page publique et page Observateur : rafraîchissement toutes les 60 secondes, suspension en arrière-plan et protection contre les requêtes simultanées.

## Utilisation recommandée le jour du scrutin

- Deux administrateurs peuvent garder le tableau de bord ouvert.
- Éviter de laisser ouvertes en permanence les rubriques Électeurs, Votants ou Journal.
- Ouvrir ces rubriques uniquement lorsqu'une vérification ou une action est nécessaire.
- Ne pas multiplier les onglets du navigateur.

## Installation

1. Copier le fichier `.env.local` de l'ancienne version dans ce dossier.
2. Exécuter `npm install`.
3. Exécuter `npm run dev` pour le test local.
4. Exécuter `npm run build` avant déploiement.
5. Déployer sur Vercel.
