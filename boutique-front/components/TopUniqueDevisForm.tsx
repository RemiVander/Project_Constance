"use client";

import { useEffect, useState } from "react";
import { useDevisOptions } from "@/hooks/useDevisOptions";
import { useDevisFormLogic } from "@/hooks/useDevisFormLogic";
import { useFormValidation } from "@/hooks/useFormValidation";
import { usePrixCalculation } from "@/hooks/usePrixCalculation";
import { TopUniqueSection } from "./devis/TopUniqueSection";
import { SubmitButton } from "./devis/SubmitButton";

export type TopUniqueDevisFormSubmitPayload = {
  dentelle_id: number | null;
  description: string;
  coutInterneTotal: number;
  configuration: {
    type: "TOP_UNIQUE";
    decDevantId: number | null;
    decDosId: number | null;
    decoupeDevantId: number | null;
    decoupeDosId: number | null;
    manchesId: number | null;
    topCeintre: string;
    dentelleChoice: string;
  };
};

type TopUniqueDevisFormProps = {
  mode?: "create" | "edit";
  initialDevis?: any;
  onSubmit: (payload: TopUniqueDevisFormSubmitPayload) => Promise<void> | void;
};

export function TopUniqueDevisForm({
  mode = "create",
  initialDevis,
  onSubmit,
}: TopUniqueDevisFormProps) {
  const { options, loading, loadError } = useDevisOptions();

  const [decDevantId, setDecDevantId] = useState<number | null>(null);
  const [decDosId, setDecDosId] = useState<number | null>(null);
  const [decoupeDevantId, setDecoupeDevantId] = useState<number | null>(null);
  const [decoupeDosId, setDecoupeDosId] = useState<number | null>(null);
  const [manchesId, setManchesId] = useState<number | null>(null);
  const [tissuManchesId, setTissuManchesId] = useState<number | null>(null);
  const [topCeintre, setTopCeintre] = useState<string>("");
  const [dentelleChoice, setDentelleChoice] = useState<string>("");
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
    decDevant,
    decDos,
    decoupeDevant,
    decoupeDos,
    doubleDecolleteAlerte,
    filterDecoupeDevantOptions,
    filterDecolleteDosOptions,
    filterDecoupeDosOptions,
    filterTissusManches,
    buildTransfoLabel,
    getRobeNom,
  } = useDevisFormLogic({
    options,
    decDevantId,
    decDosId,
    decoupeDevantId,
    decoupeDosId,
    manchesId,
    basId: null,
    tissuDevantId: null,
    tissuDosId: null,
    tissuManchesId,
    tissuBasId: null,
  });

  // Calcul du prix
  const { coutInterneTotal } = usePrixCalculation({
    options,
    transformations: {
      decDevantId,
      decDosId,
      decoupeDevantId,
      decoupeDosId,
      manchesId,
    },
    tissus: {
      tissuManchesId,
    },
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
          decDevantId?: number | null;
          decDosId?: number | null;
          decoupeDevantId?: number | null;
          decoupeDosId?: number | null;
          devantId?: number | null;
          dosId?: number | null;
          manchesId?: number | null;
          dentelleChoice?: string;
          topCeintre?: string;
        }
      | undefined;

    if (config && (config.type === "TOP_UNIQUE" || config.type === "BOLERO")) {
      setDecDevantId(config.decDevantId ?? config.devantId ?? null);
      setDecDosId(config.decDosId ?? config.dosId ?? null);
      setDecoupeDevantId(config.decoupeDevantId ?? null);
      setDecoupeDosId(config.decoupeDosId ?? null);
      setManchesId(config.manchesId ?? null);
      setTopCeintre(config.topCeintre ?? "");
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
  }, [mode, initialDevis, options]);

  // Filtres spécifiques pour top unique (exclure ceinture)
  const filterDecoupeDevantOptionsTopUnique = () => {
    const list = filterDecoupeDevantOptions();
    return list.filter((t) => !t.ceinture_possible);
  };

  const filterDecoupeDosOptionsTopUnique = () => {
    const list = filterDecoupeDosOptions();
    return list.filter((t) => !t.ceinture_possible);
  };

  async function handleSubmit() {
    if (!options) {
      setSaveError("Options non chargées.");
      return;
    }

    const newInvalid: string[] = [];

    if (!decDevantId) newInvalid.push("decDevant");
    if (!decDosId) newInvalid.push("decDos");
    if (!manchesId) newInvalid.push("manches");
    if (!dentelleChoice) newInvalid.push("dentelle");

    if (newInvalid.length > 0 || coutInterneTotal <= 0) {
      setErrors(
        [...new Set(newInvalid)],
        "Merci de remplir tous les champs requis pour le top unique (devant, dos, manches, dentelle)."
      );
      return;
    }

    clearErrors();

    const selectedDentelleId =
      dentelleChoice === "none" || dentelleChoice === ""
        ? null
        : Number(dentelleChoice);

    const parts: string[] = [];

    const addTDesc = (label: string, id: number | null) => {
      if (!id) return;
      const t = getTransfoById(id);
      if (!t) return;
      const extra = t.epaisseur_ou_option ? ` – ${t.epaisseur_ou_option}` : "";
      parts.push(`${label}: ${t.finition ?? ""}${extra}`);
    };

    addTDesc("Décolleté devant", decDevantId);
    addTDesc("Décolleté dos", decDosId);
    addTDesc("Découpe devant", decoupeDevantId);
    addTDesc("Découpe dos", decoupeDosId);
    addTDesc("Manches", manchesId);
    if (topCeintre) {
      parts.push(`Top ceintré : ${topCeintre === "oui" ? "Oui" : "Non"}`);
    }

    if (selectedDentelleId) {
      const d = options.dentelles?.find((dd) => dd.id === selectedDentelleId);
      if (d) {
        parts.push(`Dentelle : ${d.nom}`);
      }
    } else if (dentelleChoice === "none") {
      parts.push("Aucune dentelle (confirmé par la boutique)");
    }

    const description =
      parts.length > 0 ? `Top unique – ${parts.join(" | ")}` : "Top unique sur mesure";

    const payload: TopUniqueDevisFormSubmitPayload = {
      dentelle_id: selectedDentelleId,
      description,
      coutInterneTotal,
      configuration: {
        type: "TOP_UNIQUE",
        decDevantId,
        decDosId,
        decoupeDevantId,
        decoupeDosId,
        manchesId,
        topCeintre,
        dentelleChoice,
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
        <TopUniqueSection
          options={options}
          decDevantId={decDevantId}
          decDosId={decDosId}
          decoupeDevantId={decoupeDevantId}
          decoupeDosId={decoupeDosId}
          manchesId={manchesId}
          tissuManchesId={tissuManchesId}
          dentelleChoice={dentelleChoice}
          topCeintre={topCeintre}
          setDecDevantId={setDecDevantId}
          setDecDosId={setDecDosId}
          setDecoupeDevantId={setDecoupeDevantId}
          setDecoupeDosId={setDecoupeDosId}
          setManchesId={setManchesId}
          setTissuManchesId={setTissuManchesId}
          setDentelleChoice={setDentelleChoice}
          setTopCeintre={setTopCeintre}
          getTransfoById={getTransfoById}
          getTissuById={getTissuById}
          getRobeNom={getRobeNom}
          buildTransfoLabel={buildTransfoLabel}
          filterDecoupeDevantOptions={filterDecoupeDevantOptionsTopUnique}
          filterDecolleteDosOptions={filterDecolleteDosOptions}
          filterDecoupeDosOptions={filterDecoupeDosOptionsTopUnique}
          filterTissusManches={filterTissusManches}
          hasError={hasError}
          clearFieldError={clearFieldError}
          baseSelectClass={baseSelectClass}
          classFor={classFor}
          doubleDecolleteAlerte={doubleDecolleteAlerte}
        />
      )}

      <SubmitButton
        saving={saving}
        mode={mode}
        onClick={handleSubmit}
        label={{
          saving: mode === "edit" ? "Mise à jour du top unique…" : "Création du top unique…",
          edit: "Enregistrer le top unique",
          create: "Créer le devis top unique",
        }}
      />
    </>
  );
}
