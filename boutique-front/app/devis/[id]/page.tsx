"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type LigneDevis = {
  id: number;
  description: string | null;
  quantite: number;
  prix_unitaire: number;
};

type Devis = {
  id: number;
  numero_boutique: number;
  statut: string;
  date_creation: string | null;
  prix_total: number;
  lignes: LigneDevis[] | null;
};

export default function DevisDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [devis, setDevis] = useState<Devis | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch(`/api/boutique/devis/${id}`);
        setDevis(data);
      } catch (e: any) {
        setErrorMsg(e.message || "Erreur lors du chargement du devis");
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  async function handleRefuser() {
    if (!devis) return;
    if (!confirm("Confirmer le refus de ce devis ?")) return;
    setActionLoading(true);
    try {
      await apiFetch(`/api/boutique/devis/${devis.id}/statut`, {
        method: "POST",
        body: JSON.stringify({
          statut: "REFUSE",
          mesures: null,
        }),
      });
      router.push("/historique");
    } catch (e: any) {
      alert(e.message || "Erreur lors du changement de statut");
    } finally {
      setActionLoading(false);
    }
  }

  function handleValider() {
    if (!devis) return;
    router.push(`/devis/${devis.id}/mesures`);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-sm text-gray-600">Chargement du devis...</div>
      </div>
    );
  }

  if (errorMsg || !devis) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded shadow p-6 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold mb-2">Devis introuvable</h1>
          <p className="text-sm text-gray-600 mb-4">
            {errorMsg || "Impossible de charger ce devis."}
          </p>
          <button
            onClick={() => router.push("/historique")}
            className="px-4 py-2 rounded bg-gray-900 text-white text-sm font-semibold"
          >
            Retour à l&apos;historique
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      <div className="max-w-3xl mx-auto bg-white rounded shadow p-6">
        {/* Fil d'Ariane simple */}
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
          / <span className="font-semibold">Devis #{devis.numero_boutique}</span>
        </div>

        <h1 className="text-2xl font-bold mb-2">
          Devis #{devis.numero_boutique}
        </h1>
        <p className="text-sm text-gray-600 mb-4">
          Statut :{" "}
          <span className="font-semibold">
            {devis.statut === "EN_COURS"
              ? "En cours"
              : devis.statut === "ACCEPTE"
              ? "Accepté"
              : "Refusé"}
          </span>
          {devis.date_creation && (
            <>
              {" "}• créé le{" "}
              {new Date(devis.date_creation).toLocaleDateString("fr-FR")}
            </>
          )}
        </p>

        {/* Détail des lignes */}
        {devis.lignes && devis.lignes.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Détail</h2>
            <div className="border rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Description</th>
                    <th className="px-3 py-2 text-right">Quantité</th>
                    <th className="px-3 py-2 text-right">Prix unitaire</th>
                  </tr>
                </thead>
                <tbody>
                  {devis.lignes.map((l) => (
                    <tr key={l.id} className="border-t">
                      <td className="px-3 py-2">
                        {l.description || "Robe de mariée sur-mesure"}
                      </td>
                      <td className="px-3 py-2 text-right">{l.quantite}</td>
                      <td className="px-3 py-2 text-right">
                        {l.prix_unitaire.toFixed(2)} €
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="mb-6 text-right text-sm text-gray-700">
          Total interne :{" "}
          <span className="font-semibold">
            {devis.prix_total.toFixed(2)} € HT
          </span>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <button
            type="button"
            onClick={handleRefuser}
            disabled={actionLoading}
            className="px-4 py-2 rounded border border-red-300 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            Refuser le devis
          </button>

          <button
            type="button"
            onClick={handleValider}
            disabled={actionLoading}
            className="px-4 py-2 rounded bg-gray-900 text-white text-sm font-semibold disabled:opacity-60"
          >
            Passer à la prise de mesures
          </button>
        </div>
      </div>
    </div>
  );
}
