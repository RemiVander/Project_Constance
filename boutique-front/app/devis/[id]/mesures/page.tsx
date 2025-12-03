"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type MesureType = {
  id: number;
  code: string;
  label: string;
  obligatoire: boolean;
  ordre: number;
};

export default function DevisMesuresPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [mesureTypes, setMesureTypes] = useState<MesureType[]>([]);
  const [values, setValues] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const types = await apiFetch("/api/boutique/mesures/types");
        setMesureTypes(types);

        // Optionnel : initialiser l'objet values
        const initial: Record<number, string> = {};
        for (const t of types) {
          initial[t.id] = "";
        }
        setValues(initial);
      } catch (e: any) {
        setErrorMsg(e.message || "Erreur lors du chargement des mesures");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleChange(idType: number, v: string) {
    setValues((prev) => ({ ...prev, [idType]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;

    // contrôle des obligatoires
    const manquantes = mesureTypes.filter(
      (t) => t.obligatoire && (!values[t.id] || values[t.id].trim() === "")
    );
    if (manquantes.length > 0) {
      alert(
        "Merci de renseigner toutes les mesures obligatoires : " +
          manquantes.map((m) => m.label).join(", ")
      );
      return;
    }

    const payloadMesures = mesureTypes
      .map((t) => {
        const raw = values[t.id];
        if (!raw || raw.trim() === "") return null;
        const num = Number(raw.replace(",", "."));
        if (Number.isNaN(num)) return null;
        return {
          mesure_type_id: t.id,
          valeur: num,
        };
      })
      .filter(Boolean);

    if (!payloadMesures || payloadMesures.length === 0) {
      alert("Merci de renseigner au moins une mesure.");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch(`/api/boutique/devis/${id}/statut`, {
        method: "POST",
        body: JSON.stringify({
          statut: "ACCEPTE",
          mesures: payloadMesures,
        }),
      });

      router.push(`/devis/${id}/confirmation`);
    } catch (e: any) {
      alert(e.message || "Erreur lors de l'enregistrement des mesures");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-sm text-gray-600">Chargement des mesures...</div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded shadow p-6 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold mb-2">
            Impossible de charger les mesures
          </h1>
          <p className="text-sm text-gray-600 mb-4">{errorMsg}</p>
          <button
            onClick={() => router.push(`/devis/${id}`)}
            className="px-4 py-2 rounded bg-gray-900 text-white text-sm font-semibold"
          >
            Retour au devis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      <div className="max-w-2xl mx-auto bg-white rounded shadow p-6">
        <div className="text-xs text-gray-500 mb-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="underline hover:text-gray-700"
          >
            Tableau de bord
          </button>{" "}
          /{" "}
          <button
            onClick={() => router.push("/historique")}
            className="underline hover:text-gray-700"
          >
            Historique des devis
          </button>{" "}
          /{" "}
          <button
            onClick={() => router.push(`/devis/${id}`)}
            className="underline hover:text-gray-700"
          >
            Devis #{id}
          </button>{" "}
          / <span className="font-semibold">Prise de mesures</span>
        </div>

        <h1 className="text-2xl font-bold mb-3">Prise de mesures</h1>
        <p className="text-sm text-gray-600 mb-6">
          Merci de renseigner les mesures nécessaires pour la réalisation de la robe.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mesureTypes.map((t) => (
            <div key={t.id} className="flex items-center gap-3">
              <label className="w-2/3 text-sm text-gray-800">
                {t.label}
                {t.obligatoire && <span className="text-red-500"> *</span>}
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={values[t.id] ?? ""}
                onChange={(e) => handleChange(t.id, e.target.value)}
                className="w-1/3 border rounded px-2 py-1 text-sm"
                placeholder="cm"
              />
            </div>
          ))}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.push(`/devis/${id}`)}
              className="px-4 py-2 rounded border border-gray-300 text-sm"
            >
              Retour au devis
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded bg-gray-900 text-white text-sm font-semibold disabled:opacity-60"
            >
              Valider le devis et créer le bon de commande
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
