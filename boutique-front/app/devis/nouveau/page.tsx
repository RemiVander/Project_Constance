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

  // IDs des transformations choisies
  const [decDevantId, setDecDevantId] = useState<number | null>(null);
  const [decDosId, setDecDosId] = useState<number | null>(null);
  const [decoupeDevantId, setDecoupeDevantId] = useState<number | null>(null);
  const [decoupeDosId, setDecoupeDosId] = useState<number | null>(null);
  const [manchesId, setManchesId] = useState<number | null>(null);
  const [basId, setBasId] = useState<number | null>(null);

  // tissus
  const [tissuDevantId, setTissuDevantId] = useState<number | null>(null);
  const [tissuDosId, setTissuDosId] = useState<number | null>(null);
  const [tissuManchesId, setTissuManchesId] = useState<number | null>(null);
  const [tissuBasId, setTissuBasId] = useState<number | null>(null);
  const [tissuCeintureId, setTissuCeintureId] = useState<number | null>(null);

  // finitions + accessoires
  const [finitionsIds, setFinitionsIds] = useState<number[]>([]);
  const [accessoiresIds, setAccessoiresIds] = useState<number[]>([]);

  const [avecCeinture, setAvecCeinture] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = (await apiFetch(
          "/api/boutique/options",
        )) as OptionsResponse;
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

  function getRobeNom(robeId: number | null): string {
    if (!options || robeId == null) return "";
    const robe = options.robe_modeles.find((r) => r.id === robeId);
    return robe ? robe.nom : "";
  }

  function filterTransfos(categorie: string): TransformationTarif[] {
    if (!options) return [];
    return options.tarifs_transformations.filter(
      (t) => t.categorie === categorie,
    );
  }

  function filterTissus(categorie: string): TissuTarif[] {
    if (!options) return [];
    return options.tarifs_tissus.filter((t) => t.categorie === categorie);
  }

  function getTransfoById(id: number | null): TransformationTarif | null {
    if (!options || id == null) return null;
    return options.tarifs_transformations.find((t) => t.id === id) ?? null;
  }

  function getTissuById(id: number | null): TissuTarif | null {
    if (!options || id == null) return null;
    return options.tarifs_tissus.find((t) => t.id === id) ?? null;
  }

  function isCeinturePossible(): boolean {
    const decoupeDevant = getTransfoById(decoupeDevantId);
    if (!decoupeDevant) return false;
    return !!decoupeDevant.ceinture_possible;
  }

  const doubleDecolleteAlerte = useMemo(() => {
    const dev = getTransfoById(decDevantId);
    const dos = getTransfoById(decDosId);
    if (!dev || !dos) return false;
    return dev.est_decollete && dos.est_decollete;
  }, [decDevantId, decDosId, options]);

  // Prix interne (non affiché à l'écran)
  const prixBaseHt = useMemo(() => {
    if (!options) return 0;
    let total = 0;

    const addTransfo = (id: number | null) => {
      const t = getTransfoById(id);
      if (t) total += t.prix;
    };

    const addTissu = (id: number | null) => {
      const t = getTissuById(id);
      if (t) total += t.prix;
    };

    addTransfo(decDevantId);
    addTransfo(decDosId);
    addTransfo(decoupeDevantId);
    addTransfo(decoupeDosId);
    addTransfo(manchesId);
    addTransfo(basId);

    addTissu(tissuDevantId);
    addTissu(tissuDosId);
    addTissu(tissuManchesId);
    addTissu(tissuBasId);
    if (avecCeinture && tissuCeintureId) {
      addTissu(tissuCeintureId);
    }

    for (const finId of finitionsIds) {
      const f = options.finitions_supplementaires.find((f) => f.id === finId);
      if (f) total += f.prix;
    }
    for (const accId of accessoiresIds) {
      const a = options.accessoires.find((a) => a.id === accId);
      if (a) total += a.prix;
    }

    return total; // 1 robe par devis
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

    if (prixBaseHt <= 0) {
      setSaveError("Le devis est vide ou incomplet.");
      return;
    }

    setSaving(true);
    try {
      const description =
        "Devis généré depuis le front boutique (robe entièrement personnalisée)";

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

      // Redirection vers une page de confirmation,
      // où l'on pourra télécharger les PDFs
      if (created && created.id) {
        router.push(`/devis/${created.id}/confirmation`);
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setSaveError(err.message || "Erreur lors de la création du devis");
    } finally {
      setSaving(false);
    }
  }

  // États de chargement / erreur
  if (loading) {
    return <p>Chargement des options...</p>;
  }

  if (!options) {
    return (
      <div className="space-y-2">
        <p className="text-red-600 text-sm">
          Impossible de charger les options de création de devis.
        </p>
        {loadError && (
          <p className="text-xs text-gray-500">Détail : {loadError}</p>
        )}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex text-sm text-blue-600 underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Tableau de bord", href: "/dashboard" },
          { label: "Devis", href: "/historique" }, // ou autre route que tu préfères
          { label: "Nouveau devis" }, // étape courante non cliquable
        ]}
      />


      <h1 className="text-2xl font-bold mb-2">Créer un devis</h1>

      {loadError && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-2">
          Attention : {loadError}
        </div>
      )}

      {/* Devant / Dos */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* DEVANT */}
        <div className="bg-white border rounded-xl p-4">
          <h2 className="font-semibold mb-3">Devant</h2>

          {/* Décolleté devant */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Décolleté devant
            </label>
            <select
              className="border rounded px-3 py-2 text-sm w-full"
              value={decDevantId ?? ""}
              onChange={(e) =>
                setDecDevantId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Aucun</option>
              {filterTransfos("Décolleté devant").map((t) => {
                const robeNom = getRobeNom(t.robe_modele_id);
                const baseLabel = t.epaisseur_ou_option
                  ? `${t.finition} – ${t.epaisseur_ou_option}`
                  : t.finition;
                const label = robeNom
                  ? `[${robeNom}] ${baseLabel}`
                  : baseLabel;
                return (
                  <option key={t.id} value={t.id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Découpe devant */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Découpe devant
            </label>
            <select
              className="border rounded px-3 py-2 text-sm w-full"
              value={decoupeDevantId ?? ""}
              onChange={(e) =>
                setDecoupeDevantId(
                  e.target.value ? Number(e.target.value) : null,
                )
              }
            >
              <option value="">Aucune</option>
              {filterTransfos("Découpe devant").map((t) => {
                const robeNom = getRobeNom(t.robe_modele_id);
                const baseLabel = t.epaisseur_ou_option
                  ? `${t.finition} – ${t.epaisseur_ou_option}`
                  : t.finition;
                const label = robeNom
                  ? `[${robeNom}] ${baseLabel}`
                  : baseLabel;
                return (
                  <option key={t.id} value={t.id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Manches */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Manches</label>
            <select
              className="border rounded px-3 py-2 text-sm w-full"
              value={manchesId ?? ""}
              onChange={(e) =>
                setManchesId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Aucune</option>
              {filterTransfos("Manches").map((t) => {
                const robeNom = getRobeNom(t.robe_modele_id);
                const baseLabel = t.epaisseur_ou_option
                  ? `${t.finition} – ${t.epaisseur_ou_option}`
                  : t.finition;
                const label = robeNom
                  ? `[${robeNom}] ${baseLabel}`
                  : baseLabel;
                return (
                  <option key={t.id} value={t.id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Bas */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Bas</label>
            <select
              className="border rounded px-3 py-2 text-sm w-full"
              value={basId ?? ""}
              onChange={(e) =>
                setBasId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Aucun</option>
              {filterTransfos("Bas").map((t) => {
                const robeNom = getRobeNom(t.robe_modele_id);
                const baseLabel = t.epaisseur_ou_option
                  ? `${t.finition} – ${t.epaisseur_ou_option}`
                  : t.finition;
                const label = robeNom
                  ? `[${robeNom}] ${baseLabel}`
                  : baseLabel;
                return (
                  <option key={t.id} value={t.id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Tissus devant / manches / bas */}
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Tissu devant
              </label>
              <select
                className="border rounded px-3 py-2 text-sm w-full"
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

            <div>
              <label className="block text-sm font-medium mb-1">
                Tissu manches
              </label>
              <select
                className="border rounded px-3 py-2 text-sm w-full"
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

            <div>
              <label className="block text-sm font-medium mb-1">
                Tissu bas
              </label>
              <select
                className="border rounded px-3 py-2 text-sm w-full"
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

          {/* Ceinture */}
          {isCeinturePossible() && (
            <div className="mt-4">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={avecCeinture}
                  onChange={(e) => setAvecCeinture(e.target.checked)}
                />
                <span>Ajouter une ceinture</span>
              </label>
              {avecCeinture && (
                <div className="mt-2">
                  <label className="block text-xs font-medium mb-1">
                    Tissu ceinture
                  </label>
                  <select
                    className="border rounded px-3 py-2 text-sm w-full"
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
          )}
        </div>

        {/* DOS */}
        <div className="bg-white border rounded-xl p-4">
          <h2 className="font-semibold mb-3">Dos</h2>

          {/* Décolleté dos */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Décolleté dos
            </label>
            <select
              className="border rounded px-3 py-2 text-sm w-full"
              value={decDosId ?? ""}
              onChange={(e) =>
                setDecDosId(e.target.value ? Number(e.target.value) : null)
              }
            >
              <option value="">Aucun</option>
              {filterTransfos("Décolleté dos").map((t) => {
                const robeNom = getRobeNom(t.robe_modele_id);
                const baseLabel = t.epaisseur_ou_option
                  ? `${t.finition} – ${t.epaisseur_ou_option}`
                  : t.finition;
                const label = robeNom
                  ? `[${robeNom}] ${baseLabel}`
                  : baseLabel;
                return (
                  <option key={t.id} value={t.id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Découpe dos */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Découpe dos
            </label>
            <select
              className="border rounded px-3 py-2 text-sm w-full"
              value={decoupeDosId ?? ""}
              onChange={(e) =>
                setDecoupeDosId(
                  e.target.value ? Number(e.target.value) : null,
                )
              }
            >
              <option value="">Aucune</option>
              {filterTransfos("Découpe dos").map((t) => {
                const robeNom = getRobeNom(t.robe_modele_id);
                const baseLabel = t.epaisseur_ou_option
                  ? `${t.finition} – ${t.epaisseur_ou_option}`
                  : t.finition;
                const label = robeNom
                  ? `[${robeNom}] ${baseLabel}`
                  : baseLabel;
                return (
                  <option key={t.id} value={t.id}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Tissu dos */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Tissu dos
            </label>
            <select
              className="border rounded px-3 py-2 text-sm w-full"
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

          {/* Finitions supplémentaires */}
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">
              Finitions supplémentaires
            </label>
            <div className="space-y-1 max-h-40 overflow-y-auto border rounded p-2">
              {options.finitions_supplementaires.map((f) => (
                <label key={f.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={finitionsIds.includes(f.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFinitionsIds([...finitionsIds, f.id]);
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

          {/* Accessoires */}
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">
              Accessoires
            </label>
            <div className="space-y-1 max-h-40 overflow-y-auto border rounded p-2">
              {options.accessoires.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={accessoiresIds.includes(a.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAccessoiresIds([...accessoiresIds, a.id]);
                      } else {
                        setAccessoiresIds(
                          accessoiresIds.filter((id) => id !== a.id),
                        );
                      }
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
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
          Attention : vous avez un décolleté devant et un décolleté dos. Cette
          combinaison n&apos;est pas recommandée.
        </div>
      )}

      {/* Zone validation avec bouton centré */}
      <div className="bg-white border rounded-xl p-6 flex flex-col items-center gap-2">
        {saveError && (
          <p className="text-xs text-red-600 text-center">{saveError}</p>
        )}
        <p className="text-xs text-gray-500 text-center">
          Le prix ne sera pas affiché ici. Il apparaîtra uniquement dans le PDF
          du devis une fois créé.
        </p>
        <button
          type="button"
          disabled={saving || prixBaseHt <= 0}
          onClick={handleSubmit}
          className="mt-2 inline-flex justify-center bg-gray-900 text-white text-sm font-semibold px-6 py-2 rounded-full disabled:opacity-50"
        >
          {saving ? "Création du devis..." : "Créer le devis"}
        </button>
      </div>
    </div>
  );
}
