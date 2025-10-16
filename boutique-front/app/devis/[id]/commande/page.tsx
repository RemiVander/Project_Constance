"use client";

import { useParams, useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

export default function BonCommandeConfirmationPage() {
  const router = useRouter();
  const params = useParams();

  const rawId = params?.id as string | string[] | undefined;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded shadow p-6 max-w-md w-full text-center">
          <h1 className="text-xl font-semibold mb-2">
            Bon de commande introuvable
          </h1>
          <p className="text-sm text-gray-600 mb-4">
            Impossible de récupérer l&apos;identifiant du devis.
          </p>
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

  const bonCommandeUrl = `${API_BASE_URL}/api/boutique/devis/${id}/bon-commande.pdf`;
  const devisUrl = `${API_BASE_URL}/api/boutique/devis/${id}/pdf`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white rounded shadow p-8 max-w-lg w-full text-center">
        <h1 className="text-2xl font-bold mb-3">
          Bon de commande créé avec succès
        </h1>

        <p className="text-sm text-gray-700 mb-6">
          Votre bon de commande a été enregistré pour le devis&nbsp;
          <span className="font-semibold">#{id}</span>.
          <br />
          Vous pouvez maintenant télécharger le bon de commande au format PDF
          ou revenir à votre tableau de bord.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <a
            href={bonCommandeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded bg-gray-900 text-white text-sm font-semibold"
          >
            Télécharger le bon de commande (PDF)
          </a>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 rounded border border-gray-300 text-sm"
          >
            Retour au tableau de bord
          </button>
        </div>

        <p className="text-xs text-gray-500">
          Si le téléchargement ne se lance pas, vérifiez que vous êtes
          toujours connecté à votre espace partenaire.
        </p>
      </div>
    </div>
  );
}
