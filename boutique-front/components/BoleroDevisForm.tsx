"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type TransformationTarif = {
  id: number;
  categorie: string;
  finition: string | null;
  robe_modele_id: number | null;
  epaisseur_ou_option: string | null;
  prix: number;
};

type Dentelle = {
  id: number;
  nom: string;
  actif?: boolean;
};

type OptionsResponse = {
  tarifs_transformations: TransformationTarif[];
  dentelles: Dentelle[];
};

export type BoleroDevisFormSubmitPayload = {
  dentelle_id: number | null;
  description: string;
  coutInterneTotal: number;
  configuration: {
    type: "BOLERO";
    devantId: number | null;
    dosId: number | null;
    manchesId: number | null;
    dentelleChoice: string;
  };
};

type BoleroDevisFormProps = {
  mode?: "create" | "edit";
  initialDevis?: any;
  onSubmit: (payload: BoleroDevisFormSubmitPayload) => Promise<void> | void;
};

export function BoleroDevisForm({
  mode = "create",
  initialDevis,
  onSubmit,
}: BoleroDevisFormProps) {
  const router = useRouter();

  const [options, setOptions] = useState<OptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [devantId, setDevantId] = useState<number | null>(null);
  const [dosId, setDosId] = useState<number | null>(null);
  const [manchesId, setManchesId] = useState<number | null>(null);

  const [dentelleChoice, setDentelleChoice] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const data = (await apiFetch(
          "/api/boutique/options"
        )) as OptionsResponse;
        setOptions({
          tarifs_transformations: data.tarifs_transformations,
          dentelles: data.dentelles,
        });
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

  // Pré-remplissage en mode édition
  useEffect(() => {
    if (mode !== "edit") return;
    if (!initialDevis) return;

    const config = (initialDevis as any).configuration as
      | {
          type?: string;
          devantId?: number | null;
          dosId?: number | null;
          manchesId?: number | null;
          dentelleChoice?: string;
        }
      | undefined;

    if (config && config.type === "BOLERO") {
      setDevantId(config.devantId ?? null);
      setDosId(config.dosId ?? null);
      setManchesId(config.manchesId ?? null);
      if (config.dentelleChoice) {
        setDentelleChoice(String(config.dentelleChoice));
      } else if (typeof (initialDevis as any).dentelle_id === "number") {
        setDentelleChoice(String((initialDevis as any).dentelle_id));
      } else {
        setDentelleChoice("none");
      }
    } else if (typeof (initialDevis as any).dentelle_id === "number") {
      setDentelleChoice(String((initialDevis as any).dentelle_id));
    }
  }, [mode, initialDevis]);

  const coutInterneTotal = useMemo(() => {
    if (!options) return 0;
    let total = 0;
    const add = (id: number | null) => {
      if (!id) return;
      const t = options.tarifs_transformations.find((x) => x.id === id);
      if (t) total += t.prix;
    };
    add(devantId);
    add(dosId);
    add(manchesId);
    return total;
  }, [options, devantId, dosId, manchesId]);

  const hasError = (key: string) => invalidFields.includes(key);
  const baseSelectClass = "w-full border rounded px-3 py-2 text-sm";
  const classFor = (key: string) =>
    hasError(key)
      ? `${baseSelectClass} border-red-500 bg-red-50`
      : baseSelectClass;

  const clearFieldError = (keys: string | string[]) => {
    const arr = Array.isArray(keys) ? keys : [keys];
    setInvalidFields((prev) => prev.filter((k) => !arr.includes(k)));
  };

  async function handleSubmit() {
    if (!options) {
      setSaveError("Options non chargées.");
      return;
    }

    const newInvalid: string[] = [];

    if (!devantId) newInvalid.push("devant");
    if (!dosId) newInvalid.push("dos");
    if (!manchesId) newInvalid.push("manches");
    if (!dentelleChoice) newInvalid.push("dentelle");

    if (newInvalid.length > 0 || coutInterneTotal <= 0) {
      setInvalidFields([...new Set(newInvalid)]);
      setSaveError(
        "Merci de remplir tous les champs requis pour le boléro (devant, dos, manches, dentelle)."
      );
      return;
    }

    setInvalidFields([]);
    setSaveError(null);

    const selectedDentelleId =
      dentelleChoice === "none" || dentelleChoice === ""
        ? null
        : Number(dentelleChoice);

    const parts: string[] = [];

    const labelFor = (id: number | null) => {
      if (!id) return "";
      const t = options.tarifs_transformations.find((x) => x.id === id);
      if (!t) return "";
      const extra = t.epaisseur_ou_option ? ` – ${t.epaisseur_ou_option}` : "";
      return `${t.finition ?? ""}${extra}`;
    };

    const devantLabel = labelFor(devantId);
    const dosLabel = labelFor(dosId);
    const manchesLabel = labelFor(manchesId);

    if (devantLabel) parts.push(`Finition devant : ${devantLabel}`);
    if (dosLabel) parts.push(`Finition dos : ${dosLabel}`);
    if (manchesLabel) parts.push(`Manches : ${manchesLabel}`);

    if (selectedDentelleId) {
      const d = options.dentelles.find((dd) => dd.id === selectedDentelleId);
      if (d) {
        parts.push(`Dentelle : ${d.nom}`);
      }
    } else if (dentelleChoice === "none") {
      parts.push("Aucune dentelle (confirmé par la boutique)");
    }

    const description =
      parts.length > 0 ? `Boléro – ${parts.join(" | ")}` : "Boléro sur mesure";

    const payload: BoleroDevisFormSubmitPayload = {
      dentelle_id: selectedDentelleId,
      description,
      coutInterneTotal,
      configuration: {
        type: "BOLERO",
        devantId,
        dosId,
        manchesId,
        dentelleChoice,
      },
    };

    setSaving(true);
    try {
      await onSubmit(payload);
    } catch (err: any) {
      setSaveError(
        err?.message ||
          "Erreur lors de l'enregistrement du devis boléro. Veuillez réessayer."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p>Chargement…</p>;
  if (!options)
    return (
      <div>
        <p className="text-red-600">Impossible de charger les options.</p>
        {loadError && <p className="text-xs">{loadError}</p>}
      </div>
    );

  return (
    <>
      {saveError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded mb-4">
          {saveError}
        </p>
      )}

      <div className="border rounded-xl p-4 bg-white space-y-4">
        <h2 className="font-semibold text-lg">Configuration du boléro</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Finition devant
            </label>
            <select
              className={classFor("devant")}
              value={devantId ?? ""}
              onChange={(e) => {
                setDevantId(e.target.value ? Number(e.target.value) : null);
                clearFieldError("devant");
              }}
            >
              <option value="">Aucune</option>
              {options.tarifs_transformations
                .filter((t) => t.categorie === "Décolleté devant")
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.finition}{" "}
                    {t.epaisseur_ou_option
                      ? `– ${t.epaisseur_ou_option}`
                      : ""}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Finition dos
            </label>
            <select
              className={classFor("dos")}
              value={dosId ?? ""}
              onChange={(e) => {
                setDosId(e.target.value ? Number(e.target.value) : null);
                clearFieldError("dos");
              }}
            >
              <option value="">Aucune</option>
              {options.tarifs_transformations
                .filter((t) => t.categorie === "Décolleté dos")
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.finition}{" "}
                    {t.epaisseur_ou_option
                      ? `– ${t.epaisseur_ou_option}`
                      : ""}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Manches
            </label>
            <select
              className={classFor("manches")}
              value={manchesId ?? ""}
              onChange={(e) => {
                setManchesId(e.target.value ? Number(e.target.value) : null);
                clearFieldError("manches");
              }}
            >
              <option value="">Aucune</option>
              {options.tarifs_transformations
                .filter((t) => t.categorie === "Manches")
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.finition}{" "}
                    {t.epaisseur_ou_option
                      ? `– ${t.epaisseur_ou_option}`
                      : ""}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      <div className="border rounded-xl p-4 bg-white mt-6">
        <h2 className="font-semibold mb-3">Dentelle</h2>

        <label className="block text-sm font-medium mb-1">
          Choix de la dentelle
        </label>
        <select
          className={classFor("dentelle")}
          value={dentelleChoice}
          onChange={(e) => {
            const val = e.target.value;
            setDentelleChoice(val);
            clearFieldError("dentelle");
          }}
        >
          <option value="">-- Sélectionnez une option --</option>
          <option value="none">Aucune dentelle</option>
          {options.dentelles
            ?.filter((d) => d.actif === undefined || d.actif === true)
            .map((d) => (
              <option key={d.id} value={String(d.id)}>
                {d.nom}
              </option>
            ))}
        </select>
      </div>

      <div className="border rounded-xl p-6 bg-white flex flex-col items-center gap-2 mt-6">
        <button
          type="button"
          disabled={saving}
          onClick={handleSubmit}
          className="mt-2 inline-flex justify-center bg-gray-900 text-white text-sm font-semibold px-6 py-2 rounded-full disabled:opacity-50"
        >
          {saving
            ? mode === "edit"
              ? "Mise à jour du devis boléro…"
              : "Création du devis boléro…"
            : mode === "edit"
            ? "Enregistrer le boléro"
            : "Créer le devis boléro"}
        </button>
      </div>
    </>
  );
}

