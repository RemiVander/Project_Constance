"use client";

import { useEffect, useState } from "react";
import { useDevisOptions } from "@/hooks/useDevisOptions";
import { useDevisFormLogic } from "@/hooks/useDevisFormLogic";
import { useFormValidation } from "@/hooks/useFormValidation";
import { usePrixCalculation } from "@/hooks/usePrixCalculation";
import { BasSection } from "./devis/BasSection";
import { SubmitButton } from "./devis/SubmitButton";

export type BasDevisFormSubmitPayload = {
  dentelle_id: number | null;
  description: string;
  coutInterneTotal: number;
  configuration: {
    type: "BAS";
    basId: number | null;
    tissuBasId: number | null;
    finitionsIds: number[];
    accessoiresIds: number[];
  };
};

type BasDevisFormProps = {
  mode?: "create" | "edit";
  initialDevis?: any;
  onSubmit: (payload: BasDevisFormSubmitPayload) => Promise<void> | void;
};

export function BasDevisForm({
  mode = "create",
  initialDevis,
  onSubmit,
}: BasDevisFormProps) {
  const { options, loading, loadError } = useDevisOptions();

  const [basId, setBasId] = useState<number | null>(null);
  const [tissuBasId, setTissuBasId] = useState<number | null>(null);
  const [finitionsIds, setFinitionsIds] = useState<number[]>([]);
  const [accessoiresIds, setAccessoiresIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  // Validation
  const {
    saveError,
    hasError,
    clearFieldError,
    setErrors,
    clearErrors,
    baseSelectClass,
    classFor,
    setSaveError,
  } = useFormValidation();

  // Logique commune
  const {
    getTransfoById,
    getTissuById,
    basTransfo,
    tissuBas,
    filterTissusBas,
    buildTransfoLabel,
    getRobeNom,
  } = useDevisFormLogic({
    options,
    decDevantId: null,
    decDosId: null,
    decoupeDevantId: null,
    decoupeDosId: null,
    manchesId: null,
    basId,
    tissuDevantId: null,
    tissuDosId: null,
    tissuManchesId: null,
    tissuBasId,
  });

  // Calcul du prix
  const { coutInterneTotal } = usePrixCalculation({
    options,
    transformations: {
      basId,
    },
    tissus: {
      tissuBasId,
    },
    finitionsIds,
    accessoiresIds,
    getTransfoById,
    getTissuById,
  });

  // Pré-remplissage en mode édition
  useEffect(() => {
    if (mode !== "edit") return;
    if (!initialDevis) return;
    if (!options) return;

    const config = (initialDevis as any).configuration as
      | {
          type?: string;
          basId?: number | null;
          tissuBasId?: number | null;
          finitionsIds?: number[];
          accessoiresIds?: number[];
        }
      | undefined;

    if (config && config.type === "BAS") {
      setBasId(config.basId ?? null);
      setTissuBasId(config.tissuBasId ?? null);
      setFinitionsIds(Array.isArray(config.finitionsIds) ? config.finitionsIds : []);
      setAccessoiresIds(Array.isArray(config.accessoiresIds) ? config.accessoiresIds : []);
    }
  }, [mode, initialDevis, options]);

  async function handleSubmit() {
    if (!options) {
      setSaveError("Options non chargées.");
      return;
    }

    const newInvalid: string[] = [];

    if (!basId) newInvalid.push("bas");
    if (!tissuBasId) newInvalid.push("tissuBas");

    if (
      tissuBasId &&
      basTransfo?.nb_epaisseurs != null &&
      tissuBas?.nb_epaisseurs != null &&
      tissuBas.nb_epaisseurs !== basTransfo.nb_epaisseurs
    ) {
      newInvalid.push("bas", "tissuBas");
    }

    if (newInvalid.length > 0 || coutInterneTotal <= 0) {
      setErrors(
        [...new Set(newInvalid)],
        "Merci de remplir tous les champs requis et de corriger les incohérences."
      );
      return;
    }

    clearErrors();

    const parts: string[] = [];

    if (basTransfo) {
      const extra = basTransfo.epaisseur_ou_option ? ` – ${basTransfo.epaisseur_ou_option}` : "";
      parts.push(`Bas : ${basTransfo.finition ?? ""}${extra}`);
    }

    if (tissuBas) {
      const robeNom = getRobeNom(tissuBas.robe_modele_id);
      const label =
        (robeNom ? `[${robeNom}] ` : "") +
        tissuBas.detail +
        (tissuBas.forme ? ` – ${tissuBas.forme}` : "");
      parts.push(`Tissu bas : ${label}`);
    }

    const housse = options.accessoires?.find((a) =>
      a.nom.toLowerCase().includes("housse")
    );
    if (housse) {
      parts.push("Housse de protection incluse");
    }

    if (finitionsIds.length > 0) {
      for (const id of finitionsIds) {
        const f = options.finitions_supplementaires?.find((x) => x.id === id);
        if (f) {
          parts.push(`Finition : ${f.nom}`);
        }
      }
    }

    for (const id of accessoiresIds) {
      const a = options.accessoires?.find((x) => x.id === id);
      if (a) {
        parts.push(`Accessoire : ${a.nom}`);
      }
    }

    const description =
      parts.length > 0 ? `Bas de robe – ${parts.join(" | ")}` : "Bas de robe sur mesure";

    const payload: BasDevisFormSubmitPayload = {
      dentelle_id: null,
      description,
      coutInterneTotal,
      configuration: {
        type: "BAS",
        basId,
        tissuBasId,
        finitionsIds,
        accessoiresIds,
      },
    };

    setSaving(true);
    try {
      await onSubmit(payload);
    } catch (err: any) {
      setSaveError(
        err?.message ||
          "Erreur lors de l'enregistrement du devis. Veuillez réessayer."
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

      {options && (
        <BasSection
          options={options}
          basId={basId}
          tissuBasId={tissuBasId}
          finitionsIds={finitionsIds}
          accessoiresIds={accessoiresIds}
          setBasId={setBasId}
          setTissuBasId={setTissuBasId}
          setFinitionsIds={setFinitionsIds}
          setAccessoiresIds={setAccessoiresIds}
          getRobeNom={getRobeNom}
          buildTransfoLabel={buildTransfoLabel}
          filterTissusBas={filterTissusBas}
          hasError={hasError}
          clearFieldError={clearFieldError}
          baseSelectClass={baseSelectClass}
          classFor={classFor}
        />
      )}

      <SubmitButton
        saving={saving}
        mode={mode}
        onClick={handleSubmit}
        label={{
          saving: mode === "edit" ? "Mise à jour du bas…" : "Création du bas…",
          edit: "Enregistrer le bas",
          create: "Créer le devis bas",
        }}
      />
    </>
  );
}
