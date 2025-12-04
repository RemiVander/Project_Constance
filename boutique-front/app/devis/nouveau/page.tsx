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
  finition: string;
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
  est_fente: boolean; // NOUVEAU
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

  // Tissus
  const [tissuDevantId, setTissuDevantId] = useState<number | null>(null);
  const [tissuDosId, setTissuDosId] = useState<number | null>(null);
  const [tissuManchesId, setTissuManchesId] = useState<number | null>(null);
  const [tissuBasId, setTissuBasId] = useState<number | null>(null);
  const [tissuCeintureId, setTissuCeintureId] = useState<number | null>(null);

  // Finitions + accessoires
  const [finitionsIds, setFinitionsIds] = useState<number[]>([]);
  const [accessoiresIds, setAccessoiresIds] = useState<number[]>([]);

  // Ceinture
  const [avecCeinture, setAvecCeinture] = useState(false);

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

  // Prix
  const prixBaseHt = useMemo(() => {
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

    addTi(tissuDevantId);
    addTi(tissuDosId);
    addTi(tissuManchesId);
    addTi(tissuBasId);
    if (avecCeinture) addTi(tissuCeintureId);

    for (const id of finitionsIds) {
      const f = options.finitions_supplementaires.find((x) => x.id === id);
      if (f) total += f.prix;
    }
    for (const id of accessoiresIds) {
      const a = options.accessoires.find((x) => x.id === id);
      if (a) total += a.prix;
    }

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
    tissuCeintureId,
    avecCeinture,
    finitionsIds,
    accessoiresIds,
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

    if (prixBaseHt <= 0) {
      return setSaveError("Le devis est vide ou incomplet.");
    }

    // Description
    const parts: string[] = [];
    const addT = (label: string, id: number | null) => {
      if (!id) return;
      const t = getTransfoById(id);
      if (!t) return;
      const extra = t.epaisseur_ou_option ? ` – ${t.epaisseur_ou_option}` : "";
      parts.push(`${label}: ${t.finition}${extra}`);
    };
    const addTi = (label: string, id: number | null) => {
      if (!id) return;
      const t = getTissuById(id);
      if (!t) return;
      parts.push(`${label}: ${t.categorie} – ${t.detail}`);
    };

    addT("Décolleté devant", decDevantId);
    addT("Décolleté dos", decDosId);
    addT("Découpe devant", decoupeDevantId);
    addT("Découpe dos", decoupeDosId);
    addT("Manches", manchesId);
    addT("Bas de robe", basId);

    addTi("Tissu devant", tissuDevantId);
    addTi("Tissu dos", tissuDosId);
    addTi("Tissu manches", tissuManchesId);
    addTi("Tissu bas", tissuBasId);
    if (avecCeinture) addTi("Tissu ceinture", tissuCeintureId);

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
              prix_unitaire: prixBaseHt,
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

          {/* Décolleté */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Décolleté devant
            </label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={decDevantId ?? ""}
              onChange={(e) =>
                setDecDevantId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Aucun</option>
              {filterTransfos("Décolleté devant").map((t) => (
                <option key={t.id} value={t.id}>
                  {t.finition}
                </option>
              ))}
            </select>
          </div>

          {/* Découpe */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Découpe devant
            </label>
            <select
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
                  {t.finition}
                </option>
              ))}
            </select>
          </div>

          {/* Manches */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Manches</label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={manchesId ?? ""}
              onChange={(e) =>
                setManchesId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Aucune</option>
              {filterTransfos("Manches").map((t) => (
                <option key={t.id} value={t.id}>
                  {t.finition}
                </option>
              ))}
            </select>
          </div>

          {/* Bas */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Bas</label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={basId ?? ""}
              onChange={(e) =>
                setBasId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Aucun</option>
              {filterTransfos("Bas").map((t) => (
                <option key={t.id} value={t.id}>
                  {t.finition}
                </option>
              ))}
            </select>
          </div>

          {/* TISSUS EN LIGNES */}
          <div className="space-y-3 mt-4">
            {/* TISSU DEVANT */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Tissu devant
              </label>
              <select
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

            {/* TISSU MANCHES SI MANCHES */}
            {hasManches && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tissu manches
                </label>
                <select
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

            {/* TISSU BAS */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Tissu bas
              </label>
              <select
                className="w-full border rounded px-3 py-2 text-sm"
                value={tissuBasId ?? ""}
                onChange={(e) =>
                  setTissuBasId(
                    e.target.value ? Number(e.target.value) : null,
                  )
                }
              >
                <option value="">Aucun</option>
                {filterTissus("Bas").map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.detail}
                    {t.forme ? ` – ${t.forme}` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CEINTURE */}
          {(() => {
            const dec = getTransfoById(decoupeDevantId);
            if (!dec?.ceinture_possible) return null;

            return (
              <div className="mt-4">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={avecCeinture}
                    onChange={(e) => setAvecCeinture(e.target.checked)}
                  />
                  Ajouter une ceinture
                </label>

                {avecCeinture && (
                  <div className="mt-2">
                    <label className="block text-xs font-medium mb-1">
                      Tissu ceinture
                    </label>
                    <select
                      className="w-full border rounded px-3 py-2 text-sm"
                      value={tissuCeintureId ?? ""}
                      onChange={(e) =>
                        setTissuCeintureId(
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                    >
                      <option value="">Aucun</option>
                      {filterTissus("Ceinture").map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.detail}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* DOS */}
        <div className="border rounded-xl p-4 bg-white">
          <h2 className="font-semibold mb-3">Dos</h2>

          {/* Décolleté dos */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Décolleté dos
            </label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={decDosId ?? ""}
              onChange={(e) =>
                setDecDosId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Aucun</option>
              {filterTransfos("Décolleté dos").map((t) => (
                <option key={t.id} value={t.id}>
                  {t.finition}
                </option>
              ))}
            </select>
          </div>

          {/* Découpe dos */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Découpe dos
            </label>
            <select
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
                  {t.finition}
                </option>
              ))}
            </select>
          </div>

          {/* Tissu dos */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Tissu dos
            </label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={tissuDosId ?? ""}
              onChange={(e) =>
                setTissuDosId(
                  e.target.value ? Number(e.target.value) : null,
                )
              }
            >
              <option value="">Aucun</option>
              {filterTissus("Dos").map((t) => (
                <option key={t.id} value={t.id}>
                  {t.detail}
                </option>
              ))}
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

                        // EXCLUSION AUTOMATIQUE DES AUTRES FENTES
                        if (f.est_fente) {
                          const autres = options.finitions_supplementaires
                            .filter(
                              (x) => x.est_fente && x.id !== f.id,
                            )
                            .map((x) => x.id);

                          newList = newList.filter(
                            (id) => !autres.includes(id),
                          );
                        }

                        setFinitionsIds(newList);
                      } else {
                        setFinitionsIds(
                          finitionsIds.filter((id) => id !== f.id),
                        );
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
              {options.accessoires.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={accessoiresIds.includes(a.id)}
                    onChange={(e) => {
                      if (e.target.checked)
                        setAccessoiresIds([...accessoiresIds, a.id]);
                      else
                        setAccessoiresIds(
                          accessoiresIds.filter((id) => id !== a.id),
                        );
                    }}
                  />
                  <span>{a.nom}</span>
                </label>
              ))}
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
