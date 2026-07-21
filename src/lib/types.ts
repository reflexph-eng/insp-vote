export interface Electeur { matricule:string; nom:string; prenom:string; aVote?:boolean; dateVote?:string|null; }
export interface Candidat { id:string; nom:string; photo:string|null; ordre:number; actif:boolean; scrutinId?:string; }
export interface VoteDoc { candidatId:string|null; date:string; scrutinId:string; }
export interface Scrutin { id:string; titre:string; type:"TEST"|"OFFICIEL"; statut:"OUVERT"|"FERME"; actif:boolean; archive:boolean; dateCreation:string; dateOuverture:string|null; dateFermeture:string|null; }
export interface Stats { inscrits:number; votants:number; participation:number; restants:number; dernierVote:string|null; scrutinOuvert:boolean; scrutin:{id:string;titre:string;type:string;statut:string}; resultats:{candidatId:string|null;nom:string;voix:number;pourcentage:number}[]; }
export interface AdminLog { action:string; detail:string; date:string; admin:string; }
