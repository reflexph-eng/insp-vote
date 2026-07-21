import { createHmac, timingSafeEqual } from "crypto";
const TOKEN_TTL_MS=15*60*1000;
function secret(){if(!process.env.SESSION_SECRET) throw new Error("SESSION_SECRET manquant"); return process.env.SESSION_SECRET;}
export function createVoteToken(electeurId:string,matricule:string,scrutinId:string){const p=Buffer.from(JSON.stringify({electeurId,matricule,scrutinId,exp:Date.now()+TOKEN_TTL_MS})).toString("base64url");return `${p}.${createHmac("sha256",secret()).update(p).digest("base64url")}`;}
export function verifyVoteToken(token:string|undefined|null):{electeurId:string;matricule:string;scrutinId:string}|null{if(!token?.includes("."))return null;const [p,s]=token.split(".");const e=createHmac("sha256",secret()).update(p).digest("base64url");const a=Buffer.from(s),b=Buffer.from(e);if(a.length!==b.length||!timingSafeEqual(a,b))return null;try{const x=JSON.parse(Buffer.from(p,"base64url").toString());if(Date.now()>x.exp||!x.scrutinId)return null;return x;}catch{return null;}}
