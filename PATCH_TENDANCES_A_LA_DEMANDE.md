# Patch — Tendances à la demande

## Fonctionnalité ajoutée

Un nouveau lien **Tendances** est disponible dans le menu d'administration.

La page affiche, sans photo :

- le classement provisoire des candidats ;
- le nombre de voix de chaque candidat ;
- le pourcentage de chaque candidat ;
- une barre de progression ;
- le candidat actuellement en tête ;
- l'écart entre le premier et le deuxième ;
- la participation, les votants et les électeurs restants ;
- les votes nuls lorsqu'ils existent.

## Protection du quota Spark

- aucun rafraîchissement automatique sur la page Tendances ;
- chargement seulement à l'ouverture de la rubrique ;
- nouvelle lecture uniquement après clic sur **Actualiser les tendances** ;
- utilisation de requêtes agrégées Firestore ;
- aucune lecture complète de la collection des votes ;
- aucun upload ni affichage de photo.

## Sécurité

La route `/api/admin/tendances` exige une authentification administrateur.
