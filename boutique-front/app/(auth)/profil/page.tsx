"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type BoutiqueProfile = {
  id: number;
  nom: string;
  email: string;
  doit_changer_mdp: boolean;
  gerant?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  code_postal?: string | null;
  ville?: string | null;
  numero_tva?: string | null;
};

export default function ProfilPage() {
  const router = useRouter();

  const [profil, setProfil] = useState<BoutiqueProfile | null>(null);

  // Profil form
  const [savingProfil, setSavingProfil] = useState(false);
  const [profilError, setProfilError] = useState<string | null>(null);
  const [profilSuccess, setProfilSuccess] = useState<string | null>(null);

  // Password form
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = (await apiFetch("/api/boutique/me")) as BoutiqueProfile;
        setProfil(data);
      } catch (e: any) {
        if (e?.message?.includes("401")) router.replace("/login");
        else setProfilError(e?.message || "Impossible de charger votre profil.");
      }
    }
    load();
  }, [router]);

  async function submitProfil(e: React.FormEvent) {
    e.preventDefault();
    if (!profil) return;

    setSavingProfil(true);
    setProfilError(null);
    setProfilSuccess(null);

    try {
      const payload = {
        nom: profil.nom,
        gerant: profil.gerant ?? null,
        telephone: profil.telephone ?? null,
        adresse: profil.adresse ?? null,
        code_postal: profil.code_postal ?? null,
        ville: profil.ville ?? null,
        email: profil.email,
      };

      const updated = (await apiFetch("/api/boutique/me", {
        method: "PUT",
        body: JSON.stringify(payload),
      })) as BoutiqueProfile;

      setProfil(updated);
      setProfilSuccess("Profil mis à jour.");
    } catch (e: any) {
      setProfilError(e?.message || "Erreur lors de la mise à jour.");
    } finally {
      setSavingProfil(false);
    }
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (newPassword !== newPasswordConfirm) {
      setPwdError("La confirmation du mot de passe ne correspond pas.");
      return;
    }

    setSavingPwd(true);
  try {
    await apiFetch("/api/boutique/change-password", {
      method: "POST",
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
      }),
    });

    setPwdSuccess("Mot de passe mis à jour.");

    const wasForced = !!profil?.doit_changer_mdp;

    const me = await apiFetch("/api/boutique/me");
    setProfil(me);

    if (wasForced && me && !me.doit_changer_mdp) {
      router.replace("/dashboard");
    }

    setOldPassword("");
    setNewPassword("");
    setNewPasswordConfirm("");
    } catch (e: any) {
      setPwdError(e?.message || "Impossible de modifier le mot de passe.");
    } finally {
      setSavingPwd(false);
    }
  }

  if (!profil) {
    return (
      <div className="min-h-screen bg-slate-100">
        <main className="max-w-3xl mx-auto px-4 py-10">
          <div className="bg-white rounded shadow p-4 text-sm text-gray-600">
            Chargement du profil...
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Mon profil</h1>
          <p className="text-sm text-slate-600">
            Modifiez les informations de votre boutique. La TVA est gérée par l’administration.
          </p>
          {profil.doit_changer_mdp && (
            <div className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2">
              🔐 Pour des raisons de sécurité, merci de définir un nouveau mot de passe avant de continuer.
            </div>
          )}
        </div>

        {/* ===================== PROFIL ===================== */}
        <section className="bg-white rounded shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Informations boutique</h2>

          {profilError && (
            <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">
              {profilError}
            </div>
          )}
          {profilSuccess && (
            <div className="mb-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded">
              {profilSuccess}
            </div>
          )}

          <form onSubmit={submitProfil} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Nom de la boutique
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={profil.nom}
                  onChange={(e) => setProfil({ ...profil, nom: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Gérant(e)
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={profil.gerant ?? ""}
                  onChange={(e) => setProfil({ ...profil, gerant: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={profil.email}
                  onChange={(e) => setProfil({ ...profil, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={profil.telephone ?? ""}
                  onChange={(e) => setProfil({ ...profil, telephone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Adresse
              </label>
              <input
                type="text"
                className="w-full border rounded px-2 py-1 text-sm"
                value={profil.adresse ?? ""}
                onChange={(e) => setProfil({ ...profil, adresse: e.target.value })}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Code postal
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={profil.code_postal ?? ""}
                  onChange={(e) => setProfil({ ...profil, code_postal: e.target.value })}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Ville
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={profil.ville ?? ""}
                  onChange={(e) => setProfil({ ...profil, ville: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-3 border-t border-dashed border-slate-200">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Numéro de TVA (lecture seule)
              </label>
              <input
                type="text"
                readOnly
                className="w-full border rounded px-2 py-1 text-sm bg-slate-50 text-slate-500"
                value={profil.numero_tva ?? "Non renseigné"}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingProfil}
                className="px-4 py-2 rounded bg-slate-900 text-white text-sm font-semibold disabled:opacity-70"
              >
                {savingProfil ? "Enregistrement…" : "Mettre à jour le profil"}
              </button>
            </div>
          </form>
        </section>

        {/* ===================== SÉCURITÉ ===================== */}
        <section className="bg-white rounded shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Sécurité</h2>

          {pwdError && (
            <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">
              {pwdError}
            </div>
          )}
          {pwdSuccess && (
            <div className="mb-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded">
              {pwdSuccess}
            </div>
          )}

          <form onSubmit={submitPassword} className="space-y-4">
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

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingPwd}
                className="px-4 py-2 rounded bg-slate-900 text-white text-sm font-semibold disabled:opacity-70"
              >
                {savingPwd ? "Enregistrement…" : "Changer le mot de passe"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
