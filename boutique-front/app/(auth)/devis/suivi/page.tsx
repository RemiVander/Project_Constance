"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, API_BASE_URL } from "@/lib/api";

type Devis = {
  id: number;
  numero_boutique: number;
  statut: string;
  date_creation?: string | null;
  prix_total: number;
  prix_boutique: number;
  prix_client_conseille_ttc: number;
};

export default function SuiviDevisPage() {
  const router = useRouter();
  const [devis, setDevis] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [filtreStatut, setFiltreStatut] = useState<
    "TOUS" | "EN_COURS" | "ACCEPTE" | "REFUSE"
  >("EN_COURS");

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch("/api/boutique/devis");
        setDevis(data as Devis[]);
      } catch (e: any) {
        if (e?.message?.includes("401")) {
          router.replace("/login");
          return;
        }
        setErrorMsg(e.message || "Erreur lors du chargement des devis");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  function formatDate(iso?: string | null) {
    if (!iso) return "-";
    return new Date(iso).toLocaleDateString("fr-FR");
  }

  function formatStatut(statut: string) {
    switch (statut) {
      case "EN_COURS":
        return "En cours";
      case "ACCEPTE":
        return "Validé";
      case "REFUSE":
        return "Refusé";
      default:
        return statut;
    }
  }

  function statutBadgeClass(statut: string) {
    const base =
      "inline-flex items-center justify-center rounded-full px-3 py-0.5 text-xs font-medium ";
    switch (statut) {
      case "EN_COURS":
        return base + "bg-amber-100 text-amber-800";
      case "ACCEPTE":
        return base + "bg-emerald-100 text-emerald-800";
      case "REFUSE":
        return base + "bg-rose-100 text-rose-700";
      default:
        return base + "bg-slate-100 text-slate-700";
    }
  }

  async function handleRefuser(id: number) {
    if (!confirm("Confirmer le refus de ce devis ?")) return;
    setActionId(id);
    try {
      await apiFetch(`/api/boutique/devis/${id}/statut`, {
        method: "POST",
        body: JSON.stringify({
          statut: "REFUSE",
          mesures: null,
        }),
      });
      setDevis((prev) =>
        prev.map((d) => (d.id === id ? { ...d, statut: "REFUSE" } : d))
      );
    } catch (e: any) {
      alert(e.message || "Erreur lors du refus du devis");
    } finally {
      setActionId(null);
    }
  }

  function handleValider(id: number) {
    router.push(`/devis/${id}/mesures`);
  }

  const devisFiltres = devis.filter((d) =>
    filtreStatut === "TOUS" ? true : d.statut === filtreStatut
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100">
        <main className="max-w-5xl mx-auto px-4 py-10">
          <div className="bg-white rounded shadow p-4 text-sm text-gray-600">
            Chargement des devis...
          </div>
        </main>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-100">
        <main className="max-w-5xl mx-auto px-4 py-10">
          <div className="bg-white rounded shadow p-6 max-w-md w-full text-center mx-auto">
            <h1 className="text-xl font-semibold mb-2">
              Impossible de charger les devis
            </h1>
            <p className="text-sm text-gray-600 mb-4">{errorMsg}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-4 py-2 rounded bg-gray-900 text-white text-sm font-semibold"
            >
              Retour au tableau de bord
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">      
      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-2">Suivre mes devis</h1>
        <p className="text-sm text-gray-600 mb-4">
          Retrouvez l&apos;ensemble de vos devis, leur statut, les montants
          interne et client, et téléchargez les PDF.
        </p>

        <div className="flex items-center gap-3 mb-4 text-sm">
          <span className="text-gray-600">Filtrer par statut :</span>
          <select
            value={filtreStatut}
            onChange={(e) => setFiltreStatut(e.target.value as any)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="EN_COURS">En cours</option>
            <option value="ACCEPTE">Validés</option>
            <option value="REFUSE">Refusés</option>
            <option value="TOUS">Tous</option>
          </select>
        </div>

        {devisFiltres.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucun devis pour ce filtre.
          </p>
        ) : (
          <div className="overflow-x-auto bg-white rounded shadow">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-4">Référence</th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4 text-center">Statut</th>
                  <th className="py-2 pr-4">Montant interne</th>
                  <th className="py-2 pr-4">Montant client</th>
                  <th className="py-2 pr-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {devisFiltres.map((d) => {
                  const devisPdfUrl = `${API_BASE_URL}/api/boutique/devis/${d.id}/pdf`;
                  const bonCommandeUrl = `${API_BASE_URL}/api/boutique/bons-commande/${d.id}/pdf`;
                  const isEnCours = d.statut === "EN_COURS";

                  return (
                    <tr key={d.id} className="border-b">
                      <td className="py-2 pr-4 font-semibold">
                        #{d.numero_boutique}
                      </td>
                      <td className="py-2 pr-4">
                        {formatDate(d.date_creation)}
                      </td>
                      <td className="py-2 pr-4 text-center">
                        <span className={statutBadgeClass(d.statut)}>
                          {formatStatut(d.statut)}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        {d.prix_boutique.toFixed(2)} €
                      </td>
                      <td className="py-2 pr-4">
                        {d.prix_client_conseille_ttc.toFixed(2)} € TTC
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={devisPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-3 py-1 rounded-full bg-gray-900 text-white hover:bg-black"
                          >
                            PDF devis
                          </a>

                          {d.statut === "ACCEPTE" && (
                            <a
                              href={bonCommandeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs px-3 py-1 rounded-full bg-emerald-700 text-white hover:bg-emerald-800"
                            >
                              Bon de commande
                            </a>
                          )}

                          {isEnCours && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(`/devis/${d.id}/edit`)
                                }
                                className="text-xs px-3 py-1 rounded-full border border-gray-300 text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                              >
                                Modifier
                              </button>

                              <button
                                type="button"
                                onClick={() => handleValider(d.id)}
                                disabled={actionId === d.id}
                                className="text-xs px-3 py-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                              >
                                Valider
                              </button>

                              <button
                                type="button"
                                onClick={() => handleRefuser(d.id)}
                                disabled={actionId === d.id}
                                className="text-xs px-3 py-1 rounded-full border border-rose-300 text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                              >
                                Refuser
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
