"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { StatCard } from "@/components/StatCard";
import type { Stats } from "@/lib/types";
import { Users, UserCheck, Percent, UserX, Eye } from "lucide-react";

export default function ObservateurPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const requestInFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (requestInFlight.current || document.visibilityState !== "visible") return;
      requestInFlight.current = true;
      try {
        const res = await fetch("/api/observateur/stats");
        const data = await res.json();
        if (!cancelled && data.ok) setStats(data.stats);
      } finally {
        requestInFlight.current = false;
      }
    }
    load();
    const interval = setInterval(load, 60000);
    const onVisibility = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-6 py-8">
      <header className="mb-8 flex items-center gap-3">
        <Logo size={40} />
        <div>
          <p className="font-display text-lg font-semibold text-petrol-700">
            Observation du scrutin
          </p>
          <p className="flex items-center gap-1 text-xs text-ink/40">
            <Eye className="h-3 w-3" /> Lecture seule
          </p>
        </div>
      </header>

      {!stats && <p className="text-ink/40">Chargement…</p>}

      {stats && (
        <>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium shadow-soft">
            <span
              className={`h-2 w-2 rounded-full ${stats.scrutinOuvert ? "bg-petrol-500" : "bg-alert"}`}
            />
            {stats.scrutinOuvert ? "Scrutin ouvert" : "Scrutin ferme"}
          </div>

          <section className="mb-6 mt-3 grid grid-cols-2 gap-3">
            <StatCard label="Inscrits" value={String(stats.inscrits)} icon={Users} />
            <StatCard label="Votants" value={String(stats.votants)} icon={UserCheck} />
            <StatCard label="Participation" value={`${stats.participation}%`} icon={Percent} accent />
            <StatCard label="Restants" value={String(stats.restants)} icon={UserX} />
          </section>

          <section className="rounded-card bg-white p-5 shadow-soft">
            <p className="mb-3 font-display font-semibold text-ink">Resultats</p>
            {stats.resultats.length === 0 && (
              <p className="text-sm text-ink/40">Aucun vote enregistre pour le moment.</p>
            )}
            <div className="flex flex-col gap-2">
              {stats.resultats.map((r) => (
                <div key={r.candidatId ?? "nul"} className="flex items-center justify-between text-sm">
                  <span className="text-ink/80">{r.nom}</span>
                  <span className="font-medium text-petrol-700">
                    {r.voix} voix · {r.pourcentage}%
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
