export interface Electeur { matricule:string; nom:string; prenom:string; aVote?:boolean; dateVote?:string|null; }
export interface Candidat { id:string; nom:string; photo:string|null; ordre:number; actif:boolean; scrutinId?:string; }
export interface VoteDoc { candidatId:string|null; date:string; scrutinId:string; }
export type ScrutinStatut = "OUVERT"|"SUSPENDU"|"FERME";
export interface Scrutin { id:string; titre:string; type:"TEST"|"OFFICIEL"; statut:ScrutinStatut; actif:boolean; archive:boolean; dateCreation:string; dateOuverture:string|null; dateFermeture:string|null; }
export interface Stats { inscrits:number; votants:number; participation:number; restants:number; dernierVote:string|null; scrutinOuvert:boolean; votesAnnules:number; reprisesVote:number; progression:{heure:string;votes:number;cumul:number}[]; scrutin:{id:string;titre:string;type:string;statut:ScrutinStatut}; resultats:{candidatId:string|null;nom:string;voix:number;pourcentage:number}[]; }
export interface AdminLog { id?:string; action:string; detail:string; motif?:string; date:string|null; admin:string; cible?:string|null; }
