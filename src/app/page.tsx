"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ArrowRight } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  matricule_introuvable: "Matricule introuvable.",
  scrutin_ferme: "Le scrutin n'est pas ouvert actuellement.",
  deja_vote: "Ce matricule a deja vote.",
  matricule_requis: "Veuillez saisir votre numero de matricule.",
  requete_invalide: "Une erreur est survenue. Veuillez reessayer.",
};

export default function AccueilPage() {
  const router = useRouter();
  const [matricule, setMatricule] = useState("");
  const [step, setStep] = useState<"saisie" | "bienvenue">("saisie");
  const [electeur, setElecteur] = useState<{ nom: string; prenom: string; token: string } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [titre, setTitre] = useState("ÉLECTION DU PRÉSIDENT DE LA MUTUELLE DES AGENTS DE L’INSP (MAINSP)");
  useEffect(() => { fetch("/api/public/scrutin").then(r=>r.json()).then(d=>{if(d.ok) setTitre(d.scrutin.titre)}).catch(()=>{}); }, []);

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/electeur/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricule: matricule.trim() }),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(ERROR_MESSAGES[data.error] ?? "Une erreur est survenue.");
        return;
      }

      setElecteur({ nom: data.nom, prenom: data.prenom, token: data.token });
      setStep("bienvenue");
    } catch {
      setError("Connexion impossible. Verifiez votre reseau.");
    } finally {
      setLoading(false);
    }
  }

  function handleContinuer() {
    if (!electeur) return;
    sessionStorage.setItem("insp_vote_token", electeur.token);
    router.push("/vote");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={72} />
          <h1 className="mt-6 font-display text-2xl font-semibold uppercase leading-tight tracking-tight text-petrol-700">{titre}</h1>
          <p className="mt-2 text-sm text-ink/50">Institut National de Sante Publique</p>
        </div>

        {step === "saisie" && (
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <div>
              <label htmlFor="matricule" className="mb-1.5 block text-sm font-medium text-ink/70">
                Numero de matricule
              </label>
              <input
                id="matricule"
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                value={matricule}
                onChange={(e) => {
                  setMatricule(e.target.value);
                  setError(null);
                }}
                placeholder="Ex : 425 060 X"
                className="w-full rounded-card border-2 border-line bg-white px-5 py-4 text-lg font-medium text-ink shadow-soft outline-none transition-colors focus:border-petrol-400"
              />
              {error && <p className="mt-2 text-sm font-medium text-alert">{error}</p>}
            </div>

            <PrimaryButton type="submit" loading={loading} disabled={!matricule.trim()}>
              Acceder au vote
              <ArrowRight className="h-4 w-4" />
            </PrimaryButton>
          </form>
        )}

        {step === "bienvenue" && electeur && (
          <div className="flex flex-col items-center gap-6 text-center animate-fade-up">
            <div>
              <p className="text-sm text-ink/50">Bonjour</p>
              <p className="mt-1 font-display text-2xl font-semibold text-petrol-700">
                {electeur.nom} {electeur.prenom}
              </p>
            </div>
            <PrimaryButton onClick={handleContinuer}>
              Continuer
              <ArrowRight className="h-4 w-4" />
            </PrimaryButton>
          </div>
        )}
      </div>
    </main>
  );
}
