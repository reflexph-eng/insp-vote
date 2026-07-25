# Patch UX/UI et contrôle du scrutin — INSP VOTE

## Fonctionnalités ajoutées
- Liste des noms et matricules ayant voté, avec date/heure et recherche.
- Annulation d’un vote avec motif obligatoire, invalidation du bulletin et restauration du droit de vote.
- Journal d’audit administrateur consultable.
- Dashboard enrichi : progression, graphique horaire, votes annulés et reprises.
- Statuts OUVERT, SUSPENDU et FERME.
- Résultats avec barres de progression.
- Export Excel complet : résultats, émargement, annulations et journal.
- PDF des résultats restructuré comme procès-verbal institutionnel.

## Sécurité importante
Les nouveaux votes créent une référence de révocation réservée au serveur. Elle permet d’invalider le bulletin sans afficher le choix à l’administrateur.

Les votes enregistrés avant l’installation de ce patch ne possèdent pas cette référence. Leur annulation est volontairement bloquée afin d’éviter de fausser les résultats. Pour tester l’annulation, utilisez un vote effectué après déploiement du patch.

## Déploiement
1. Remplacer les fichiers du projet par ceux du patch.
2. Ne pas remplacer les variables d’environnement de production.
3. Déployer sur Vercel.
4. Effectuer un vote de test, puis tester l’annulation et la reprise.

## Contrôle effectué
- Vérification TypeScript avec `tsc --noEmit` : réussie.
- Le build Next.js n’a pas pu être finalisé dans l’environnement de génération, car le binaire SWC distant était temporairement indisponible (erreur HTTP 503), et non à cause d’une erreur TypeScript du projet.
