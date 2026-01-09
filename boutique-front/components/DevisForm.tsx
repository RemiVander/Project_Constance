"use client";

import { useEffect, useState, useMemo } from "react";
import { useDevisOptions, OptionsResponse } from "@/hooks/useDevisOptions";
import { useDevisFormLogic } from "@/hooks/useDevisFormLogic";
import { useFormValidation } from "@/hooks/useFormValidation";
import { usePrixCalculation } from "@/hooks/usePrixCalculation";
import { DevantDosSection } from "./devis/DevantDosSection";
import { ManchesSection } from "./devis/ManchesSection";
import { DentelleSection } from "./devis/DentelleSection";
import { CeintureSection, type ComboTaille } from "./devis/CeintureSection";
import { BasSection } from "./devis/BasSection";
import { BoleroSection } from "./devis/BoleroSection";
import { SubmitButton } from "./devis/SubmitButton";

type DevisConfiguration = {
  decDevantId: number | null;
  decDosId: number | null;
  decoupeDevantId: number | null;
  decoupeDosId: number | null;
  manchesId: number | null;
  basId: number | null;
  comboTaille: ComboTaille;
  tissuDevantId: number | null;
  tissuDosId: number | null;
  tissuManchesId: number | null;
  tissuBasId: number | null;
  finitionsIds: number[];
  accessoiresIds: number[];
  dentelleChoice: string;
  hasBolero?: boolean;
  boleroDevantId?: number | null;
  boleroDosId?: number | null;
  boleroManchesId?: number | null;
};


export type DevisFormSubmitPayload = {
  dentelle_id: number | null;
  description: string;
  coutInterneTotal: number;
  configuration?: DevisConfiguration;
};


type DevisFormProps = {
  mode?: "create" | "edit";
  initialDevis?: any;
  onSubmit?: (payload: DevisFormSubmitPayload) => Promise<void> | void;
};

export function DevisForm({
  mode = "create",
  initialDevis,
  onSubmit,
}: DevisFormProps) {
  const { options, loading, loadError } = useDevisOptions();

  // Transformations
  const [decDevantId, setDecDevantId] = useState<number | null>(null);
  const [decDosId, setDecDosId] = useState<number | null>(null);
  const [decoupeDevantId, setDecoupeDevantId] = useState<number | null>(null);
  const [decoupeDosId, setDecoupeDosId] = useState<number | null>(null);
  const [manchesId, setManchesId] = useState<number | null>(null);
  const [basId, setBasId] = useState<number | null>(null);

  // Combo taille / ceinture
  const [comboTaille, setComboTaille] = useState<ComboTaille>("AUCUNE");

  // Tissus
  const [tissuDevantId, setTissuDevantId] = useState<number | null>(null);
  const [tissuDosId, setTissuDosId] = useState<number | null>(null);
  const [tissuManchesId, setTissuManchesId] = useState<number | null>(null);
  const [tissuBasId, setTissuBasId] = useState<number | null>(null);

  // Finitions + accessoires
  const [finitionsIds, setFinitionsIds] = useState<number[]>([]);
  const [accessoiresIds, setAccessoiresIds] = useState<number[]>([]);

  // Dentelle
  // ""     = pas encore choisi (invalide)
  // "none" = choix explicite "Aucune dentelle"
  // "12"   = id de dentelle
  const [dentelleChoice, setDentelleChoice] = useState<string>("");

  // Boléro
  const [hasBolero, setHasBolero] = useState(false);
  const [boleroDevantId, setBoleroDevantId] = useState<number | null>(null);
  const [boleroDosId, setBoleroDosId] = useState<number | null>(null);
  const [boleroManchesId, setBoleroManchesId] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  
  // Validation
  const {
    invalidFields,
    saveError,
    hasError,
    clearFieldError,
    setErrors,
    clearErrors,
    baseSelectClass,
    classFor,
    setSaveError,
  } = useFormValidation();


  // Pré-remplissage en mode édition à partir de initialDevis.configuration
  useEffect(() => {
    if (mode !== "edit") return;
    if (!initialDevis) return;
    if (!options) return;

    const config = (initialDevis as any)
      .configuration as DevisConfiguration | undefined;

    // Cas 1 : on a une configuration complète → on recharge tout
    if (config) {
      setDecDevantId(config.decDevantId ?? null);
      setDecDosId(config.decDosId ?? null);
      setDecoupeDevantId(config.decoupeDevantId ?? null);
      setDecoupeDosId(config.decoupeDosId ?? null);
      setManchesId(config.manchesId ?? null);
      setBasId(config.basId ?? null);

      setComboTaille(config.comboTaille ?? "AUCUNE");

      setTissuDevantId(config.tissuDevantId ?? null);
      setTissuDosId(config.tissuDosId ?? null);
      setTissuManchesId(config.tissuManchesId ?? null);
      setTissuBasId(config.tissuBasId ?? null);

      setFinitionsIds(
        Array.isArray(config.finitionsIds) ? config.finitionsIds : []
      );
      setAccessoiresIds(
        Array.isArray(config.accessoiresIds) ? config.accessoiresIds : []
      );

      if (config.dentelleChoice) {
        setDentelleChoice(String(config.dentelleChoice));
      } else if (typeof (initialDevis as any).dentelle_id === "number") {
        setDentelleChoice(String((initialDevis as any).dentelle_id));
      } else {
        setDentelleChoice("none");
      }

      // Pré-remplissage du boléro
      setHasBolero(config.hasBolero ?? false);
      setBoleroDevantId(config.boleroDevantId ?? null);
      setBoleroDosId(config.boleroDosId ?? null);
      setBoleroManchesId(config.boleroManchesId ?? null);

      return;
    }

    // Cas 2 : anciens devis sans configuration enregistrée → on ne peut préremplir que la dentelle
    if (typeof (initialDevis as any).dentelle_id === "number") {
      setDentelleChoice(String((initialDevis as any).dentelle_id));
    } else {
      setDentelleChoice("none");
    }
  }, [mode, initialDevis, options]);

  // Logique commune (filtres, helpers)
  const {
    getRobeNom,
    buildTransfoLabel,
    getTransfoById,
    getTissuById,
    decDevant,
    decDos,
    decoupeDevant,
    decoupeDos,
    basTransfo,
    tissuDevant,
    tissuDos,
    tissuBas,
    doubleDecolleteAlerte,
    filterDecoupeDevantOptions,
    filterDecolleteDosOptions,
    filterDecoupeDosOptions,
    filterTissusManches,
    filterTissusBas,
    filterTissusDevant,
    filterTissusDos,
  } = useDevisFormLogic({
    options,
    decDevantId,
    decDosId,
    decoupeDevantId,
    decoupeDosId,
    manchesId,
    basId,
    tissuDevantId,
    tissuDosId,
    tissuManchesId,
    tissuBasId,
  });

  const hasManches = !!manchesId;

  // Les fonctions de filtrage sont maintenant dans useDevisFormLogic

  // --- Prix (coût interne) ---

  // Calcul du prix (incluant le boléro)
  const coutInterneBolero = useMemo(() => {
    if (!options || !hasBolero) return 0;
    let total = 0;
    const addTransfo = (id: number | null) => {
      if (!id) return;
      const t = getTransfoById(id);
      if (t) total += t.prix;
    };
    const addTissu = (id: number | null) => {
      if (!id) return;
      const t = getTissuById(id);
      if (t) total += t.prix;
    };
    addTransfo(boleroDevantId);
    addTransfo(boleroDosId);
    addTissu(boleroManchesId);
    return total;
  }, [options, hasBolero, boleroDevantId, boleroDosId, boleroManchesId, getTransfoById, getTissuById]);

  const { coutInterneTotal: coutInterneRobe } = usePrixCalculation({
    options,
    transformations: {
      decDevantId,
      decDosId,
      decoupeDevantId,
      decoupeDosId,
      manchesId,
      basId,
    },
    tissus: {
      tissuDevantId,
      tissuDosId,
      tissuManchesId,
      tissuBasId,
    },
    finitionsIds,
    accessoiresIds,
    comboTaille,
    getTransfoById,
    getTissuById,
  });

  const coutInterneTotal = coutInterneRobe + coutInterneBolero;

  // --- Submit ---

  async function handleSubmit() {
    if (!options) {
      setSaveError("Options non chargées.");
      return;
    }

    const newInvalid: string[] = [];

    if (!tissuDevantId) newInvalid.push("tissuDevant");
    if (!tissuBasId) newInvalid.push("tissuBas");
    if (hasManches && !tissuManchesId) newInvalid.push("tissuManches");

    if (!dentelleChoice) {
      newInvalid.push("dentelle");
    }

    if (
      typeof decDevant?.nb_epaisseurs === "number" &&
      typeof decoupeDevant?.nb_epaisseurs === "number" &&
      decDevant.nb_epaisseurs !== decoupeDevant.nb_epaisseurs
    ) {
      newInvalid.push("decDevant", "decoupeDevant");
    }

    if (
      typeof decDos?.nb_epaisseurs === "number" &&
      typeof decoupeDos?.nb_epaisseurs === "number" &&
      decDos.nb_epaisseurs !== decoupeDos.nb_epaisseurs
    ) {
      newInvalid.push("decDos", "decoupeDos");
    }

    if (
      typeof decDevant?.nb_epaisseurs === "number" &&
      typeof decDos?.nb_epaisseurs === "number" &&
      decDos.nb_epaisseurs > decDevant.nb_epaisseurs
    ) {
      newInvalid.push("decDevant", "decDos");
    }

    if (
      typeof decoupeDevant?.nb_epaisseurs === "number" &&
      typeof decoupeDos?.nb_epaisseurs === "number" &&
      decoupeDos.nb_epaisseurs > decoupeDevant.nb_epaisseurs
    ) {
      newInvalid.push("decoupeDevant", "decoupeDos");
    }

    if (
      tissuDevant?.nb_epaisseurs != null &&
      decoupeDevant?.nb_epaisseurs != null &&
      tissuDevant.nb_epaisseurs !== decoupeDevant.nb_epaisseurs
    ) {
      newInvalid.push("tissuDevant", "decoupeDevant");
    }

    if (
      tissuDos?.nb_epaisseurs != null &&
      decoupeDos?.nb_epaisseurs != null &&
      tissuDos.nb_epaisseurs !== decoupeDos.nb_epaisseurs
    ) {
      newInvalid.push("tissuDos", "decoupeDos");
    }

    if (
      tissuDevant?.nb_epaisseurs != null &&
      tissuDos?.nb_epaisseurs != null &&
      tissuDos.nb_epaisseurs > tissuDevant.nb_epaisseurs
    ) {
      newInvalid.push("tissuDevant", "tissuDos");
    }

    if (
      tissuDos?.matiere === "crepe" &&
      tissuDevant &&
      tissuDevant.matiere !== "crepe"
    ) {
      newInvalid.push("tissuDevant", "tissuDos");
    }

    if (
      tissuBas?.nb_epaisseurs != null &&
      basTransfo?.nb_epaisseurs != null &&
      tissuBas.nb_epaisseurs !== basTransfo.nb_epaisseurs
    ) {
      newInvalid.push("tissuBas", "bas");
    }

    if (newInvalid.length > 0 || coutInterneTotal <= 0) {
      setErrors(
        [...new Set(newInvalid)],
        "Merci de remplir tous les champs requis et de corriger les incohérences."
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

    const addTiDesc = (label: string, id: number | null) => {
      if (!id) return;
      const t = getTissuById(id);
      if (!t) return;
      parts.push(`${label}: ${t.categorie} – ${t.detail}`);
    };

    addTDesc("Décolleté devant", decDevantId);
    addTDesc("Décolleté dos", decDosId);
    addTDesc("Découpe devant", decoupeDevantId);
    addTDesc("Découpe dos", decoupeDosId);
    addTDesc("Manches", manchesId);
    addTDesc("Bas de robe", basId);

    // Ajouter le boléro si présent
    if (hasBolero) {
      addTDesc("Boléro devant", boleroDevantId);
      addTDesc("Boléro dos", boleroDosId);
      if (boleroManchesId) {
        const t = getTissuById(boleroManchesId);
        if (t) {
          parts.push(`Boléro manches: ${t.detail}`);
        }
      }
    }

    switch (comboTaille) {
      case "CEINTURE_ECHANTRE_DOS":
        parts.push("Découpe taille : ceinture + échancré dos");
        break;
      case "CEINTURE_SEULE":
        parts.push("Découpe taille : ceinture");
        break;
      case "REMONT_DEVANT_ECHANTRE_DOS":
        parts.push("Découpe taille : remonté devant + échancré dos");
        break;
      case "REMONT_DEVANT_SEULE":
        parts.push("Découpe taille : remonté devant");
        break;
      case "ECHANCRE_DOS_SEUL":
        parts.push("Découpe taille : échancré dos");
        break;
      case "AUCUNE":
      default:
        break;
    }

    addTiDesc("Tissu devant", tissuDevantId);
    addTiDesc("Tissu dos", tissuDosId);
    addTiDesc("Tissu manches", tissuManchesId);
    addTiDesc("Tissu bas", tissuBasId);

    const housse = options.accessoires?.find((a) =>
      a.nom.toLowerCase().includes("housse")
    );
    if (housse) {
      parts.push("Housse de protection incluse");
    }

    if (selectedDentelleId) {
      const d = options.dentelles.find((dd) => dd.id === selectedDentelleId);
      if (d) {
        parts.push(`Dentelle : ${d.nom}`);
      }
    } else if (dentelleChoice === "none") {
      parts.push("Aucune dentelle (confirmé par la boutique)");
    }

    if (finitionsIds.length > 0 && options.finitions_supplementaires) {
      for (const id of finitionsIds) {
        const f = options.finitions_supplementaires.find((x) => x.id === id);
        if (f) {
          parts.push(`Finition : ${f.nom}`);
        }
      }
    }

    const description =
      parts.length > 0 ? parts.join(" | ") : "Robe de mariée sur mesure";

        const configuration: DevisConfiguration = {
          decDevantId,
          decDosId,
          decoupeDevantId,
          decoupeDosId,
          manchesId,
          basId,
          comboTaille,
          tissuDevantId,
          tissuDosId,
          tissuManchesId,
          tissuBasId,
          finitionsIds,
          accessoiresIds,
          dentelleChoice,
          hasBolero,
          boleroDevantId,
          boleroDosId,
          boleroManchesId,
        };

    const payload: DevisFormSubmitPayload = {
      dentelle_id: selectedDentelleId,
      description,
      coutInterneTotal,
      configuration,
    };


    setSaving(true);
    try {
      if (!onSubmit) {
        throw new Error(
          "Aucun handler de soumission (onSubmit) n'a été fourni au DevisForm."
        );
      }
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
        <DevantDosSection
          options={options}
          decDevantId={decDevantId}
          decDosId={decDosId}
          decoupeDevantId={decoupeDevantId}
          decoupeDosId={decoupeDosId}
          tissuDevantId={tissuDevantId}
          tissuDosId={tissuDosId}
          setDecDevantId={setDecDevantId}
          setDecDosId={setDecDosId}
          setDecoupeDevantId={setDecoupeDevantId}
          setDecoupeDosId={setDecoupeDosId}
          setTissuDevantId={setTissuDevantId}
          setTissuDosId={setTissuDosId}
          getTransfoById={getTransfoById}
          getTissuById={getTissuById}
          getRobeNom={getRobeNom}
          buildTransfoLabel={buildTransfoLabel}
          filterDecoupeDevantOptions={filterDecoupeDevantOptions}
          filterDecolleteDosOptions={filterDecolleteDosOptions}
          filterDecoupeDosOptions={filterDecoupeDosOptions}
          filterTissusDevant={filterTissusDevant}
          filterTissusDos={filterTissusDos}
          hasError={hasError}
          clearFieldError={clearFieldError}
          baseSelectClass={baseSelectClass}
          classFor={classFor}
          doubleDecolleteAlerte={doubleDecolleteAlerte}
        />
      )}

      {/* Découpe taille / Ceinture */}
      {options && (
        <CeintureSection
          comboTaille={comboTaille}
          setComboTaille={setComboTaille}
          baseSelectClass={baseSelectClass}
        />
      )}

      {/* Boléro */}
      {options && (
        <BoleroSection
          options={options}
          hasBolero={hasBolero}
          boleroDevantId={boleroDevantId}
          boleroDosId={boleroDosId}
          boleroManchesId={boleroManchesId}
          setHasBolero={setHasBolero}
          setBoleroDevantId={setBoleroDevantId}
          setBoleroDosId={setBoleroDosId}
          setBoleroManchesId={setBoleroManchesId}
          onBoleroManchesChange={(boleroManchesId) => {
            // Si on sélectionne des manches de boléro, réinitialiser les manches de robe
            if (boleroManchesId) {
              setManchesId(null);
              setTissuManchesId(null);
              clearFieldError(["manches", "tissuManches"]);
            }
          }}
          hasError={hasError}
          clearFieldError={clearFieldError}
          baseSelectClass={baseSelectClass}
          classFor={classFor}
        />
      )}

      {/* Manches + Dentelle */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {/* Manches */}
        <div className="border rounded-xl p-4 bg-white">
          <h2 className="font-semibold mb-3">Manches</h2>
          {boleroManchesId && (
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded mb-3">
              Les manches pour la robe sont désactivées car des manches ont été sélectionnées sur le boléro.
            </p>
          )}

          {/* Manches */}
          <div className="mb-3">
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="select-manches"
            >
              Manches
            </label>
            <select
              id="select-manches"
              className={baseSelectClass}
              value={manchesId ?? ""}
              onChange={(e) => {
                const newManchesId = e.target.value ? Number(e.target.value) : null;
                setManchesId(newManchesId);
                clearFieldError("tissuManches");
                // Si on sélectionne des manches de robe, réinitialiser les manches de boléro
                if (newManchesId && boleroManchesId) {
                  setBoleroManchesId(null);
                  clearFieldError("boleroManches");
                }
              }}
              disabled={!!boleroManchesId}
            >
              <option value="">Aucune</option>
              {options.tarifs_transformations
                .filter((t) => t.categorie === "Manches")
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {buildTransfoLabel(t)}
                  </option>
                ))}
            </select>
          </div>

          {/* Tissu manches */}
          {hasManches && (
            <div className="mb-3">
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="select-tissu-manches"
              >
                Tissu manches
              </label>
              <select
                id="select-tissu-manches"
                className={classFor("tissuManches")}
                value={tissuManchesId ?? ""}
                onChange={(e) => {
                  setTissuManchesId(
                    e.target.value ? Number(e.target.value) : null
                  );
                  clearFieldError("tissuManches");
                }}
              >
                <option value="">Aucun</option>
                {filterTissusManches().map((t) => {
                  const robeNom = getRobeNom(t.robe_modele_id);
                  const label =
                    (robeNom ? `[${robeNom}] ` : "") + t.detail;
                  return (
                    <option key={t.id} value={t.id}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>

        {/* Dentelle */}
        <div className="border rounded-xl p-4 bg-white">
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
            <option value="">-- Sélectionnez --</option>
            <option value="none">Aucune dentelle</option>
            {options.dentelles
              ?.filter((d) => d.actif === undefined || d.actif === true)
              .map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.nom}
                </option>
              ))}
          </select>

          {dentelleChoice === "none" && (
            <p className="mt-2 text-xs text-amber-700">
              Veuillez vous assurer que votre robe ne comporte pas de dentelle.
            </p>
          )}
        </div>
      </div>

      {/* Bas de robe */}
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

      {/* CTA */}
      <SubmitButton
        saving={saving}
        mode={mode}
        onClick={handleSubmit}
        label={{
          saving: mode === "edit" ? "Mise à jour du devis…" : "Création du devis…",
          edit: "Enregistrer les modifications",
          create: "Créer le devis",
        }}
      />
    </>
  );
}
