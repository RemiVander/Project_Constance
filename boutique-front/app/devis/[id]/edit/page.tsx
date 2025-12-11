"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  DevisForm,
  DevisFormSubmitPayload,
} from "@/components/DevisForm";
import { Breadcrumb } from "@/components/Breadcrumb";

export default function EditDevisPage() {
  const router = useRouter();
  const params = useParams();
  const idParam = params?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  const [initialDevis, setInitialDevis] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const data = await apiFetch(`/api/boutique/devis/${id}`);
        setInitialDevis(data);
      } catch (e: any) {
        setErrorMsg(e?.message || "Erreur lors du chargement du devis");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleUpdate(payload: DevisFormSubmitPayload) {
    try {
        const body = {
          dentelle_id: payload.dentelle_id,
          configuration:
            payload.configuration ?? (initialDevis as any)?.configuration ?? null,
          lignes: [
            {
              robe_modele_id: null,
              description: payload.description,
              quantite: 1,
              prix_unitaire: payload.coutInterneTotal,
            },
          ],
        };


      await apiFetch(`/api/boutique/devis/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });

      router.push("/historique");
    } catch (e: any) {
      alert(e?.message || "Erreur lors de la mise à jour du devis");
    }
  }

  if (!id) {
    return <p className="text-sm text-red-600">Identifiant de devis manquant.</p>;
  }

  if (loading) {
    return <p className="text-sm text-gray-600">Chargement du devis…</p>;
  }

  if (errorMsg) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">
          Impossible de charger le devis : {errorMsg}
        </p>
        <button
          onClick={() => router.push("/historique")}
          className="px-4 py-2 rounded bg-gray-900 text-white text-sm font-semibold"
        >
          Retour à l&apos;historique
        </button>
      </div>
    );
  }

  if (!initialDevis) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">Devis introuvable.</p>
        <button
          onClick={() => router.push("/historique")}
          className="px-4 py-2 rounded bg-gray-900 text-white text-sm font-semibold"
        >
          Retour à l&apos;historique
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Tableau de bord", href: "/dashboard" },
          { label: "Historique des devis", href: "/historique" },
          { label: `Modifier le devis #${initialDevis.numero_boutique}` },
        ]}
      />

      <h1 className="text-2xl font-bold">
        Modifier le devis #{initialDevis.numero_boutique}
      </h1>

      <DevisForm
        mode="edit"
        initialDevis={initialDevis}
        onSubmit={handleUpdate}
      />
    </div>
  );
}
