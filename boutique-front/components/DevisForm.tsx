"use client";

import { useEffect, useMemo, useState } from "react";
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

type OptionsResponse = {
  robe_modeles: RobeModele[];
  tarifs_transformations: TransformationTarif[];
  tarifs_tissus: TissuTarif[];
  finitions_supplementaires: FinitionSupp[];
  accessoires: Accessoire[];
  dentelles: Dentelle[];
};

type ComboTaille =
  | "AUCUNE"
  | "CEINTURE_ECHANTRE_DOS"
  | "CEINTURE_SEULE"
  | "REMONT_DEVANT_ECHANTRE_DOS"
  | "REMONT_DEVANT_SEULE"
  | "ECHANCRE_DOS_SEUL";

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
  const router = useRouter();

  const [options, setOptions] = useState<OptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [invalidFields, setInvalidFields] = useState<string[]>([]);

  // Chargement des options
  useEffect(() => {
    async function load() {
      try {
        const data = (await apiFetch(
          "/api/boutique/options"
        )) as OptionsResponse;
        setOptions(data);
      } catch (err: any) {
        if (err?.message?.includes("401")) {
          router.push("/login");
          return;
        }
        setLoadError(err?.message || "Erreur lors du chargement des options");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

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

      return;
    }

    // Cas 2 : anciens devis sans configuration enregistrée → on ne peut préremplir que la dentelle
    if (typeof (initialDevis as any).dentelle_id === "number") {
      setDentelleChoice(String((initialDevis as any).dentelle_id));
    } else {
      setDentelleChoice("none");
    }
  }, [mode, initialDevis, options]);


  // Helpers
  function getRobeNom(robeId: number | null) {
    if (!options || robeId == null) return "";
    const robe = options.robe_modeles.find((r) => r.id === robeId);
    return robe ? robe.nom : "";
  }

  function buildTransfoLabel(t: TransformationTarif) {
    const robeNom = getRobeNom(t.robe_modele_id);
    const baseLabel = t.epaisseur_ou_option
      ? `${t.finition ?? ""} – ${t.epaisseur_ou_option}`
      : t.finition ?? "";
    return robeNom ? `[${robeNom}] ${baseLabel}` : baseLabel;
  }

  function getTransfoById(id: number | null) {
    return options?.tarifs_transformations.find((t) => t.id === id) ?? null;
  }

  function getTissuById(id: number | null) {
    return options?.tarifs_tissus.find((t) => t.id === id) ?? null;
  }

  const hasManches = !!manchesId;

  const decDevant = getTransfoById(decDevantId);
  const decDos = getTransfoById(decDosId);
  const decoupeDevant = getTransfoById(decoupeDevantId);
  const decoupeDos = getTransfoById(decoupeDosId);
  const basTransfo = getTransfoById(basId);

  const tissuDevant = useMemo(
    () => getTissuById(tissuDevantId),
    [tissuDevantId, options]
  );
  const tissuDos = useMemo(
    () => getTissuById(tissuDosId),
    [tissuDosId, options]
  );
  const tissuBas = useMemo(
    () => getTissuById(tissuBasId),
    [tissuBasId, options]
  );

  const nbDecoupeDevant = decoupeDevant?.nb_epaisseurs ?? null;
  const nbDecoupeDos = decoupeDos?.nb_epaisseurs ?? null;

  const doubleDecolleteAlerte = useMemo(
    () => decDevant?.est_decollete && decDos?.est_decollete,
    [decDevant, decDos]
  );

  // --- Filtres transformations / tissus ---

  function filterDecoupeDevantOptions() {
    let list =
      options?.tarifs_transformations.filter(
        (t) => t.categorie === "Découpe devant"
      ) ?? [];
    const nbDecolleteDevant = decDevant?.nb_epaisseurs;
    if (typeof nbDecolleteDevant === "number") {
      list = list.filter(
        (t) =>
          typeof t.nb_epaisseurs === "number" &&
          t.nb_epaisseurs === nbDecolleteDevant
      );
    }
    return list;
  }

  function filterDecolleteDosOptions() {
    let list =
      options?.tarifs_transformations.filter(
        (t) => t.categorie === "Décolleté dos"
      ) ?? [];
    const nbDev = decDevant?.nb_epaisseurs;
    if (typeof nbDev === "number") {
      list = list.filter(
        (t) =>
          typeof t.nb_epaisseurs === "number" && t.nb_epaisseurs <= nbDev
      );
    }
    return list;
  }

  function filterDecoupeDosOptions() {
    let list =
      options?.tarifs_transformations.filter(
        (t) => t.categorie === "Découpe dos"
      ) ?? [];

    const nbDev = decoupeDevant?.nb_epaisseurs;
    if (typeof nbDev === "number") {
      list = list.filter(
        (t) =>
          typeof t.nb_epaisseurs === "number" && t.nb_epaisseurs <= nbDev
      );
    }

    const nbDecolleteDos = decDos?.nb_epaisseurs;
    if (typeof nbDecolleteDos === "number") {
      list = list.filter(
        (t) =>
          typeof t.nb_epaisseurs === "number" &&
          t.nb_epaisseurs === nbDecolleteDos
      );
    }

    return list;
  }

  function filterTissusManches() {
    return (
      options?.tarifs_tissus.filter((t) => t.categorie === "Manches") ?? []
    );
  }

  function filterTissusBas() {
    let list =
      options?.tarifs_tissus.filter((t) => t.categorie === "Bas") ?? [];
    const nbBas = basTransfo?.nb_epaisseurs;
    if (nbBas != null) {
      list = list.filter(
        (t) =>
          typeof t.nb_epaisseurs === "number" && t.nb_epaisseurs === nbBas
      );
    }
    return list;
  }

  function filterTissusDevant() {
    let list =
      options?.tarifs_tissus.filter(
        (t) => t.categorie && t.categorie.toLowerCase() === "devant"
      ) ?? [];

    if (nbDecoupeDevant != null) {
      list = list.filter(
        (t) =>
          typeof t.nb_epaisseurs === "number" &&
          t.nb_epaisseurs === nbDecoupeDevant
      );
    }

    return list;
  }

  function filterTissusDos() {
    let list =
      options?.tarifs_tissus.filter((t) => t.categorie === "Dos") ?? [];

    if (nbDecoupeDos != null) {
      list = list.filter(
        (t) =>
          typeof t.nb_epaisseurs === "number" &&
          t.nb_epaisseurs === nbDecoupeDos
      );
    }

    if (tissuDevant?.nb_epaisseurs != null) {
      const nbDev = tissuDevant.nb_epaisseurs;
      list = list.filter(
        (t) =>
          typeof t.nb_epaisseurs === "number" && t.nb_epaisseurs <= nbDev
      );
    }

    if (tissuDevant && tissuDevant.matiere !== "crepe") {
      list = list.filter((t) => t.matiere !== "crepe");
    }

    return list;
  }

  // --- Prix (coût interne) ---

  const coutInterneTotal = useMemo(() => {
    if (!options) return 0;
    let total = 0;

    const addT = (id: number | null) => {
      const t = getTransfoById(id);
      if (t) total += t.prix;
    };

    const addTi = (id: number | null) => {
      const t = getTissuById(id);
      if (t) total += t.prix;
    };

    addT(decDevantId);
    addT(decDosId);
    addT(decoupeDevantId);
    addT(decoupeDosId);
    addT(manchesId);
    addT(basId);

    const ceintureTransfo = options.tarifs_transformations.find(
      (t) => t.categorie === "Ceinture"
    );
    const remontDevantTransfo = options.tarifs_transformations.find(
      (t) =>
        t.categorie === "Découpe taille devant et dos" &&
        t.epaisseur_ou_option === "Remonté devant"
    );
    const echancreDosTransfo = options.tarifs_transformations.find(
      (t) =>
        t.categorie === "Découpe taille devant et dos" &&
        t.epaisseur_ou_option === "Échancré dos"
    );

    switch (comboTaille) {
      case "CEINTURE_ECHANTRE_DOS":
        if (ceintureTransfo) total += ceintureTransfo.prix;
        if (echancreDosTransfo) total += echancreDosTransfo.prix;
        break;
      case "CEINTURE_SEULE":
        if (ceintureTransfo) total += ceintureTransfo.prix;
        break;
      case "REMONT_DEVANT_ECHANTRE_DOS":
        if (remontDevantTransfo) total += remontDevantTransfo.prix;
        if (echancreDosTransfo) total += echancreDosTransfo.prix;
        break;
      case "REMONT_DEVANT_SEULE":
        if (remontDevantTransfo) total += remontDevantTransfo.prix;
        break;
      case "ECHANCRE_DOS_SEUL":
        if (echancreDosTransfo) total += echancreDosTransfo.prix;
        break;
      case "AUCUNE":
      default:
        break;
    }

    addTi(tissuDevantId);
    addTi(tissuDosId);
    addTi(tissuManchesId);
    addTi(tissuBasId);

    for (const id of finitionsIds) {
      const f = options.finitions_supplementaires.find((x) => x.id === id);
      if (f) total += f.prix;
    }

    for (const id of accessoiresIds) {
      const a = options.accessoires.find((x) => x.id === id);
      if (a) total += a.prix;
    }

    const housse = options.accessoires.find((a) =>
      a.nom.toLowerCase().includes("housse")
    );
    if (housse) total += housse.prix;

    return total;
  }, [
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
    finitionsIds,
    accessoiresIds,
    comboTaille,
  ]);

  // --- UI erreurs & helpers ---

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
      setInvalidFields([...new Set(newInvalid)]);
      setSaveError(
        "Merci de remplir tous les champs requis et de corriger les incohérences."
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

    const housse = options.accessoires.find((a) =>
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

    if (finitionsIds.length > 0) {
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* DEVANT */}
        <div className="border rounded-xl p-4 bg-white">
          <h2 className="font-semibold mb-3">Devant</h2>

          {/* Décolleté devant */}
          <div className="mb-3">
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="select-decollete-devant"
            >
              Décolleté devant
            </label>
            <select
              id="select-decollete-devant"
              className={classFor("decDevant")}
              value={decDevantId ?? ""}
              onChange={(e) => {
                const newId = e.target.value ? Number(e.target.value) : null;
                setDecDevantId(newId);
                clearFieldError(["decDevant", "decoupeDevant", "decDos"]);

                const newTransfo = getTransfoById(newId);
                const nbNew = newTransfo?.nb_epaisseurs;
                if (typeof nbNew === "number") {
                  setDecoupeDevantId((prev) => {
                    const current = getTransfoById(prev);
                    if (
                      current &&
                      typeof current.nb_epaisseurs === "number" &&
                      current.nb_epaisseurs !== nbNew
                    ) {
                      return null;
                    }
                    return prev;
                  });
                }
              }}
            >
              <option value="">Aucun</option>
              {options.tarifs_transformations
                .filter((t) => t.categorie === "Décolleté devant")
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {buildTransfoLabel(t)}
                  </option>
                ))}
            </select>
          </div>

          {/* Découpe devant */}
          <div className="mb-3">
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="select-decoupe-devant"
            >
              Découpe devant
            </label>
            <select
              id="select-decoupe-devant"
              className={classFor("decoupeDevant")}
              value={decoupeDevantId ?? ""}
              onChange={(e) => {
                setDecoupeDevantId(
                  e.target.value ? Number(e.target.value) : null
                );
                clearFieldError([
                  "decoupeDevant",
                  "decoupeDos",
                  "tissuDevant",
                  "decDevant",
                ]);
              }}
            >
              <option value="">Aucune</option>
              {filterDecoupeDevantOptions().map((t) => (
                <option key={t.id} value={t.id}>
                  {buildTransfoLabel(t)}
                </option>
              ))}
            </select>
          </div>

          {/* Découpe taille / ceinture */}
          <div className="mb-3">
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="select-decoupe-taille"
            >
              Découpe taille devant et dos / ceinture
            </label>
            <select
              id="select-decoupe-taille"
              className={baseSelectClass}
              value={comboTaille}
              onChange={(e) =>
                setComboTaille(e.target.value as ComboTaille)
              }
            >
              <option value="AUCUNE">Aucune</option>
              <option value="CEINTURE_ECHANTRE_DOS">
                Ceinture + échancré dos
              </option>
              <option value="CEINTURE_SEULE">Ceinture seule</option>
              <option value="REMONT_DEVANT_ECHANTRE_DOS">
                Remonté devant + échancré dos
              </option>
              <option value="REMONT_DEVANT_SEULE">Remonté devant seul</option>
              <option value="ECHANCRE_DOS_SEUL">Échancré dos seul</option>
            </select>
          </div>

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
                setManchesId(e.target.value ? Number(e.target.value) : null);
                clearFieldError("tissuManches");
              }}
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
                {filterTissusManches().map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.detail}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Bas */}
          <div className="mb-3">
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="select-bas"
            >
              Bas
            </label>
            <select
              id="select-bas"
              className={classFor("bas")}
              value={basId ?? ""}
              onChange={(e) => {
                setBasId(e.target.value ? Number(e.target.value) : null);
                clearFieldError(["bas", "tissuBas"]);
              }}
            >
              <option value="">Aucun</option>
              {options.tarifs_transformations
                .filter((t) => t.categorie === "Bas")
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {buildTransfoLabel(t)}
                  </option>
                ))}
            </select>
          </div>

          {/* Tissu devant */}
          <div className="mt-4">
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="select-tissu-devant"
            >
              Tissu devant
            </label>
            <select
              id="select-tissu-devant"
              className={classFor("tissuDevant")}
              value={tissuDevantId ?? ""}
              onChange={(e) => {
                setTissuDevantId(
                  e.target.value ? Number(e.target.value) : null
                );
                clearFieldError(["tissuDevant", "tissuDos"]);
              }}
            >
              <option value="">Aucun</option>
              {filterTissusDevant().map((t) => (
                <option key={t.id} value={t.id}>
                  {t.detail}
                </option>
              ))}
            </select>
          </div>

          {/* Tissu bas */}
          <div className="mt-3">
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="select-tissu-bas"
            >
              Tissu bas
            </label>
            <select
              id="select-tissu-bas"
              className={classFor("tissuBas")}
              value={tissuBasId ?? ""}
              onChange={(e) => {
                setTissuBasId(e.target.value ? Number(e.target.value) : null);
                clearFieldError(["tissuBas", "bas"]);
              }}
            >
              <option value="">Aucun</option>
              {filterTissusBas().map((t) => {
                const robeNom = getRobeNom(t.robe_modele_id);
                const label =
                  (robeNom ? `[${robeNom}] ` : "") +
                  t.detail +
                  (t.forme ? ` – ${t.forme}` : "");
                return (
                  <option key={t.id} value={t.id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* DOS + FINITIONS */}
        <div className="border rounded-xl p-4 bg-white">
          <h2 className="font-semibold mb-3">Dos & finitions</h2>

          {/* Décolleté dos */}
          <div className="mb-3">
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="select-decollete-dos"
            >
              Décolleté dos
            </label>
            <select
              id="select-decollete-dos"
              className={classFor("decDos")}
              value={decDosId ?? ""}
              onChange={(e) => {
                const newId = e.target.value ? Number(e.target.value) : null;
                setDecDosId(newId);
                clearFieldError(["decDevant", "decDos", "decoupeDos"]);

                const newTransfo = getTransfoById(newId);
                const nbNew = newTransfo?.nb_epaisseurs;
                if (typeof nbNew === "number") {
                  setDecoupeDosId((prev) => {
                    const current = getTransfoById(prev);
                    if (
                      current &&
                      typeof current.nb_epaisseurs === "number" &&
                      current.nb_epaisseurs !== nbNew
                    ) {
                      return null;
                    }
                    return prev;
                  });
                }
              }}
            >
              <option value="">Aucun</option>
              {filterDecolleteDosOptions().map((t) => (
                <option key={t.id} value={t.id}>
                  {buildTransfoLabel(t)}
                </option>
              ))}
            </select>
          </div>

          {/* Découpe dos */}
          <div className="mb-3">
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="select-decoupe-dos"
            >
              Découpe dos
            </label>
            <select
              id="select-decoupe-dos"
              className={classFor("decoupeDos")}
              value={decoupeDosId ?? ""}
              onChange={(e) => {
                setDecoupeDosId(
                  e.target.value ? Number(e.target.value) : null
                );
                clearFieldError([
                  "decoupeDevant",
                  "decoupeDos",
                  "tissuDos",
                  "decDos",
                ]);
              }}
            >
              <option value="">Aucune</option>
              {filterDecoupeDosOptions().map((t) => (
                <option key={t.id} value={t.id}>
                  {buildTransfoLabel(t)}
                </option>
              ))}
            </select>
          </div>

          {/* Tissu dos */}
          <div className="mb-3">
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="select-tissu-dos"
            >
              Tissu dos
            </label>
            <select
              id="select-tissu-dos"
              className={classFor("tissuDos")}
              value={tissuDosId ?? ""}
              onChange={(e) => {
                setTissuDosId(e.target.value ? Number(e.target.value) : null);
                clearFieldError(["tissuDevant", "tissuDos"]);
              }}
            >
              <option value="">Aucun</option>
              {filterTissusDos().map((t) => {
                const robeNom = getRobeNom(t.robe_modele_id);
                const label =
                  (robeNom ? `[${robeNom}] ` : "") +
                  t.detail +
                  (t.forme ? ` – ${t.forme}` : "");
                return (
                  <option key={t.id} value={t.id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Finitions supplémentaires */}
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">
              Finitions supplémentaires
            </label>
            <div className="space-y-1 border rounded p-2 max-h-40 overflow-y-auto">
              {options.finitions_supplementaires.map((f) => (
                <label key={f.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={finitionsIds.includes(f.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        let newList = [...finitionsIds, f.id];

                        if (f.est_fente) {
                          const autres = options.finitions_supplementaires
                            .filter((x) => x.est_fente && x.id !== f.id)
                            .map((x) => x.id);

                          newList = newList.filter(
                            (id) => !autres.includes(id)
                          );
                        }

                        setFinitionsIds(newList);
                      } else {
                        setFinitionsIds(
                          finitionsIds.filter((id) => id !== f.id)
                        );
                      }
                    }}
                  />
                  <span>{f.nom}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Accessoires */}
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">
              Accessoires
            </label>
            <div className="space-y-1 border rounded p-2 max-h-40 overflow-y-auto">
              {options.accessoires.map((a) => {
                const isHousse = a.nom.toLowerCase().includes("housse");

                return (
                  <label key={a.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isHousse || accessoiresIds.includes(a.id)}
                      disabled={isHousse}
                      onChange={(e) => {
                        if (isHousse) return;
                        if (e.target.checked) {
                          setAccessoiresIds([...accessoiresIds, a.id]);
                        } else {
                          setAccessoiresIds(
                            accessoiresIds.filter((id) => id !== a.id)
                          );
                        }
                      }}
                    />
                    <span>
                      {a.nom} {isHousse && "(inclus automatiquement)"}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Dentelle */}
      <div className="border rounded-xl p-4 bg-white mt-6">
        <h2 className="font-semibold mb-3">Dentelle</h2>

        <label className="block text-sm font-medium mb-1">
          Choix de la dentelle <span className="text-red-500">*</span>
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

        {dentelleChoice === "none" && (
          <p className="mt-2 text-xs text-amber-700">
            Veuillez vous assurer que votre robe ne comporte pas de dentelle.
          </p>
        )}
      </div>

      {/* Alerte double décolleté */}
      {doubleDecolleteAlerte && (
        <div className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded">
          Attention : la présence d&apos;un décolleté devant et d&apos;un
          décolleté dos est déconseillée.
        </div>
      )}

      {/* CTA */}
      <div className="border rounded-xl p-6 bg-white flex flex-col items-center gap-2 mt-6">
        <button
          type="button"
          disabled={saving}
          onClick={handleSubmit}
          className="mt-2 inline-flex justify-center bg-gray-900 text-white text-sm font-semibold px-6 py-2 rounded-full disabled:opacity-50"
        >
          {saving
            ? mode === "edit"
              ? "Mise à jour du devis…"
              : "Création du devis…"
            : mode === "edit"
            ? "Enregistrer les modifications"
            : "Créer le devis"}
        </button>
      </div>
    </>
  );
}
