"use client";

import { useEffect, useState } from "react";
import { apiFetch, API_BASE_URL } from "@/lib/api";
import { useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/Breadcrumb";

interface Devis {
  id: number;
  numero_boutique: number;
  statut: string;
  date_creation?: string | null;
  prix_total: number;
}

export default function HistoriqueDevisPage() {
  const router = useRouter();
  const [devis, setDevis] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = (await apiFetch(
          "/api/boutique/devis"
        )) as Devis[];
        setDevis(data);
      } catch (err: any) {
        // si non connecté → retour login
        if (err?.message?.includes("401")) {
          router.push("/login");
          return;
        }
        setError(
          err?.message || "Erreur lors du chargement de l'historique"
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

  const formatStatut = (statut: string) => {
    switch (statut) {
      case "EN_COURS":
        return "En cours";
      case "ACCEPTE":
        return "Accepté";
      case "REFUSE":
        return "Refusé";
      default:
        return statut;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded shadow p-6">
          Chargement de votre historique...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded shadow p-6 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold mb-2">
            Erreur de chargement
          </h1>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
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
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white rounded shadow p-8 max-w-4xl w-full">
        <Breadcrumb
          items={[
            { label: "Tableau de bord", href: "/dashboard" },
            { label: "Historique des devis" },
          ]}
        />

        <h1 className="text-2xl font-bold mb-4">
          Mon historique de devis
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Retrouvez l'ensemble de vos devis, avec leur statut et un lien
          pour télécharger le PDF.
        </p>

        {devis.length === 0 ? (
          <p className="text-sm text-gray-500">
            Vous n'avez pas encore de devis.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4">Référence</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Statut</th>
                  <th className="py-2 pr-4">Montant (base HT)</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {devis.map((d) => {
                  const pdfUrl = `${API_BASE_URL}/api/boutique/devis/${d.id}/pdf`;
                  return (
                    <tr key={d.id} className="border-b">
                      <td className="py-2 pr-4 font-semibold">
                        #{d.numero_boutique}
                      </td>
                      <td className="py-2 pr-4">
                        {formatDate(d.date_creation)}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className="
                            inline-flex items-center px-2 py-0.5 rounded-full text-xs
                            border
                          "
                        >
                          {formatStatut(d.statut)}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        {d.prix_total.toFixed(2)} €
                      </td>
                      <td className="py-2 pr-4 flex flex-wrap gap-2">
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-3 py-1 rounded bg-gray-900 text-white"
                        >
                          PDF devis
                        </a>
                        {/* plus tard: bouton "Valider" / "Refuser" ici */}
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
