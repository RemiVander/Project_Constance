"use client";

import { useEffect, useState } from "react";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";

interface BonCommande {
  id: number;
  devis_id: number;
  numero_devis: number;
  date_creation: string;
  montant_boutique_ht: number;
  montant_boutique_ttc: number;
  has_tva: boolean;
  // si tu ajoutes ces champs côté API plus tard :
  statut?: string;
  commentaire_admin?: string | null;
}

export default function BonsCommandePage() {
  const router = useRouter();
  const [bons, setBons] = useState<BonCommande[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = (await apiFetch(
          "/api/boutique/bons-commande"
        )) as BonCommande[];
        setBons(data || []);
      } catch (err: any) {
        // si non connecté → redirection login
        if (err?.message?.includes("401")) {
          router.push("/login");
          return;
        }
        setError(
          err?.message || "Erreur lors du chargement des bons de commande"
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  const formatDate = (iso?: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR");
  };

  const formatStatut = (statut?: string) => {
    if (!statut) return "En attente de validation";
    switch (statut) {
      case "EN_ATTENTE_VALIDATION":
        return "En attente de validation";
      case "A_MODIFIER":
        return "À modifier par la boutique";
      case "VALIDE":
        return "Validé";
      case "REFUSE":
        return "Refusé";
      default:
        return statut;
    }
  };

  const statutBadgeClass = (statut?: string) => {
    const base =
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ";
    switch (statut) {
      case "EN_ATTENTE_VALIDATION":
      case undefined:
        return base + "bg-sky-100 text-sky-800";
      case "A_MODIFIER":
        return base + "bg-amber-100 text-amber-800";
      case "VALIDE":
        return base + "bg-emerald-100 text-emerald-800";
      case "REFUSE":
        return base + "bg-rose-100 text-rose-700";
      default:
        return base + "bg-slate-100 text-slate-700";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded shadow p-6">
          Chargement de vos bons de commande...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded shadow p-8 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold mb-2">
            Une erreur est survenue
          </h1>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.refresh()}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-5xl mx-auto py-8 px-4">
        <Breadcrumb
          items={[
            { label: "Tableau de bord", href: "/dashboard" },
            { label: "Mes bons de commande" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-2">Mes bons de commande</h1>
        <p className="text-sm text-gray-600 mb-6">
          Suivez ici l&apos;état de vos bons de commande, les montants et les
          éventuels commentaires de l&apos;administration.
        </p>

        {bons.length === 0 ? (
          <p className="text-sm text-gray-500">
            Vous n&apos;avez pas encore de bon de commande.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm bg-white rounded shadow">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 px-4">Référence devis</th>
                  <th className="py-2 px-4">Date BC</th>
                  <th className="py-2 px-4">Statut</th>
                  <th className="py-2 px-4">Montant boutique TTC</th>
                  <th className="py-2 px-4">Commentaire admin</th>
                  <th className="py-2 px-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bons.map((bc) => {
                  const pdfUrl = `${API_BASE_URL}/api/boutique/devis/${bc.devis_id}/bon-commande.pdf`;
                  return (
                    <tr key={bc.id} className="border-b align-top">
                      <td className="py-2 px-4 font-semibold">
                        #{bc.numero_devis}
                      </td>
                      <td className="py-2 px-4">
                        {formatDate(bc.date_creation)}
                      </td>
                      <td className="py-2 px-4">
                        <span className={statutBadgeClass(bc.statut)}>
                          {formatStatut(bc.statut)}
                        </span>
                      </td>
                      <td className="py-2 px-4">
                        {bc.montant_boutique_ttc.toFixed(2)} €
                      </td>
                      <td className="py-2 px-4 text-xs text-gray-600 max-w-xs">
                        {bc.commentaire_admin ? (
                          <span>{bc.commentaire_admin}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-2 px-4">
                        <a
                          href={pdfUrl}
                          target="_blank"
                          className="text-xs text-blue-600 underline"
                        >
                          PDF bon de commande
                        </a>
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
