import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type RobeModele = {
  id: number;
  nom: string;
  description?: string | null;
};

type TransformationTarif = {
  id: number;
  categorie: string;
  finition: string | null;
  robe_modele_id: number | null;
  epaisseur_ou_option: string | null;
  prix: number;
  est_decollete: boolean;
  ceinture_possible: boolean;
  nb_epaisseurs?: number | null;
};

type TissuTarif = {
  id: number;
  categorie: string;
  robe_modele_id: number | null;
  detail: string;
  forme: string | null;
  prix: number;
  nb_epaisseurs?: number | null;
  mono_epaisseur?: boolean;
  matiere?: string | null;
};

type FinitionSupp = {
  id: number;
  nom: string;
  prix: number;
  est_fente: boolean;
  applicable_top_unique?: boolean;
};

type Accessoire = {
  id: number;
  nom: string;
  description?: string | null;
  prix: number;
};

type Dentelle = {
  id: number;
  nom: string;
  actif?: boolean;
};

export type OptionsResponse = {
  robe_modeles?: RobeModele[];
  tarifs_transformations: TransformationTarif[];
  tarifs_tissus?: TissuTarif[];
  finitions_supplementaires?: FinitionSupp[];
  accessoires?: Accessoire[];
  dentelles: Dentelle[];
};

export function useDevisOptions() {
  const router = useRouter();
  const [options, setOptions] = useState<OptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = (await apiFetch(
          "/api/boutique/options"
        )) as OptionsResponse;
        setOptions(data);
      } catch (err: any) {
        if (err?.message?.includes("401")) {
          router.replace("/login");
          return;
        }
        setLoadError(err?.message || "Erreur lors du chargement des options");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  return { options, loading, loadError };
}

export type { TransformationTarif, TissuTarif, FinitionSupp, Accessoire, Dentelle, RobeModele };
