"use client";

import { useEffect, useState } from "react";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { useRouter } from "next/navigation";

type BonCommande = {
  id: number;
  devis_id: number;
  numero_devis: number;
  date_creation: string;
  montant_boutique_ht: number;
  montant_boutique_ttc: number;
  has_tva: boolean;
  statut: string;
  commentaire_admin?: string | null;
};

export default function BonsCommandePage() {
  const router = useRouter();
  const [bons, setBons] = useState<BonCommande[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const data = (await apiFetch(
          "/api/boutique/bons-commande"
        )) as BonCommande[];
        setBons(data || []);
      } catch (e: any) {
        setErrorMsg(e?.message || "Erreur lors du chargement des bons.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const formatDate = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString("fr-FR") : "-";

  const statutLabel = (statut: string) => {
    switch (statut) {
      case "EN_ATTENTE_VALIDATION":
        return "En attente de validation";
      case "VALIDE":
        return "Validé";
      case "A_MODIFIER":
        return "À modifier";
      case "REFUSE":
        return "Refusé";
      default:
        return statut;
    }
  };

  const statutBadge = (statut: string) => {
    const base =
      "inline-flex items-center justify-center rounded-full px-3 py-0.5 text-xs font-semibold ";

    switch (statut) {
      case "EN_ATTENTE_VALIDATION":
        return base + "bg-sky-100 text-sky-800";
      case "VALIDE":
        return base + "bg-emerald-100 text-emerald-800";
      case "A_MODIFIER":
        return base + "bg-amber-100 text-amber-800";
      case "REFUSE":
        return base + "bg-rose-100 text-rose-700";
      default:
        return base + "bg-gray-100 text-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded shadow p-4 text-sm text-gray-600">
          Chargement des bons de commande…
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded shadow p-6 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold mb-2">
            Impossible de charger les bons de commande
          </h1>
          <p className="text-sm text-gray-600 mb-4">{errorMsg}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 rounded bg-gray-900 text-white text-sm font-semibold"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      <div className="max-w-5xl mx-auto bg-white rounded shadow p-6">
        <div className="text-xs text-gray-500 mb-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="underline hover:text-gray-700"
          >
            Tableau de bord
          </button>{" "}
          / <span className="font-semibold">Mes bons de commande</span>
        </div>

        <h1 className="text-2xl font-bold mb-2">Mes bons de commande</h1>
        <p className="text-sm text-gray-600 mb-4">
          Retrouvez ici les bons de commande générés à partir de vos devis.
        </p>

        {bons.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucun bon de commande pour le moment.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4">Devis</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Montant HT</th>
                  <th className="py-2 pr-4">Montant TTC</th>
                  <th className="py-2 pr-4 text-center">Statut</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bons.map((b) => {
                  const pdfUrl = `${API_BASE_URL}/api/boutique/bons-commande/${b.devis_id}/pdf`;

                  const montantAPayer = b.has_tva
                    ? b.montant_boutique_ht
                    : b.montant_boutique_ttc;

                  const isAModifier = b.statut === "A_MODIFIER";

                  return (
                    <tr key={b.id} className="border-b align-top">
                      <td className="py-2 pr-4 font-semibold">
                        #{b.numero_devis}
                      </td>
                      <td className="py-2 pr-4">
                        {formatDate(b.date_creation)}
                      </td>
                      <td className="py-2 pr-4">
                        {b.montant_boutique_ht.toFixed(2)} €
                      </td>
                      <td className="py-2 pr-4">
                        {b.montant_boutique_ttc.toFixed(2)} €
                      </td>

                      <td className="py-2 pr-4 text-center">
                        <span className={statutBadge(b.statut)}>
                          {statutLabel(b.statut)}
                        </span>

                        {b.commentaire_admin && (
                          <div className="mt-1 text-xs text-rose-700 bg-rose-50 px-2 py-1 rounded">
                            Commentaire atelier : {b.commentaire_admin}
                          </div>
                        )}
                      </td>

                      <td className="py-2 pr-4 space-y-2">
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex text-xs px-3 py-1 rounded-full bg-gray-900 text-white hover:bg-black"
                        >
                          PDF bon de commande
                        </a>

                        {isAModifier && (
                          <button
                            onClick={() =>
                              router.push(`/devis/${b.devis_id}/corriger`)
                            }
                            className="block w-full text-xs px-3 py-1 rounded-full border border-amber-500 text-amber-700 hover:bg-amber-50"
                          >
                            Corriger le bon
                          </button>
                        )}

                        <div className="text-[11px] text-gray-500">
                          Montant à payer :{" "}
                          {montantAPayer.toFixed(2).replace(".", ",")} €
                          {b.has_tva ? " (HT)" : " (TTC)"}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
