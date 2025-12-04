"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Breadcrumb } from "@/components/Breadcrumb";

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
};

type TissuTarif = {
  id: number;
  categorie: string;
  robe_modele_id: number | null;
  detail: string;
  forme: string | null;
  prix: number;
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

type OptionsResponse = {
  robe_modeles: RobeModele[];
  tarifs_transformations: TransformationTarif[];
  tarifs_tissus: TissuTarif[];
  finitions_supplementaires: FinitionSupp[];
  accessoires: Accessoire[];
};

// Combinaisons taille / ceinture
type ComboTaille =
  | "AUCUNE"
  | "CEINTURE_ECHANTRE_DOS"
  | "CEINTURE_SEULE"
  | "REMONT_DEVANT_ECHANTRE_DOS"
  | "REMONT_DEVANT_SEULE"
  | "ECHANCRE_DOS_SEUL";

export default function NouveauDevisPage() {
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

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load options
  useEffect(() => {
    async function load() {
      try {
        const data = (await apiFetch("/api/boutique/options")) as OptionsResponse;
        setOptions(data);
      } catch (err: any) {
        if (err.message?.includes("401")) {
          router.push("/login");
          return;
        }
        setLoadError(err.message || "Erreur lors du chargement des options");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [router]);

  // --- helpers labels ---
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

  function filterTransfos(cat: string) {
    return options?.tarifs_transformations.filter((t) => t.categorie === cat) ?? [];
  }

  function filterTissus(cat: string) {
    return options?.tarifs_tissus.filter((t) => t.categorie === cat) ?? [];
  }

  function getTransfoById(id: number | null) {
    return options?.tarifs_transformations.find((t) => t.id === id) ?? null;
  }

  function getTissuById(id: number | null) {
    return options?.tarifs_tissus.find((t) => t.id === id) ?? null;
  }

  const hasManches = !!manchesId;

  // Double décolleté
  const doubleDecolleteAlerte = useMemo(() => {
    const dev = getTransfoById(decDevantId);
    const dos = getTransfoById(decDosId);
    return dev?.est_decollete && dos?.est_decollete;
  }, [decDevantId, decDosId, options]);

  // Prix = coût interne (base pour les marges côté back)
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

    // Transformations de base
    addT(decDevantId);
    addT(decDosId);
    addT(decoupeDevantId);
    addT(decoupeDosId);
    addT(manchesId);
    addT(basId);

    // Règle métier : combinaisons ceinture / remonté devant / échancré dos
    const ceintureTransfo = options.tarifs_transformations.find(
      (t) => t.categorie === "Ceinture",
    );
    const remontDevantTransfo = options.tarifs_transformations.find(
      (t) =>
        t.categorie === "Découpe taille devant et dos" &&
        t.epaisseur_ou_option === "Remonté devant",
    );
    const echancreDosTransfo = options.tarifs_transformations.find(
      (t) =>
        t.categorie === "Découpe taille devant et dos" &&
        t.epaisseur_ou_option === "Échancré dos",
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

    // Tissus
    addTi(tissuDevantId);
    addTi(tissuDosId);
    addTi(tissuManchesId);
    addTi(tissuBasId);

    // Finitions supp
    for (const id of finitionsIds) {
      const f = options.finitions_supplementaires.find((x) => x.id === id);
      if (f) total += f.prix;
    }

    // Accessoires (hors housse auto)
    for (const id of accessoiresIds) {
      const a = options.accessoires.find((x) => x.id === id);
      if (a) total += a.prix;
    }

    // Housse ajoutée automatiquement
    const housse = options.accessoires.find((a) =>
      a.nom.toLowerCase().includes("housse"),
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

  async function handleSubmit() {
    setSaveError(null);

    if (!options) return setSaveError("Options non chargées.");

    // VALIDATION
    const errors: string[] = [];
    if (!tissuDevantId) errors.push("Le tissu devant est obligatoire.");
    if (!tissuBasId) errors.push("Le tissu bas est obligatoire.");
    if (hasManches && !tissuManchesId)
      errors.push("Le tissu manches est obligatoire si des manches sont choisies.");

    if (errors.length > 0) {
      setSaveError(errors.join(" "));
      return;
    }

    if (coutInterneTotal <= 0) {
      return setSaveError("Le devis est vide ou incomplet.");
    }

    // Description lisible
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

    // Description pour la combo taille / ceinture
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

    // Housse dans la description
    const housse = options.accessoires.find((a) =>
      a.nom.toLowerCase().includes("housse"),
    );
    if (housse) {
      parts.push("Housse de protection incluse");
    }

    const description =
      parts.length > 0 ? parts.join(" | ") : "Robe de mariée sur mesure";

    setSaving(true);
    try {
      const created = (await apiFetch("/api/boutique/devis", {
        method: "POST",
        body: JSON.stringify({
          lignes: [
            {
              robe_modele_id: null,
              description,
              quantite: 1,
              prix_unitaire: coutInterneTotal,
            },
          ],
        }),
      })) as any;

      if (created?.id) router.push(`/devis/${created.id}/confirmation`);
      else router.push("/dashboard");
    } catch (err: any) {
      setSaveError(err.message || "Erreur création devis");
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
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Tableau de bord", href: "/dashboard" },
          { label: "Devis", href: "/historique" },
          { label: "Nouveau devis" },
        ]}
      />

      <h1 className="text-2xl font-bold">Créer un devis</h1>

      {saveError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 p-2 rounded">
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
              className="w-full border rounded px-3 py-2 text-sm"
              value={decDevantId ?? ""}
              onChange={(e) =>
                setDecDevantId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Aucun</option>
              {filterTransfos("Décolleté devant").map((t) => (
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
              className="w-full border rounded px-3 py-2 text-sm"
              value={decoupeDevantId ?? ""}
              onChange={(e) =>
                setDecoupeDevantId(
                  e.target.value ? Number(e.target.value) : null,
                )
              }
            >
              <option value="">Aucune</option>
              {filterTransfos("Découpe devant").map((t) => (
                <option key={t.id} value={t.id}>
                  {buildTransfoLabel(t)}
                </option>
              ))}
            </select>
          </div>

          {/* Combo taille / ceinture */}
          <div className="mb-3">
            <label
              className="block text-sm font-medium mb-1"
              htmlFor="select-decoupe-taille"
            >
              Découpe taille devant et dos / ceinture
            </label>
            <select
              id="select-decoupe-taille"
              className="w-full border rounded px-3 py-2 text-sm"
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
              <option value="REMONT_DEVANT_SEULE">
                Remonté devant seul
              </option>
              <option value="ECHANCRE_DOS_SEUL">
                Échancré dos seul
              </option>
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
              className="w-full border rounded px-3 py-2 text-sm"
              value={manchesId ?? ""}
              onChange={(e) =>
                setManchesId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Aucune</option>
              {filterTransfos("Manches").map((t) => (
                <option key={t.id} value={t.id}>
                  {buildTransfoLabel(t)}
                </option>
              ))}
            </select>
          </div>

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
              className="w-full border rounded px-3 py-2 text-sm"
              value={basId ?? ""}
              onChange={(e) =>
                setBasId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Aucun</option>
              {filterTransfos("Bas").map((t) => (
                <option key={t.id} value={t.id}>
                  {buildTransfoLabel(t)}
                </option>
              ))}
            </select>
          </div>

          {/* TISSUS DEVANT / MANCHES / BAS */}
          <div className="space-y-3 mt-4">
            {/* Tissu devant */}
            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="select-tissu-devant"
              >
                Tissu devant
              </label>
              <select
                id="select-tissu-devant"
                className="w-full border rounded px-3 py-2 text-sm"
                value={tissuDevantId ?? ""}
                onChange={(e) =>
                  setTissuDevantId(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="">Aucun</option>
                {filterTissus("devant").map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.detail}
                  </option>
                ))}
              </select>
            </div>

            {/* Tissu manches (si manches) */}
            {hasManches && (
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  htmlFor="select-tissu-manches"
                >
                  Tissu manches
                </label>
                <select
                  id="select-tissu-manches"
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={tissuManchesId ?? ""}
                  onChange={(e) =>
                    setTissuManchesId(
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                >
                  <option value="">Aucun</option>
                  {filterTissus("Manches").map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.detail}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tissu bas */}
            <div>
              <label
                className="block text-sm font-medium mb-1"
                htmlFor="select-tissu-bas"
              >
                Tissu bas
              </label>
              <select
                id="select-tissu-bas"
                className="w-full border rounded px-3 py-2 text-sm"
                value={tissuBasId ?? ""}
                onChange={(e) =>
                  setTissuBasId(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="">Aucun</option>
                {filterTissus("Bas").map((t) => {
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
        </div>

        {/* DOS + FINITIONS + ACCESSOIRES */}
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
              className="w-full border rounded px-3 py-2 text-sm"
              value={decDosId ?? ""}
              onChange={(e) =>
                setDecDosId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Aucun</option>
              {filterTransfos("Décolleté dos").map((t) => (
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
              className="w-full border rounded px-3 py-2 text-sm"
              value={decoupeDosId ?? ""}
              onChange={(e) =>
                setDecoupeDosId(
                  e.target.value ? Number(e.target.value) : null,
                )
              }
            >
              <option value="">Aucune</option>
              {filterTransfos("Découpe dos").map((t) => (
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
              className="w-full border rounded px-3 py-2 text-sm"
              value={tissuDosId ?? ""}
              onChange={(e) =>
                setTissuDosId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Aucun</option>
              {filterTissus("Dos").map((t) => {
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

          {/* FINITIONS SUPPLÉMENTAIRES */}
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

                          newList = newList.filter((id) => !autres.includes(id));
                        }

                        setFinitionsIds(newList);
                      } else {
                        setFinitionsIds(finitionsIds.filter((id) => id !== f.id));
                      }
                    }}
                  />
                  <span>{f.nom}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ACCESSOIRES */}
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Accessoires</label>
            <div className="space-y-1 border rounded p-2 max-h-40 overflow-y-auto">
              {options.accessoires.map((a) => {
                const isHousse = a.nom.toLowerCase().includes("housse");

                return (
                  <label key={a.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={isHousse || accessoiresIds.includes(a.id)}
                      disabled={isHousse} // housse non décochable
                      onChange={(e) => {
                        if (isHousse) return; // on ne touche pas à la housse
                        if (e.target.checked) {
                          setAccessoiresIds([...accessoiresIds, a.id]);
                        } else {
                          setAccessoiresIds(
                            accessoiresIds.filter((id) => id !== a.id),
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

      {/* Alerte double décolleté */}
      {doubleDecolleteAlerte && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded">
          Attention : décolleté devant + décolleté dos est déconseillé.
        </div>
      )}

      {/* VALIDATION */}
      <div className="border rounded-xl p-6 bg-white flex flex-col items-center gap-2">
        {saveError && (
          <p className="text-xs text-red-600 text-center">{saveError}</p>
        )}

        <button
          type="button"
          disabled={saving}
          onClick={handleSubmit}
          className="mt-2 inline-flex justify-center bg-gray-900 text-white text-sm font-semibold px-6 py-2 rounded-full disabled:opacity-50"
        >
          {saving ? "Création du devis…" : "Créer le devis"}
        </button>
      </div>
    </div>
  );
}
