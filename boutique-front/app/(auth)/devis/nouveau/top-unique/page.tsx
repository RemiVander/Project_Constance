"use client";

import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  TopUniqueDevisForm,
  TopUniqueDevisFormSubmitPayload,
} from "@/components/TopUniqueDevisForm";

export default function NouveauDevisTopUniquePage() {
  const router = useRouter();

  async function handleCreate(payload: TopUniqueDevisFormSubmitPayload) {
    const body = {
      dentelle_id: payload.dentelle_id,
      configuration: {
        ...payload.configuration,
      },
      type: "TOP_UNIQUE",
      lignes: [
        {
          robe_modele_id: null,
          description: payload.description,
          quantite: 1,
          prix_unitaire: payload.coutInterneTotal,
        },
      ],
    };

    try {
      const created = await apiFetch("/api/boutique/devis", {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (created?.id) {
        router.push(`/devis/${created.id}/confirmation`);
      } else {
        router.push("/dashboard");
      }
    } catch (e: any) {
      alert(
        e?.message ||
          "Erreur lors de la création du devis. Veuillez réessayer."
      );
    }
  }

  return <TopUniqueDevisForm mode="create" onSubmit={handleCreate} />;
}
