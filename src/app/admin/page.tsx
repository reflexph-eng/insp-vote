"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { Logo } from "@/components/Logo";
import { StatCard } from "@/components/StatCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import type { Stats, AdminLog } from "@/lib/types";
import {
  Users, UserCheck, Percent, UserX, LogOut, Lock, Unlock, Upload, Download,
  Plus, Trash2, CheckCircle2, Menu, X, LayoutDashboard, Vote, UserRoundCog,
  FileSpreadsheet, FileText, Search, Eye, History, RotateCcw, PauseCircle, TrendingUp, RefreshCw,
} from "lucide-react";

type Scrutin = { id: string; titre: string; type: "TEST" | "OFFICIEL"; statut: "OUVERT" | "SUSPENDU" | "FERME"; actif: boolean };
type Electeur = { id: string; matricule: string; nom: string; prenom: string };
type Candidat = { id: string; nom: string; ordre: number; actif: boolean; photo: string | null };
type Analysis = { feuille: string; ligneEntete: number; lignesLues: number; valides: number; matriculesVides: number; nomsVides: number; doublons: number; matriculesGeneres: number };
type Votant = { id: string; matricule: string; nom: string; prenom: string; dateVote: string | null; statut: string };
type Section = "dashboard" | "tendances" | "scrutins" | "electeurs" | "candidats" | "import" | "votants" | "journal" | "exports";

const MENU: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "tendances", label: "Tendances", icon: TrendingUp },
  { id: "scrutins", label: "Scrutins", icon: Vote },
  { id: "electeurs", label: "Électeurs", icon: UserRoundCog },
  { id: "candidats", label: "Candidats", icon: Users },
  { id: "import", label: "Import Excel", icon: FileSpreadsheet },
  { id: "votants", label: "Noms et matricules ayant voté", icon: UserCheck },
  { id: "journal", label: "Journal d’audit", icon: History },
  { id: "exports", label: "Résultats et exports", icon: FileText },
];

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tendances, setTendances] = useState<Stats | null>(null);
  const [scrutins, setScrutins] = useState<Scrutin[]>([]);
  const [candidats, setCandidats] = useState<Candidat[]>([]);
  const [electeurs, setElecteurs] = useState<Electeur[]>([]);
  const [votants, setVotants] = useState<Votant[]>([]);
  const [journal, setJournal] = useState<AdminLog[]>([]);
  const [section, setSection] = useState<Section>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [newScrutin, setNewScrutin] = useState("");
  const [newType, setNewType] = useState<"TEST" | "OFFICIEL">("TEST");
  const [newCandidat, setNewCandidat] = useState("");
  const [matricule, setMatricule] = useState("");
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const authenticatedFetch = useCallback(async (url: string, init: RequestInit = {}) => {
    const token = await auth.currentUser?.getIdToken();
    return fetch(url, { ...init, headers: { ...(init.headers || {}), Authorization: `Bearer ${token}` } });
  }, []);

  const safeJson = useCallback(async (response: Response) => {
    const text = await response.text();
    if (!text) return { ok: false, error: `Réponse vide (${response.status})` };
    try { return JSON.parse(text); }
    catch { return { ok: false, error: `Réponse invalide (${response.status})` }; }
  }, []);

  const statsRequestInFlight = useRef(false);
  const versionRequestInFlight = useRef(false);
  const liveVersion = useRef<number | null>(null);

  const refreshStats = useCallback(async () => {
    if (statsRequestInFlight.current || document.visibilityState !== "visible") return;
    statsRequestInFlight.current = true;
    try {
      const data = await safeJson(await authenticatedFetch("/api/admin/stats"));
      if (data.ok) setStats(data.stats);
    } finally {
      statsRequestInFlight.current = false;
    }
  }, [authenticatedFetch, safeJson]);

  const checkLiveVersion = useCallback(async () => {
    if (versionRequestInFlight.current || document.visibilityState !== "visible") return;
    versionRequestInFlight.current = true;
    try {
      const data = await safeJson(await fetch("/api/public/version", { cache: "no-store" }));
      if (!data.ok || typeof data.version !== "number") return;
      if (liveVersion.current === null) {
        liveVersion.current = data.version;
        return;
      }
      if (data.version !== liveVersion.current) {
        liveVersion.current = data.version;
        await refreshStats();
      }
    } finally {
      versionRequestInFlight.current = false;
    }
  }, [refreshStats, safeJson]);

  const loadSection = useCallback(async (target: Section) => {
    const endpoints: Partial<Record<Section, string>> = {
      scrutins: "/api/admin/scrutins",
      electeurs: "/api/admin/electeurs",
      candidats: "/api/admin/candidats",
      votants: "/api/admin/votants",
      journal: "/api/admin/journal",
      tendances: "/api/admin/tendances",
    };
    const endpoint = endpoints[target];
    if (!endpoint) return;
    if (target === "tendances") setBusy("tendances");
    const data = await safeJson(await authenticatedFetch(endpoint));
    if (target === "tendances") setBusy(null);
    if (!data.ok) {
      setMessage(data.error || "Chargement impossible");
      return;
    }
    if (target === "scrutins") setScrutins(data.scrutins);
    if (target === "electeurs") setElecteurs(data.electeurs);
    if (target === "candidats") setCandidats(data.candidats);
    if (target === "votants") setVotants(data.votants);
    if (target === "journal") setJournal(data.journal);
    if (target === "tendances") setTendances(data.tendances);
  }, [authenticatedFetch, safeJson]);

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    if (!currentUser) router.replace("/admin/login");
  }), [router]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      await refreshStats();
      await checkLiveVersion();
    })();
  }, [user, refreshStats, checkLiveVersion]);

  useEffect(() => {
    if (!user) return;
    // Une seule lecture légère par minute. Les statistiques complètes ne sont
    // rechargées que lorsqu'un vote ou une action de scrutin a changé la version.
    const id = window.setInterval(checkLiveVersion, 60000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void checkLiveVersion();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user, checkLiveVersion]);

  const filteredElecteurs = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("fr");
    if (!value) return electeurs;
    return electeurs.filter((electeur) =>
      `${electeur.matricule} ${electeur.nom} ${electeur.prenom}`.toLocaleLowerCase("fr").includes(value),
    );
  }, [electeurs, query]);


  const filteredVotants = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("fr");
    if (!value) return votants;
    return votants.filter((votant) =>
      `${votant.matricule} ${votant.nom} ${votant.prenom}`.toLocaleLowerCase("fr").includes(value),
    );
  }, [votants, query]);

  async function jsonAction(url: string, method: string, body?: unknown) {
    setBusy(url); setMessage("");
    const response = await authenticatedFetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined,
    });
    const data = await safeJson(response);
    setBusy(null);
    if (!data.ok) setMessage(data.error || "Action impossible"); else { await refreshStats(); await loadSection(section); }
    return data;
  }

  async function preview(selectedFile: File) {
    setFile(selectedFile); setBusy("preview"); setMessage("");
    const form = new FormData(); form.append("file", selectedFile); form.append("mode", "preview");
    const data = await (await authenticatedFetch("/api/admin/import", { method: "POST", body: form })).json();
    setBusy(null);
    if (data.ok) setAnalysis(data.analysis); else setMessage("Fichier non reconnu");
  }

  async function commit() {
    if (!file) return;
    setBusy("commit");
    const form = new FormData(); form.append("file", file); form.append("mode", "commit");
    const data = await (await authenticatedFetch("/api/admin/import", { method: "POST", body: form })).json();
    setBusy(null); setMessage(data.ok ? `${data.ajoutes} électeur(s) ajoutés.` : "Échec de l’import");
    setAnalysis(null); setFile(null); await refreshStats(); await loadSection("electeurs");
  }

  async function download(path: string, name: string) {
    setBusy(path);
    const response = await authenticatedFetch(path);
    if (!response.ok) { setBusy(null); setMessage("Téléchargement impossible"); return; }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click();
    URL.revokeObjectURL(url); setBusy(null);
  }


  async function annulerVote(votant: Votant) {
    const motif = prompt(`Motif obligatoire pour annuler le vote de ${votant.nom} ${votant.prenom} (${votant.matricule}) :`);
    if (!motif?.trim()) return;
    if (!confirm("Cette action invalidera le bulletin et redonnera le droit de vote. Continuer ?")) return;
    await jsonAction("/api/admin/votes/annuler", "POST", { electeurId: votant.id, motif });
  }

  function openSection(next: Section) {
    setSection(next);
    setMenuOpen(false);
    setQuery("");
    // Tendances ne se charge que sur clic explicite du bouton "Actualiser les
    // tendances" (buildStats(true) force une lecture complète) : l'ouverture
    // de l'onglet ne doit donc pas déclencher elle-même un chargement,
    // conformément au texte affiché à l'écran.
    if (next === "tendances") return;
    void loadSection(next);
  }

  if (user === undefined) return <div className="flex min-h-dvh items-center justify-center">Chargement…</div>;
  if (!user) return null;

  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-5 py-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3"><Logo size={42} /><div><h1 className="font-display text-xl font-semibold text-petrol-700">Administration INSP VOTE</h1><p className="text-xs text-ink/40">{user.email}</p></div></div>
        <div className="flex items-center gap-2">
          <a href="/statistiques" target="_blank" className="hidden items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm sm:flex"><Eye className="h-4 w-4" />Page publique</a>
          <button onClick={() => setMenuOpen(true)} className="rounded-xl bg-petrol-600 p-3 text-white" aria-label="Ouvrir le menu"><Menu className="h-5 w-5" /></button>
        </div>
      </header>

      {stats && (
        <div className="mb-4 rounded-card bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase text-petrol-600">Scrutin actif · {stats.scrutin.type}</p><h2 className="mt-1 font-display text-xl font-semibold">{stats.scrutin.titre}</h2></div>
            <span className={`rounded-full px-4 py-2 text-xs font-bold ${stats.scrutin.statut === "OUVERT" ? "bg-green-100 text-green-700" : stats.scrutin.statut === "SUSPENDU" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{stats.scrutin.statut}</span>
          </div>
        </div>
      )}

      {section === "dashboard" && stats && (
        <section>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4"><StatCard label="Inscrits" value={String(stats.inscrits)} icon={Users} /><StatCard label="Votants" value={String(stats.votants)} icon={UserCheck} /><StatCard label="Participation" value={`${stats.participation}%`} icon={Percent} accent /><StatCard label="Restants" value={String(stats.restants)} icon={UserX} /></div>
          <div className="mt-4 rounded-card bg-white p-5 shadow-soft">
            <div className="flex justify-between text-sm"><b>Progression de la participation</b><span>{stats.votants}/{stats.inscrits}</span></div>
            <div className="mt-3 h-4 overflow-hidden rounded-full bg-canvas"><div className="h-full bg-petrol-600" style={{ width: `${Math.min(100, stats.participation)}%` }} /></div>
            <div className="mt-6 flex h-44 items-end gap-2 overflow-x-auto">{stats.progression.length ? stats.progression.map((point) => { const max = Math.max(1, ...stats.progression.map((item) => item.cumul)); return <div key={point.heure} className="flex min-w-10 flex-1 flex-col items-center gap-1"><span className="text-[10px] font-semibold">{point.cumul}</span><div className="w-full rounded-t bg-petrol-500" style={{ height: `${Math.max(8, point.cumul / max * 120)}px` }} /><span className="text-[10px] text-ink/50">{point.heure}h</span></div>; }) : <p className="m-auto text-sm text-ink/40">Aucun vote enregistré</p>}</div>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-canvas p-3">Votes annulés<br/><b className="text-lg">{stats.votesAnnules}</b></div><div className="rounded-xl bg-canvas p-3">Reprises de vote<br/><b className="text-lg">{stats.reprisesVote}</b></div></div>
          </div>
        </section>
      )}


      {section === "tendances" && (
        <section className="rounded-card bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-lg font-semibold">Tendances provisoires du vote</h3>
              <p className="mt-1 text-sm text-ink/50">Chargement uniquement à votre demande. Aucun rafraîchissement automatique.</p>
            </div>
            <button
              onClick={() => void loadSection("tendances")}
              disabled={busy === "tendances"}
              className="flex items-center gap-2 rounded-xl bg-petrol-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${busy === "tendances" ? "animate-spin" : ""}`} />
              Actualiser les tendances
            </button>
          </div>

          {!tendances ? (
            <div className="mt-6 rounded-xl bg-canvas p-6 text-center text-sm text-ink/50">
              Cliquez sur « Actualiser les tendances » pour afficher les résultats provisoires.
            </div>
          ) : (
            <>
              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                <StatCard label="Inscrits" value={String(tendances.inscrits)} icon={Users} />
                <StatCard label="Votants" value={String(tendances.votants)} icon={UserCheck} />
                <StatCard label="Participation" value={`${tendances.participation}%`} icon={Percent} accent />
                <StatCard label="Restants" value={String(tendances.restants)} icon={UserX} />
              </div>

              {(() => {
                const candidatsSeulement = tendances.resultats.filter((resultat) => resultat.candidatId !== null);
                const voteNul = tendances.resultats.find((resultat) => resultat.candidatId === null);
                const premier = candidatsSeulement[0];
                const deuxieme = candidatsSeulement[1];
                const ecart = premier && deuxieme ? premier.voix - deuxieme.voix : null;
                return (
                  <>
                    {premier && (
                      <div className="mt-5 rounded-xl bg-canvas p-4">
                        <p className="text-xs font-semibold uppercase text-petrol-600">En tête actuellement</p>
                        <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
                          <p className="font-display text-xl font-semibold">{premier.nom}</p>
                          <p className="text-sm"><b>{premier.voix} voix</b> · {premier.pourcentage}%</p>
                        </div>
                        {ecart !== null && <p className="mt-2 text-sm text-ink/55">Écart avec le deuxième : <b>{ecart} voix</b></p>}
                      </div>
                    )}

                    <div className="mt-6 space-y-4">
                      {candidatsSeulement.map((resultat, index) => (
                        <div key={resultat.candidatId} className="rounded-xl border p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-petrol-50 text-sm font-bold text-petrol-700">{index + 1}</span>
                              <div className="min-w-0">
                                <p className="truncate font-semibold">{resultat.nom}</p>
                                <p className="text-xs text-ink/45">Classement provisoire</p>
                              </div>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="font-semibold">{resultat.voix} voix</p>
                              <p className="text-sm text-ink/55">{resultat.pourcentage}%</p>
                            </div>
                          </div>
                          <div className="mt-3 h-3 overflow-hidden rounded-full bg-canvas">
                            <div className="h-full bg-petrol-600" style={{ width: `${Math.min(100, resultat.pourcentage)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {voteNul && (
                      <div className="mt-5 flex items-center justify-between rounded-xl bg-canvas p-4 text-sm">
                        <span className="font-medium">Votes nuls</span>
                        <b>{voteNul.voix} voix · {voteNul.pourcentage}%</b>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </section>
      )}

      {section === "scrutins" && (
        <section className="rounded-card bg-white p-5 shadow-soft">
          <h3 className="font-display text-lg font-semibold">Gestion des scrutins</h3>
          <div className="mt-4 flex flex-col gap-3">{scrutins.map((scrutin) => (
            <div key={scrutin.id} className="rounded-xl bg-canvas p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="font-medium">{scrutin.titre}</p><p className="text-xs text-ink/50">{scrutin.type} · {scrutin.statut}</p></div><div className="flex gap-2">
                {stats?.scrutin.id !== scrutin.id && <button onClick={() => jsonAction("/api/admin/scrutins", "PUT", { id: scrutin.id, action: "activer" })} className="text-xs font-semibold text-petrol-700">Activer</button>}
                {scrutin.type === "TEST" && stats?.scrutin.id !== scrutin.id && <button onClick={() => confirm("Supprimer ce scrutin de test et toutes ses données ?") && jsonAction(`/api/admin/scrutins?id=${scrutin.id}`, "DELETE")}><Trash2 className="h-4 w-4 text-alert" /></button>}
              </div></div>
              {stats?.scrutin.id === scrutin.id && <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={() => jsonAction("/api/admin/scrutin", "POST", { statut: "OUVERT" })} className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs text-white"><Unlock className="h-4 w-4" />Ouvrir / Reprendre</button>
                <button onClick={() => { const motif = prompt("Motif obligatoire de la suspension :"); if (motif?.trim()) jsonAction("/api/admin/scrutin", "POST", { statut: "SUSPENDU", motif }); }} className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-2 text-xs text-white"><PauseCircle className="h-4 w-4" />Suspendre</button>
                <button onClick={() => confirm("Fermer le scrutin ?") && jsonAction("/api/admin/scrutin", "POST", { statut: "FERME" })} className="flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs text-white"><Lock className="h-4 w-4" />Fermer</button>
                <button onClick={() => { const titre = prompt("Nouveau titre du scrutin", scrutin.titre); if (titre) jsonAction("/api/admin/scrutins", "PUT", { id: scrutin.id, titre }); }} className="rounded-lg border px-3 py-2 text-xs">Modifier le titre</button>
              </div>}
            </div>
          ))}</div>
          <div className="mt-5 grid gap-2 sm:grid-cols-[1fr_auto_auto]"><input value={newScrutin} onChange={(event) => setNewScrutin(event.target.value)} placeholder="Titre du nouveau scrutin" className="rounded-lg border px-3 py-2" /><select value={newType} onChange={(event) => setNewType(event.target.value as "TEST" | "OFFICIEL")} className="rounded-lg border px-3 py-2"><option>TEST</option><option>OFFICIEL</option></select><button onClick={async () => { if (!newScrutin.trim()) return; await jsonAction("/api/admin/scrutins", "POST", { titre: newScrutin, type: newType }); setNewScrutin(""); }} className="rounded-lg bg-petrol-600 px-4 py-2 text-white"><Plus className="inline h-4 w-4" /> Créer</button></div>
        </section>
      )}

      {section === "electeurs" && (
        <section className="rounded-card bg-white p-5 shadow-soft">
          <h3 className="font-display text-lg font-semibold">Gestion des électeurs</h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-4"><input value={matricule} onChange={(event) => setMatricule(event.target.value)} placeholder="Matricule" className="rounded-lg border px-3 py-2" /><input value={nom} onChange={(event) => setNom(event.target.value)} placeholder="Nom" className="rounded-lg border px-3 py-2" /><input value={prenom} onChange={(event) => setPrenom(event.target.value)} placeholder="Prénom" className="rounded-lg border px-3 py-2" /><button onClick={async () => { const data = await jsonAction("/api/admin/electeurs", "POST", { matricule, nom, prenom }); if (data.ok) { setMatricule(""); setNom(""); setPrenom(""); } }} className="rounded-lg bg-petrol-600 px-3 py-2 text-white">Ajouter</button></div>
          <div className="relative mt-5"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher par matricule, nom ou prénom" className="w-full rounded-xl border py-3 pl-10 pr-4" /></div>
          <p className="mt-2 text-xs text-ink/40">{filteredElecteurs.length} électeur(s) affiché(s)</p>
          <div className="mt-3 max-h-[55vh] overflow-auto">{filteredElecteurs.map((electeur) => <div key={electeur.id} className="flex items-center justify-between gap-3 border-b py-3 text-sm"><span><b>{electeur.matricule}</b> · {electeur.nom} {electeur.prenom}</span><button onClick={() => confirm(`Supprimer ${electeur.nom} ${electeur.prenom} ?`) && jsonAction(`/api/admin/electeurs?id=${encodeURIComponent(electeur.id)}`, "DELETE")}><Trash2 className="h-4 w-4 text-alert" /></button></div>)}</div>
        </section>
      )}

      {section === "candidats" && (
        <section className="rounded-card bg-white p-5 shadow-soft"><h3 className="font-display text-lg font-semibold">Candidats du scrutin actif</h3>{candidats.map((candidat) => <div key={candidat.id} className="mt-2 flex justify-between rounded-lg bg-canvas p-3"><span className={!candidat.actif ? "line-through opacity-40" : ""}>{candidat.nom}</span><div className="flex gap-3"><button onClick={() => jsonAction("/api/admin/candidats", "PUT", { id: candidat.id, actif: !candidat.actif })} className="text-xs text-petrol-700">{candidat.actif ? "Désactiver" : "Activer"}</button><button onClick={() => confirm("Supprimer ce candidat ?") && jsonAction(`/api/admin/candidats?id=${candidat.id}`, "DELETE")}><Trash2 className="h-4 w-4 text-alert" /></button></div></div>)}<div className="mt-3 flex gap-2"><input value={newCandidat} onChange={(event) => setNewCandidat(event.target.value)} placeholder="Nom du candidat" className="flex-1 rounded-lg border px-3 py-2" /><button onClick={async () => { if (!newCandidat.trim()) return; await jsonAction("/api/admin/candidats", "POST", { nom: newCandidat, ordre: candidats.length, actif: true }); setNewCandidat(""); }} className="rounded-lg bg-petrol-600 px-4 text-white">Ajouter</button></div></section>
      )}

      {section === "import" && (
        <section className="rounded-card bg-white p-5 shadow-soft"><h3 className="font-display text-lg font-semibold">Import Excel</h3><label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-sm font-semibold text-petrol-700"><Upload className="h-5 w-5" />{busy === "preview" ? "Analyse…" : "Choisir un fichier Excel"}<input type="file" accept=".xlsx,.xls" className="hidden" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) preview(selected); }} /></label>{analysis && <div className="mt-3 rounded-xl bg-canvas p-4 text-sm"><p>{analysis.lignesLues} lignes · <b>{analysis.valides} valides</b> · {analysis.matriculesGeneres} matricules générés · {analysis.doublons} doublon(s)</p><PrimaryButton className="mt-3" onClick={commit} loading={busy === "commit"}>Importer {analysis.valides} électeur(s)</PrimaryButton></div>}</section>
      )}

      {section === "votants" && (
        <section className="rounded-card bg-white p-5 shadow-soft">
          <h3 className="font-display text-lg font-semibold">Noms et matricules ayant voté</h3><p className="mt-1 text-sm text-ink/50">Le choix du candidat reste strictement secret.</p>
          <div className="relative mt-4"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/35" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un nom ou un matricule" className="w-full rounded-xl border py-3 pl-10 pr-4" /></div>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[680px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-ink/45"><th className="py-3">Matricule</th><th>Nom et prénoms</th><th>Heure du vote</th><th className="text-right">Action</th></tr></thead><tbody>{filteredVotants.map((votant) => <tr key={votant.id} className="border-b"><td className="py-3 font-semibold">{votant.matricule}</td><td>{votant.nom} {votant.prenom}</td><td>{votant.dateVote ? new Date(votant.dateVote).toLocaleString("fr-FR") : "—"}</td><td className="text-right"><button onClick={() => annulerVote(votant)} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"><RotateCcw className="mr-1 inline h-4 w-4" />Annuler et réautoriser</button></td></tr>)}</tbody></table></div>
        </section>
      )}

      {section === "journal" && (
        <section className="rounded-card bg-white p-5 shadow-soft"><h3 className="font-display text-lg font-semibold">Journal complet des actions administrateur</h3><div className="mt-4 max-h-[65vh] overflow-auto">{journal.map((entry) => <div key={entry.id} className="border-b py-3 text-sm"><div className="flex justify-between gap-3"><b>{entry.action.replaceAll("_", " ")}</b><span className="text-xs text-ink/45">{entry.date ? new Date(entry.date).toLocaleString("fr-FR") : "—"}</span></div><p className="text-ink/60">{entry.detail}</p>{entry.motif && <p className="text-xs text-ink/50">Motif : {entry.motif}</p>}<p className="text-xs text-ink/35">{entry.admin}</p></div>)}</div></section>
      )}

      {section === "exports" && (
        <section className="rounded-card bg-white p-5 shadow-soft"><h3 className="font-display text-lg font-semibold">Résultats et documents officiels</h3><div className="mt-5 space-y-4">{stats?.resultats.map((result) => <div key={result.candidatId ?? "nul"}><div className="flex justify-between text-sm"><span className="font-medium">{result.nom}</span><b>{result.voix} voix · {result.pourcentage}%</b></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-canvas"><div className="h-full bg-petrol-600" style={{ width: `${result.pourcentage}%` }} /></div></div>)}</div><div className="mt-6 grid gap-3"><button onClick={() => download("/api/admin/export/resultats-pdf", "resultats-officiels-insp-vote.pdf")} className="rounded-xl bg-petrol-600 p-4 text-left font-semibold text-white"><Download className="mr-2 inline h-5 w-5" />PDF professionnel des résultats</button><button onClick={() => download("/api/admin/export/excel", "insp-vote-export-complet.xlsx")} className="rounded-xl bg-canvas p-4 text-left font-semibold"><Download className="mr-2 inline h-5 w-5" />Export Excel complet</button><button onClick={() => download("/api/admin/export/liste-electorale-pdf", "liste-electorale-insp-vote.pdf")} className="rounded-xl bg-canvas p-4 text-left font-semibold"><Download className="mr-2 inline h-5 w-5" />Télécharger la liste électorale en PDF</button><button onClick={() => download("/api/admin/export/resultats", "resultats.csv")} className="rounded-xl bg-canvas p-4 text-left"><Download className="mr-2 inline h-4 w-4" />Exporter aussi les résultats en CSV</button><button onClick={() => download("/api/admin/export/emargement", "emargement.csv")} className="rounded-xl bg-canvas p-4 text-left"><Download className="mr-2 inline h-4 w-4" />Exporter l’émargement en CSV</button></div></section>
      )}

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-ink/30" onClick={() => setMenuOpen(false)}>
          <aside
            className="ml-auto flex h-dvh w-[86%] max-w-sm flex-col overflow-hidden bg-white shadow-lift"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shrink-0 p-5 pb-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-xl font-semibold text-petrol-700">Menu administration</h2>
                <button onClick={() => setMenuOpen(false)} className="rounded-lg p-2" aria-label="Fermer le menu">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-5 py-3">
              {MENU.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => openSection(item.id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left ${section === item.id ? "bg-petrol-600 text-white" : "bg-canvas"}`}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="shrink-0 border-t bg-white p-5 pt-3">
              <div className="flex flex-col gap-2">
                <a href="/statistiques" target="_blank" className="flex items-center gap-3 rounded-xl bg-canvas px-4 py-3">
                  <Eye className="h-5 w-5" />Ouvrir la page publique
                </a>
                <button onClick={() => signOut(auth)} className="flex items-center gap-3 rounded-xl bg-alert/10 px-4 py-3 text-alert">
                  <LogOut className="h-5 w-5" />Déconnexion
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {message && <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-3 shadow-lift"><CheckCircle2 className="h-4 w-4 text-petrol-600" />{message}</div>}
    </main>
  );
}
