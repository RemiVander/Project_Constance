"use client";

import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  DevisForm,
  DevisFormSubmitPayload,
} from "@/components/DevisForm";

export default function NouveauDevisPage() {
  const router = useRouter();

  async function handleCreate(formPayload: DevisFormSubmitPayload) {
    const body = {
      dentelle_id: formPayload.dentelle_id,
      configuration: formPayload.configuration ?? null,
      lignes: [
        {
          robe_modele_id: null,
          description: formPayload.description,
          quantite: 1,
          prix_unitaire: formPayload.coutInterneTotal,
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

  return <DevisForm mode="create" onSubmit={handleCreate} />;
}
