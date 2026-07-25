# Audit urgent Firestore — INSP VOTE

## Cause racine confirmée

Le dépassement des 50 000 lectures/jour venait principalement du rafraîchissement automatique de la page Admin toutes les 15 secondes. À chaque cycle, six API étaient rappelées, dont :

- `/api/admin/electeurs` : jusqu'à 1 000 documents lus ;
- `/api/admin/votants` : participations + relecture des fiches électeurs ;
- `/api/admin/journal` : jusqu'à 500 documents lus ;
- `/api/admin/stats` : anciennes statistiques relisant entièrement électeurs, votes, participations et annulations ;
- `/api/admin/scrutins` et `/api/admin/candidats` : lectures supplémentaires du scrutin actif.

Une seule page Admin ouverte pouvait donc consommer plusieurs milliers de lectures par minute selon le volume de données.

## Correctifs appliqués

1. Le rafraîchissement automatique Admin ne recharge plus que `/api/admin/stats` toutes les 30 secondes.
2. Les listes électeurs, votants, candidats, scrutins et journal ne sont chargées qu'à l'ouverture ou après une action explicite.
3. Les statistiques utilisent désormais les agrégations `count()` Firestore au lieu de télécharger toutes les collections.
4. Le scrutin actif est mis en cache 30 secondes côté serveur.
5. Les statistiques sont mises en cache 10 secondes côté serveur.
6. Le cache est invalidé immédiatement après un vote, une annulation ou un changement d'état du scrutin.
7. Les réponses API vides ou non JSON ne font plus tomber toute la page Admin.
8. Les pages Statistiques et Observateur passent de 15 à 30 secondes.
9. Le graphe horaire temps réel est désactivé afin d'éviter la lecture complète de toutes les participations. Les résultats et compteurs restent disponibles.

## Consommation attendue après correction

Avec quelques candidats, une actualisation statistique coûte désormais seulement quelques lectures d'agrégation et quelques lectures de configuration, au lieu de centaines ou milliers de documents.

## Important avant le scrutin

- Le quota Spark déjà dépassé ne revient pas immédiatement : attendre la réinitialisation quotidienne Firebase ou passer temporairement au plan Blaze.
- Ne pas laisser tourner l'ancienne version du serveur.
- Installer cette version, arrêter puis relancer `npm run dev`.
- Vérifier pendant 10 minutes que le compteur de lectures n'augmente plus brutalement.
- Faire un test complet avec un scrutin TEST avant d'ouvrir l'officiel.
