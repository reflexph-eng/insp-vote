"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { Logo } from "@/components/Logo";
import { StatCard } from "@/components/StatCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import type { Stats } from "@/lib/types";
import {
  Users, UserCheck, Percent, UserX, LogOut, Lock, Unlock, Upload, Download,
  Plus, Trash2, CheckCircle2, Menu, X, LayoutDashboard, Vote, UserRoundCog,
  FileSpreadsheet, FileText, Search, Eye,
} from "lucide-react";

type Scrutin = { id: string; titre: string; type: "TEST" | "OFFICIEL"; statut: "OUVERT" | "FERME"; actif: boolean };
type Electeur = { id: string; matricule: string; nom: string; prenom: string };
type Candidat = { id: string; nom: string; ordre: number; actif: boolean; photo: string | null };
type Analysis = { feuille: string; ligneEntete: number; lignesLues: number; valides: number; matriculesVides: number; nomsVides: number; doublons: number; matriculesGeneres: number };
type Section = "dashboard" | "scrutins" | "electeurs" | "candidats" | "import" | "exports";

const MENU: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { id: "scrutins", label: "Scrutins", icon: Vote },
  { id: "electeurs", label: "Électeurs", icon: UserRoundCog },
  { id: "candidats", label: "Candidats", icon: Users },
  { id: "import", label: "Import Excel", icon: FileSpreadsheet },
  { id: "exports", label: "Résultats et PDF", icon: FileText },
];

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null | undefined>();
  const [stats, setStats] = useState<Stats | null>(null);
  const [scrutins, setScrutins] = useState<Scrutin[]>([]);
  const [candidats, setCandidats] = useState<Candidat[]>([]);
  const [electeurs, setElecteurs] = useState<Electeur[]>([]);
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

  const load = useCallback(async () => {
    const responses = await Promise.all([
      authenticatedFetch("/api/admin/stats"), authenticatedFetch("/api/admin/scrutins"),
      authenticatedFetch("/api/admin/candidats"), authenticatedFetch("/api/admin/electeurs"),
    ]);
    const data = await Promise.all(responses.map((response) => response.json()));
    if (data[0].ok) setStats(data[0].stats);
    if (data[1].ok) setScrutins(data[1].scrutins);
    if (data[2].ok) setCandidats(data[2].candidats);
    if (data[3].ok) setElecteurs(data[3].electeurs);
  }, [authenticatedFetch]);

  useEffect(() => onAuthStateChanged(auth, (currentUser) => {
    setUser(currentUser);
    if (!currentUser) router.replace("/admin/login");
  }), [router]);
  useEffect(() => { if (user) load(); }, [user, load]);

  const filteredElecteurs = useMemo(() => {
    const value = query.trim().toLocaleLowerCase("fr");
    if (!value) return electeurs;
    return electeurs.filter((electeur) =>
      `${electeur.matricule} ${electeur.nom} ${electeur.prenom}`.toLocaleLowerCase("fr").includes(value),
    );
  }, [electeurs, query]);

  async function jsonAction(url: string, method: string, body?: unknown) {
    setBusy(url); setMessage("");
    const response = await authenticatedFetch(url, {
      method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    setBusy(null);
    if (!data.ok) setMessage(data.error || "Action impossible"); else await load();
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
    setAnalysis(null); setFile(null); await load();
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

  function openSection(next: Section) { setSection(next); setMenuOpen(false); }

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
          <p className="text-xs font-semibold uppercase text-petrol-600">Scrutin actif · {stats.scrutin.type}</p>
          <h2 className="mt-1 font-display text-xl font-semibold">{stats.scrutin.titre}</h2>
        </div>
      )}

      {section === "dashboard" && stats && (
        <section className="grid grid-cols-2 gap-3">
          <StatCard label="Inscrits" value={String(stats.inscrits)} icon={Users} />
          <StatCard label="Votants" value={String(stats.votants)} icon={UserCheck} />
          <StatCard label="Participation" value={`${stats.participation}%`} icon={Percent} accent />
          <StatCard label="Restants" value={String(stats.restants)} icon={UserX} />
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
                <button onClick={() => jsonAction("/api/admin/scrutin", "POST", { open: !stats.scrutinOuvert })} className="flex items-center gap-1 rounded-lg bg-petrol-600 px-3 py-2 text-xs text-white">{stats.scrutinOuvert ? <><Lock className="h-4 w-4" />Fermer</> : <><Unlock className="h-4 w-4" />Ouvrir</>}</button>
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

      {section === "exports" && (
        <section className="rounded-card bg-white p-5 shadow-soft"><h3 className="font-display text-lg font-semibold">Résultats et documents officiels</h3>{stats?.resultats.map((result) => <div key={result.candidatId ?? "nul"} className="mt-3 flex justify-between rounded-lg bg-canvas p-3 text-sm"><span>{result.nom}</span><b>{result.voix} voix · {result.pourcentage}%</b></div>)}<div className="mt-5 grid gap-3"><button onClick={() => download("/api/admin/export/resultats-pdf", "resultats-officiels-insp-vote.pdf")} className="rounded-xl bg-petrol-600 p-4 text-left font-semibold text-white"><Download className="mr-2 inline h-5 w-5" />Télécharger le résultat final en PDF</button><button onClick={() => download("/api/admin/export/liste-electorale-pdf", "liste-electorale-insp-vote.pdf")} className="rounded-xl bg-canvas p-4 text-left font-semibold"><Download className="mr-2 inline h-5 w-5" />Télécharger la liste électorale en PDF</button><button onClick={() => download("/api/admin/export/resultats", "resultats.csv")} className="rounded-xl bg-canvas p-4 text-left"><Download className="mr-2 inline h-4 w-4" />Exporter aussi les résultats en CSV</button><button onClick={() => download("/api/admin/export/emargement", "emargement.csv")} className="rounded-xl bg-canvas p-4 text-left"><Download className="mr-2 inline h-4 w-4" />Exporter l’émargement en CSV</button></div></section>
      )}

      {menuOpen && <div className="fixed inset-0 z-50 bg-ink/30" onClick={() => setMenuOpen(false)}><aside className="ml-auto flex h-full w-[86%] max-w-sm flex-col bg-white p-5 shadow-lift" onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><h2 className="font-display text-xl font-semibold text-petrol-700">Menu administration</h2><button onClick={() => setMenuOpen(false)} className="rounded-lg p-2"><X className="h-5 w-5" /></button></div><nav className="mt-6 flex flex-col gap-2">{MENU.map((item) => { const Icon = item.icon; return <button key={item.id} onClick={() => openSection(item.id)} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left ${section === item.id ? "bg-petrol-600 text-white" : "bg-canvas"}`}><Icon className="h-5 w-5" />{item.label}</button>; })}</nav><div className="mt-auto flex flex-col gap-2"><a href="/statistiques" target="_blank" className="flex items-center gap-3 rounded-xl bg-canvas px-4 py-3"><Eye className="h-5 w-5" />Ouvrir la page publique</a><button onClick={() => signOut(auth)} className="flex items-center gap-3 rounded-xl bg-alert/10 px-4 py-3 text-alert"><LogOut className="h-5 w-5" />Déconnexion</button></div></aside></div>}

      {message && <div className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-3 shadow-lift"><CheckCircle2 className="h-4 w-4 text-petrol-600" />{message}</div>}
    </main>
  );
}
