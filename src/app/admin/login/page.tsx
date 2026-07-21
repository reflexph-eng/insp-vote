"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { Logo } from "@/components/Logo";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Lock } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Identifiants incorrects.",
  "auth/invalid-email": "Adresse e-mail invalide.",
  "auth/too-many-requests": "Trop de tentatives. Reessayez plus tard.",
};

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push("/admin");
    } catch (err: any) {
      setError(ERROR_MESSAGES[err?.code] ?? "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size={64} />
          <div className="mt-4 flex items-center gap-2 text-petrol-700">
            <Lock className="h-4 w-4" />
            <h1 className="font-display text-lg font-semibold">Administration</h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink/70">E-mail</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-card border-2 border-line bg-white px-5 py-3.5 text-ink shadow-soft outline-none focus:border-petrol-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink/70">Mot de passe</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-card border-2 border-line bg-white px-5 py-3.5 text-ink shadow-soft outline-none focus:border-petrol-400"
            />
          </div>
          {error && <p className="text-sm font-medium text-alert">{error}</p>}
          <PrimaryButton type="submit" loading={loading}>
            Se connecter
          </PrimaryButton>
        </form>
      </div>
    </main>
  );
}
