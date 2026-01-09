"use client";

import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  BasDevisForm,
  BasDevisFormSubmitPayload,
} from "@/components/BasDevisForm";

export default function NouveauDevisBasPage() {
  const router = useRouter();

  async function handleCreate(payload: BasDevisFormSubmitPayload) {
    const body = {
      dentelle_id: payload.dentelle_id,
      configuration: {
        ...payload.configuration,
      },
      type: "BAS",
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

  return <BasDevisForm mode="create" onSubmit={handleCreate} />;
}
