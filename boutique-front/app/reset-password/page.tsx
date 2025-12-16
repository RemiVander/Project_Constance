"use client";

import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function ResetPasswordRequestPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("sending");

    try {
      await apiFetch("/api/boutique/password/forgot", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setStatus("sent");
    } catch {
      setStatus("idle");
      setError("Impossible d’envoyer la demande. Vérifiez votre connexion et réessayez.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6">
        <h1 className="text-lg font-semibold mb-2 text-center">
          Mot de passe oublié
        </h1>
        <p className="text-sm text-gray-600 mb-4 text-center">
          Saisissez votre email. Si un compte existe, vous recevrez un lien de réinitialisation.
        </p>

        {status === "sent" ? (
          <div className="space-y-4">
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
              Si un compte existe pour cet email, un lien vient d’être envoyé.
            </div>

            <div className="text-center">
              <a href="/login" className="text-sm underline hover:text-black">
                Retour à la connexion
              </a>
            </div>

            <button
              type="button"
              onClick={() => setStatus("idle")}
              className="w-full border rounded py-2 text-sm hover:bg-gray-50"
            >
              Envoyer un autre lien
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                required
                className="w-full border rounded px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="contact@boutique.fr"
              />
            </div>

            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full bg-gray-900 text-white py-2 rounded font-semibold disabled:opacity-50"
            >
              {status === "sending" ? "Envoi..." : "Envoyer le lien"}
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
