"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { CandidateCard } from "@/components/CandidateCard";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { SealMark } from "@/components/SealMark";
import { Check, XCircle } from "lucide-react";
import type { Candidat } from "@/lib/types";

const ERROR_MESSAGES: Record<string, string> = {
  session_invalide: "Votre session a expire. Veuillez recommencer depuis l'accueil.",
  matricule_introuvable: "Matricule introuvable.",
  scrutin_ferme: "Le scrutin n'est plus ouvert.",
  deja_vote: "Ce matricule a deja vote.",
  candidat_invalide: "Ce candidat n'est plus disponible. Veuillez reessayer.",
};

const VOTE_NUL = "__VOTE_NUL__";

export default function VotePage() {
  const router = useRouter();
  const [candidats, setCandidats] = useState<Candidat[] | null>(null);
  const [selection, setSelection] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [redirectSeconds, setRedirectSeconds] = useState(4);

  useEffect(() => {
    if (!done) return;
    setRedirectSeconds(4);
    const countdown = window.setInterval(() => {
      setRedirectSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    const redirect = window.setTimeout(() => router.replace("/"), 4000);
    return () => {
      window.clearInterval(countdown);
      window.clearTimeout(redirect);
    };
  }, [done, router]);

  useEffect(() => {
    const token = sessionStorage.getItem("insp_vote_token");
    if (!token) {
      router.replace("/");
      return;
    }
    fetch("/api/vote/candidats")
      .then((res) => res.json())
      .then((data) => setCandidats(data.candidats ?? []));
  }, [router]);

  async function submitVote() {
    const token = sessionStorage.getItem("insp_vote_token");
    if (!token) {
      router.replace("/");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/vote/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          candidatId: selection === VOTE_NUL ? null : selection,
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(ERROR_MESSAGES[data.error] ?? "Une erreur est survenue. Veuillez reessayer.");
        setConfirmOpen(false);
        return;
      }

      sessionStorage.removeItem("insp_vote_token");
      setDone(true);
      setConfirmOpen(false);
    } catch {
      setError("Connexion impossible. Votre vote n'a pas ete enregistre.");
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12 text-center">
        <SealMark />
        <p className="mt-8 font-display text-xl font-semibold text-petrol-700">
          Votre vote a ete enregistre.
        </p>
        <p className="mt-2 text-sm text-ink/60">Merci pour votre participation.</p>
        <p className="mt-5 text-xs text-ink/40">Retour au matricule dans {redirectSeconds} seconde(s)…</p>
        <button
          type="button"
          onClick={() => router.replace("/")}
          className="mt-4 rounded-xl bg-petrol-600 px-5 py-3 text-sm font-semibold text-white"
        >
          Votant suivant
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-6 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <Logo size={48} />
        <h1 className="mt-4 font-display text-xl font-semibold text-petrol-700">
          Choisissez votre candidat
        </h1>
        <p className="mt-1 text-sm text-ink/50">Un seul choix possible</p>
      </div>

      {candidats === null && (
        <div className="flex flex-1 items-center justify-center text-ink/40">Chargement…</div>
      )}

      {candidats && (
        <div className="grid flex-1 grid-cols-3 gap-2 pb-28 sm:gap-4">
          {candidats.map((c) => (
            <CandidateCard
              key={c.id}
              candidat={c}
              selected={selection === c.id}
              onSelect={() => setSelection(c.id)}
            />
          ))}

          <button
            type="button"
            onClick={() => setSelection(VOTE_NUL)}
            aria-pressed={selection === VOTE_NUL}
            className={`relative flex h-full w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 p-2 text-center transition-all duration-200 active:scale-[0.97] sm:gap-3 sm:rounded-card sm:p-4 ${
              selection === VOTE_NUL
                ? "border-petrol-600 bg-white shadow-lift"
                : "border-dashed border-line bg-transparent hover:border-petrol-200"
            }`}
          >
            {selection === VOTE_NUL && (
              <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-petrol-600 sm:right-2 sm:top-2 sm:h-6 sm:w-6">
                <Check className="h-3 w-3 text-white sm:h-3.5 sm:w-3.5" strokeWidth={3} />
              </span>
            )}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink/5 sm:h-16 sm:w-16">
              <XCircle className="h-5 w-5 text-ink/40 sm:h-7 sm:w-7" />
            </div>
            <span className="line-clamp-2 font-display text-xs font-medium leading-tight text-ink/70 sm:text-lg">
              Vote nul
            </span>
          </button>
        </div>
      )}

      {error && (
        <p className="fixed inset-x-6 bottom-24 rounded-card bg-alert/10 p-3 text-center text-sm font-medium text-alert">
          {error}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-canvas via-canvas to-transparent p-6 pt-10">
        <div className="mx-auto max-w-md">
          <PrimaryButton disabled={!selection} onClick={() => setConfirmOpen(true)}>
            Valider definitivement mon vote
          </PrimaryButton>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirmer votre vote"
        description="Cette action est irreversible. Vous ne pourrez plus modifier votre choix apres validation."
        confirmLabel="Confirmer mon vote"
        loading={submitting}
        onConfirm={submitVote}
        onCancel={() => setConfirmOpen(false)}
      />
    </main>
  );
}
