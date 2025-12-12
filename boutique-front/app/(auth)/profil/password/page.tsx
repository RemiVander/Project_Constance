"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== newPasswordConfirm) {
      setError("La confirmation du mot de passe ne correspond pas.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/api/boutique/change-password", {
        method: "POST",
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      setSuccess("Votre mot de passe a été mis à jour.");
      setOldPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (e: any) {
      setError("Impossible de modifier le mot de passe. Vérifiez les informations saisies.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="max-w-lg mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-2">Changer mon mot de passe</h1>
        <p className="text-sm text-slate-600 mb-6">
          Choisissez un mot de passe suffisamment long et unique.
        </p>

        {error && (
          <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded shadow p-6 space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Mot de passe actuel
            </label>
            <input
              type="password"
              className="w-full border rounded px-2 py-1 text-sm"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              className="w-full border rounded px-2 py-1 text-sm"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Confirmation du nouveau mot de passe
            </label>
            <input
              type="password"
              className="w-full border rounded px-2 py-1 text-sm"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push("/profil")}
              className="px-4 py-2 rounded border border-slate-300 text-sm"
            >
              Annuler
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded bg-slate-900 text-white text-sm font-semibold disabled:opacity-70"
            >
              {saving ? "Enregistrement…" : "Mettre à jour le mot de passe"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
