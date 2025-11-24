"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, API_BASE_URL } from "@/lib/api";

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

const TVA = 0.2; // 20%
const MARGE_PAR_DEFAUT = 2.5;

export default function NouveauDevisPage() {
  const router = useRouter();
  const [options, setOptions] = useState<OptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Sélections utilisateur
  const [robeModeleId, setRobeModeleId] = useState<number | null>(null);

  const [decDevantId, setDecDevantId] = useState<number | null>(null);
  const [decDosId, setDecDosId] = useState<number | null>(null);
  const [decoupeDevantId, setDecoupeDevantId] = useState<number | null>(null);
  const [decoupeDosId, setDecoupeDosId] = useState<number | null>(null);
  const [manchesId, setManchesId] = useState<number | null>(null);
  const [basId, setBasId] = useState<number | null>(null);

  const [tissuDevantId, setTissuDevantId] = useState<number | null>(null);
  const [tissuDosId, setTissuDosId] = useState<number | null>(null);
  const [tissuManchesId, setTissuManchesId] = useState<number | null>(null);
  const [tissuBasId, setTissuBasId] = useState<number | null>(null);
  const [tissuCeintureId, setTissuCeintureId] = useState<number | null>(null);

  const [finitionsIds, setFinitionsIds] = useState<number[]>([]);
  const [accessoiresIds, setAccessoiresIds] = useState<number[]>([]);

  const [avecCeinture, setAvecCeinture] = useState(false);
  const [marge, setMarge] = useState(MARGE_PAR_DEFAUT);
  const [affichagePour, setAffichagePour] = useState<"boutique" | "client">(
    "boutique",
  );
  const [quantite, setQuantite] = useState(1);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Chargement des options depuis le back
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

  // Helpers pour filtrer les transformations / tissus
  function filterTransfos(categorie: string): TransformationTarif[] {
    if (!options || !robeModeleId) return [];
    return options.tarifs_transformations.filter(
      (t) =>
        t.categorie === categorie &&
        (t.robe_modele_id === null || t.robe_modele_id === robeModeleId),
    );
  }

  function filterTissus(categorie: string): TissuTarif[] {
    if (!options) return [];
    return options.tarifs_tissus.filter((t) => {
      if (t.categorie !== categorie) return false;
      if (robeModeleId == null) return true;
      return t.robe_modele_id === null || t.robe_modele_id === robeModeleId;
    });
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
    if (!decoupeDevant.ceinture_possible) return false;

    const bas = getTransfoById(basId);
    return !!bas;
  }

  const doubleDecolleteAlerte = useMemo(() => {
    const dev = getTransfoById(decDevantId);
    const dos = getTransfoById(decDosId);
    if (!dev || !dos) return false;
    return dev.est_decollete && dos.est_decollete;
  }, [decDevantId, decDosId, options]);

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
    addTissu(tissuCeintureId && avecCeinture ? tissuCeintureId : null);

    for (const finId of finitionsIds) {
      const f = options.finitions_supplementaires.find((f) => f.id === finId);
      if (f) total += f.prix;
    }

    for (const accId of accessoiresIds) {
      const a = options.accessoires.find((a) => a.id === accId);
      if (a) total += a.prix;
    }

    return total * quantite;
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
    quantite,
  ]);

  const prixClient = useMemo(() => {
    const htClient = prixBaseHt * marge;
    const ttcClient = htClient * (1 + TVA);
    return { htClient, ttcClient };
  }, [prixBaseHt, marge]);

  async function handleSubmit() {
    setSaveError(null);

    if (!robeModeleId) {
      setSaveError("Veuillez choisir un modèle de robe.");
      return;
    }

    if (prixBaseHt <= 0) {
      setSaveError("Le devis est vide ou incomplet.");
      return;
    }

    setSaving(true);
    try {
      const description = "Devis généré depuis le front boutique";

      const created = (await apiFetch("/api/boutique/devis", {
        method: "POST",
        body: JSON.stringify({
          lignes: [
            {
              robe_modele_id: robeModeleId,
              description,
              quantite,
              prix_unitaire: prixBaseHt / quantite,
            },
          ],
        }),
      })) as any;

      window.alert("Devis créé avec succès. Le téléchargement va démarrer.");

      if (created && created.id) {
        const pdfUrl = `${API_BASE_URL}/api/boutique/devis/${created.id}/pdf`;
        window.open(pdfUrl, "_blank");
      }

      router.push("/dashboard");
    } catch (err: any) {
      setSaveError(err.message || "Erreur lors de la création du devis");
    } finally {
      setSaving(false);
    }
  }

  // --- États de chargement / erreur pour éviter l'erreur 'null.robe_modeles' ---

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

  // --- Rendu principal une fois les options chargées ---

  return (
    <div className="space-y-6">
      <nav className="text-xs text-gray-500 mb-2">
        Accueil &gt; Tableau de bord &gt; Créer un devis
      </nav>

      <h1 className="text-2xl font-bold mb-2">Créer un devis</h1>

      {loadError && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-2">
          Attention : {loadError}
        </div>
      )}

      {/* Sélection du modèle de robe */}
      <div className="bg-gray-50 border rounded-xl p-4 mb-4">
        <label className="block text-sm font-medium mb-1">
          Modèle de robe
        </label>
        <select
          className="border rounded px-3 py-2 text-sm w-full max-w-xs"
          value={robeModeleId ?? ""}
          onChange={(e) =>
            setRobeModeleId(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">Sélectionner un modèle</option>
          {options.robe_modeles.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nom}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Exemple : Alizé, Bora, Eurus, Ghibli, Mistral, Zephyr...
        </p>
      </div>

      {/* Silhouette simplifiée : Devant / Dos */}
      <div className="grid md:grid-cols-2 gap-6">
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
              {filterTransfos("Décolleté devant").map((t) => (
                <option key={t.id} value={t.id}>
                  {t.finition}
                  {t.epaisseur_ou_option
                    ? ` – ${t.epaisseur_ou_option}`
                    : ""}{" "}
                  ({t.prix} €)
                </option>
              ))}
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
              {filterTransfos("Découpe devant").map((t) => (
                <option key={t.id} value={t.id}>
                  {t.finition}
                  {t.epaisseur_ou_option
                    ? ` – ${t.epaisseur_ou_option}`
                    : ""}{" "}
                  ({t.prix} €)
                </option>
              ))}
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
              {filterTransfos("Manches").map((t) => (
                <option key={t.id} value={t.id}>
                  {t.finition}
                  {t.epaisseur_ou_option
                    ? ` – ${t.epaisseur_ou_option}`
                    : ""}{" "}
                  ({t.prix} €)
                </option>
              ))}
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
              {filterTransfos("Bas").map((t) => (
                <option key={t.id} value={t.id}>
                  {t.finition}
                  {t.epaisseur_ou_option
                    ? ` – ${t.epaisseur_ou_option}`
                    : ""}{" "}
                  ({t.prix} €)
                </option>
              ))}
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
                    {t.detail} ({t.prix} €)
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
                    {t.detail} ({t.prix} €)
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
                    {t.forme ? ` – ${t.forme}` : ""} ({t.prix} €)
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
                        {t.detail} ({t.prix} €)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

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
              {filterTransfos("Décolleté dos").map((t) => (
                <option key={t.id} value={t.id}>
                  {t.finition}
                  {t.epaisseur_ou_option
                    ? ` – ${t.epaisseur_ou_option}`
                    : ""}{" "}
                  ({t.prix} €)
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
              className="border rounded px-3 py-2 text-sm w-full"
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
                  {t.epaisseur_ou_option
                    ? ` – ${t.epaisseur_ou_option}`
                    : ""}{" "}
                  ({t.prix} €)
                </option>
              ))}
            </select>
          </div>

          {/* Tissu dos */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Tissu dos</label>
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
                  {t.detail} ({t.prix} €)
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
                  <span>
                    {f.nom} ({f.prix} €)
                  </span>
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
                  <span>
                    {a.nom} ({a.prix} €)
                  </span>
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

      {/* Résumé prix & création du devis */}
      <div className="bg-white border rounded-xl p-4 flex flex-col md:flex-row md:items-end gap-4 justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Quantité</label>
            <input
              type="number"
              min={1}
              className="border rounded px-2 py-1 text-sm w-16"
              value={quantite}
              onChange={(e) =>
                setQuantite(Math.max(1, Number(e.target.value) || 1))
              }
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Affichage pour :</span>
            <button
              type="button"
              onClick={() => setAffichagePour("boutique")}
              className={`px-3 py-1 text-xs rounded-full border ${
                affichagePour === "boutique"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700"
              }`}
            >
              Boutique
            </button>
            <button
              type="button"
              onClick={() => setAffichagePour("client")}
              className={`px-3 py-1 text-xs rounded-full border ${
                affichagePour === "client"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700"
              }`}
            >
              Client final
            </button>
          </div>

          {affichagePour === "client" && (
            <div className="flex items-center gap-3">
              <label className="text-sm">
                Marge (x) :
                <input
                  type="number"
                  step={0.1}
                  min={1}
                  className="ml-2 border rounded px-2 py-1 text-sm w-20"
                  value={marge}
                  onChange={(e) =>
                    setMarge(Math.max(1, Number(e.target.value) || 1))
                  }
                />
              </label>
            </div>
          )}
        </div>

        <div className="space-y-1 text-right">
          <p className="text-sm">
            Prix base HT (boutique) :{" "}
            <span className="font-semibold">
              {prixBaseHt.toFixed(2)} €
            </span>
          </p>

          {affichagePour === "client" && (
            <>
              <p className="text-sm">
                Prix client HT :{" "}
                <span className="font-semibold">
                  {prixClient.htClient.toFixed(2)} €
                </span>
              </p>
              <p className="text-sm">
                Prix client TTC :{" "}
                <span className="font-semibold">
                  {prixClient.ttcClient.toFixed(2)} €
                </span>
              </p>
            </>
          )}

          {saveError && (
            <p className="text-xs text-red-600 mt-1">{saveError}</p>
          )}

          <button
            type="button"
            disabled={saving || prixBaseHt <= 0 || !robeModeleId}
            onClick={handleSubmit}
            className="mt-2 inline-flex justify-center bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded disabled:opacity-50"
          >
            {saving ? "Création en cours..." : "Créer le devis"}
          </button>
        </div>
      </div>
    </div>
  );
}
