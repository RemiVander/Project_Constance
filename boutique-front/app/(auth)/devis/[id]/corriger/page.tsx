"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type MesureType = {
  id: number;
  code: string;
  label: string;
  ordre: number;
};

type MesureValeur = {
  mesure_type_id: number;
  valeur: string | null;
};

type DevisDetail = {
  id: number;
  numero_boutique: string | null;
  description: string;
  dentelle_id: number | null;
  coutInterneTotal: number;
  mesures?: MesureValeur[];
  mesure_types?: MesureType[];
  commentaire_boutique?: string | null;
};

export default function CorrigerDevisPage() {
  const params = useParams();
  const router = useRouter();
  const devisId = params?.id as string;

  const [devis, setDevis] = useState<DevisDetail | null>(null);
  const [mesureTypes, setMesureTypes] = useState<MesureType[]>([]);
  const [mesures, setMesures] = useState<Record<number, string>>({});
  const [commentaire, setCommentaire] = useState<string>("");

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Chargement du devis + mesures existantes
  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const d = (await apiFetch(
          `/api/boutique/devis/${devisId}`
        )) as DevisDetail;

        setDevis(d);

        // Types de mesures : soit envoyés dans la réponse, soit à charger
        let types: MesureType[] = (d as any).mesure_types || [];

        if (!types || types.length === 0) {
          try {
            types = (await apiFetch(
              "/api/boutique/mesures/types"
            )) as MesureType[];
          } catch {
            // Endpoint absent -> pas de mesures
          }
        }

        setMesureTypes(types);

        // Pré-remplir mesures
        const initialMesures: Record<number, string> = {};
        if (d.mesures) {
          d.mesures.forEach((m) => {
            initialMesures[m.mesure_type_id] = m.valeur ?? "";
          });
        }
        setMesures(initialMesures);

        // Pré-remplir commentaire
        setCommentaire(d.commentaire_boutique ?? "");
      } catch (e: any) {
        setErrorMsg(
          e?.message || "Impossible de charger le bon de commande."
        );
      } finally {
        setLoading(false);
      }
    }

    if (devisId) load();
  }, [devisId]);

  async function handleSubmit() {
    if (!devisId) return;

    setSaving(true);
    setErrorMsg(null);

    try {
      const payload = {
        commentaire_boutique: commentaire,
        mesures: Object.entries(mesures)
          .filter(([_, v]) => (v ?? "").toString().trim() !== "")
          .map(([id, valeur]) => ({
            mesure_type_id: Number(id),
            valeur: valeur.toString().trim(),
          })),
      };

      await apiFetch(`/api/boutique/devis/${devisId}/mesures`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      router.push("/bons-commande");
    } catch (e: any) {
      setErrorMsg(
        e?.message ||
          "Impossible de mettre à jour les mesures et le commentaire."
      );
    } finally {
      setSaving(false);
    }
  }

  // Affichages

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-gray-600 text-sm">
          Chargement du bon de commande…
        </div>
      </div>
    );
  }

  if (!devis) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white shadow rounded p-6 text-center">
          <p className="text-gray-700 text-sm mb-2">
            Impossible de trouver ce bon de commande.
          </p>
          <button
            onClick={() => router.push("/bons-commande")}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      <div className="max-w-3xl mx-auto bg-white shadow rounded p-6 space-y-6">
        <div className="text-xs text-gray-500">
          <button
            onClick={() => router.push("/bons-commande")}
            className="underline hover:text-gray-700"
          >
            Mes bons de commande
          </button>{" "}
          / Correction du bon lié au devis #{devis.id}
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">
            {errorMsg}
          </div>
        )}

        <h1 className="text-xl font-bold">
          Corriger les mesures du bon de commande
        </h1>

        <p className="text-sm text-gray-600">
          Ajustez les mesures ci-dessous et, si nécessaire, ajoutez un
          commentaire expliquant la modification.
        </p>

        {/* Mesures */}
        {mesureTypes.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucune mesure n'est configurée pour ce devis.
          </p>
        ) : (
          <div className="space-y-3">
            {mesureTypes
              .sort((a, b) => a.ordre - b.ordre)
              .map((mt) => (
                <div key={mt.id} className="flex items-center gap-3">
                  <label className="w-64 text-sm text-gray-700">
                    {mt.label}
                  </label>
                  <input
                    type="text"
                    className="flex-1 border rounded px-2 py-1 text-sm"
                    value={mesures[mt.id] ?? ""}
                    onChange={(e) =>
                      setMesures((prev) => ({
                        ...prev,
                        [mt.id]: e.target.value,
                      }))
                    }
                  />
                </div>
              ))}
          </div>
        )}

        {/* Commentaire */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Commentaire
          </label>
          <textarea
            className="w-full border rounded p-2 text-sm"
            rows={4}
            placeholder="Écrivez ici les remarques ou particularités à transmettre à l’atelier..."
            value={commentaire}
            onChange={(e) => setCommentaire(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 bg-gray-900 text-white text-sm rounded-full disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Valider la correction"}
          </button>
        </div>
      </div>
    </div>
  );
}
