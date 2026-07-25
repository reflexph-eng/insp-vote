"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { StatCard } from "@/components/StatCard";
import { Users, UserCheck, Percent, UserX } from "lucide-react";

type PublicStats = {
  scrutin: { titre: string; type: string; statut: string };
  scrutinOuvert: boolean;
  inscrits: number;
  votants: number;
  participation: number;
  restants: number;
};

export default function StatistiquesPage() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const requestInFlight = useRef(false);

  useEffect(() => {
    let active = true;
    async function refresh() {
      if (requestInFlight.current || document.visibilityState !== "visible") return;
      requestInFlight.current = true;
      try {
        const response = await fetch("/api/public/stats", { cache: "no-store" });
        const data = await response.json();
        if (active && data.ok) setStats(data.stats);
      } finally {
        requestInFlight.current = false;
      }
    }
    refresh();
    const interval = window.setInterval(refresh, 60000);
    const onVisibility = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 py-8">
      <header className="mb-8 flex flex-col items-center text-center">
        <Logo size={54} />
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-petrol-600">
          Institut National de Santé Publique
        </p>
        <h1 className="mt-3 max-w-xl font-display text-2xl font-semibold leading-tight text-petrol-700 sm:text-3xl">
          {stats?.scrutin.titre ?? "Statistiques du scrutin"}
        </h1>
        {stats && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium shadow-soft">
            <span className={`h-2.5 w-2.5 rounded-full ${stats.scrutinOuvert ? "bg-petrol-500" : "bg-alert"}`} />
            {stats.scrutinOuvert ? "Scrutin ouvert" : "Scrutin fermé"}
          </div>
        )}
      </header>

      {!stats ? (
        <div className="rounded-card bg-white p-8 text-center text-ink/40 shadow-soft">Chargement…</div>
      ) : (
        <section className="grid grid-cols-2 gap-3 sm:gap-4">
          <StatCard label="Inscrits" value={String(stats.inscrits)} icon={Users} />
          <StatCard label="Votants" value={String(stats.votants)} icon={UserCheck} />
          <StatCard label="Participation" value={`${stats.participation}%`} icon={Percent} accent />
          <StatCard label="Restants" value={String(stats.restants)} icon={UserX} />
        </section>
      )}

      <p className="mt-8 text-center text-xs text-ink/35">Actualisation automatique toutes les 60 secondes</p>
    </main>
  );
}
