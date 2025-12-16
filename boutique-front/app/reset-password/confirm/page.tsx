"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

type State = "idle" | "saving" | "success" | "invalid";

function ResetPasswordConfirmInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = useMemo(() => params.get("token") || "", [params]);

  const [state, setState] = useState<State>(token ? "idle" : "invalid");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setState("invalid");
      return;
    }
    if (newPassword.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (newPassword !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setState("saving");
    try {
      await apiFetch("/api/boutique/password/reset", {
        method: "POST",
        body: JSON.stringify({ token, new_password: newPassword }),
      });

      setState("success");
      setTimeout(() => router.replace("/login"), 700);
    } catch (e: any) {
      const msg = e?.message || "Impossible de réinitialiser le mot de passe.";
      const low = String(msg).toLowerCase();
      if (low.includes("expir") || low.includes("inval")) {
        setState("invalid");
      } else {
        setError(msg);
        setState("idle");
      }
    }
  }

  if (state === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6 space-y-4">
          <h1 className="text-lg font-semibold text-center">Lien invalide</h1>
          <p className="text-sm text-gray-600 text-center">
            Ce lien est invalide ou a expiré. Vous pouvez demander un nouveau lien.
          </p>

          <a
            href="/reset-password"
            className="block w-full text-center bg-gray-900 text-white py-2 rounded font-semibold hover:bg-black"
          >
            Demander un nouveau lien
          </a>

          <div className="text-center">
            <a href="/login" className="text-sm underline hover:text-black">
              Retour à la connexion
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6">
        <h1 className="text-lg font-semibold mb-2 text-center">Nouveau mot de passe</h1>
        <p className="text-sm text-gray-600 mb-4 text-center">
          Choisissez un nouveau mot de passe pour votre compte boutique.
        </p>

        {state === "success" ? (
          <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
            Mot de passe mis à jour. Redirection vers la connexion…
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Nouveau mot de passe</label>
              <input
                type="password"
                required
                className="w-full border rounded px-3 py-2 text-sm"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Au moins 8 caractères"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Confirmer</label>
              <input
                type="password"
                required
                className="w-full border rounded px-3 py-2 text-sm"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={state === "saving"}
              className="w-full bg-gray-900 text-white py-2 rounded font-semibold disabled:opacity-50"
            >
              {state === "saving" ? "Enregistrement..." : "Mettre à jour"}
            </button>

            <div className="text-center">
              <a href="/login" className="text-sm underline hover:text-black">
                Retour à la connexion
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6 text-center text-sm text-gray-600">
            Chargement…
          </div>
        </div>
      }
    >
      <ResetPasswordConfirmInner />
    </Suspense>
  );
}
