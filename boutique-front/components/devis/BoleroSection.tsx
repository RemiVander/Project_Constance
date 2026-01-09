"use client";

import { TransformationTarif, TissuTarif, OptionsResponse } from "@/hooks/useDevisOptions";

type BoleroSectionProps = {
  options: OptionsResponse;
  // États
  hasBolero: boolean;
  boleroDevantId: number | null;
  boleroDosId: number | null;
  boleroManchesId: number | null;
  // Setters
  setHasBolero: (value: boolean) => void;
  setBoleroDevantId: (id: number | null) => void;
  setBoleroDosId: (id: number | null) => void;
  setBoleroManchesId: (id: number | null) => void;
  // Callbacks pour réinitialiser les manches de robe
  onBoleroManchesChange?: (boleroManchesId: number | null) => void;
  // Validation
  hasError: (key: string) => boolean;
  clearFieldError: (keys: string | string[]) => void;
  baseSelectClass: string;
  classFor: (key: string) => string;
};

export function BoleroSection({
  options,
  hasBolero,
  boleroDevantId,
  boleroDosId,
  boleroManchesId,
  setHasBolero,
  setBoleroDevantId,
  setBoleroDosId,
  setBoleroManchesId,
  onBoleroManchesChange,
  hasError,
  clearFieldError,
  baseSelectClass,
  classFor,
}: BoleroSectionProps) {
  // Filtrer uniquement les options boléro
  const boleroDevantOptions = options.tarifs_transformations.filter(
    (t) =>
      t.categorie === "Décolleté devant" &&
      t.epaisseur_ou_option &&
      t.epaisseur_ou_option.toLowerCase().includes("boléro")
  );

  const boleroDosOptions = options.tarifs_transformations.filter(
    (t) =>
      t.categorie === "Décolleté dos" &&
      t.epaisseur_ou_option &&
      t.epaisseur_ou_option.toLowerCase().includes("boléro")
  );

  // Filtrer les manches en dentelle et éviter les doublons par nom
  const boleroManchesOptions = (() => {
    const manchesDentelle = options.tarifs_tissus?.filter(
      (t) =>
        t.categorie === "Manches" &&
        t.detail &&
        t.detail.toLowerCase().includes("dentelle")
    ) ?? [];
    
    // Grouper par nom (detail) et garder le premier de chaque groupe
    const seen = new Set<string>();
    return manchesDentelle.filter((t) => {
      const key = t.detail?.toLowerCase().trim() || "";
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  })();

  return (
    <div className="border rounded-xl p-4 bg-white mt-6">
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={hasBolero}
            onChange={(e) => {
              setHasBolero(e.target.checked);
              if (!e.target.checked) {
                setBoleroDevantId(null);
                setBoleroDosId(null);
                setBoleroManchesId(null);
                clearFieldError(["boleroDevant", "boleroDos", "boleroManches"]);
                // Réinitialiser les manches de robe si on décoche le boléro
                if (onBoleroManchesChange) {
                  onBoleroManchesChange(null);
                }
              }
            }}
            className="w-4 h-4"
          />
          <span className="font-semibold text-base">Boléro</span>
        </label>
      </div>

      {hasBolero && (
        <div className="grid md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
          <div>
            <label className="block text-sm font-medium mb-1">
              Finition devant
            </label>
            <select
              className={classFor("boleroDevant")}
              value={boleroDevantId ?? ""}
              onChange={(e) => {
                setBoleroDevantId(
                  e.target.value ? Number(e.target.value) : null
                );
                clearFieldError("boleroDevant");
              }}
            >
              <option value="">Aucune</option>
              {boleroDevantOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.finition}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Finition dos
            </label>
            <select
              className={classFor("boleroDos")}
              value={boleroDosId ?? ""}
              onChange={(e) => {
                setBoleroDosId(e.target.value ? Number(e.target.value) : null);
                clearFieldError("boleroDos");
              }}
            >
              <option value="">Aucune</option>
              {boleroDosOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.finition}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">
              Manches (en dentelle uniquement)
            </label>
            <select
              className={classFor("boleroManches")}
              value={boleroManchesId ?? ""}
              onChange={(e) => {
                const newId = e.target.value ? Number(e.target.value) : null;
                setBoleroManchesId(newId);
                clearFieldError("boleroManches");
                // Réinitialiser les manches de robe si on sélectionne des manches de boléro
                if (onBoleroManchesChange) {
                  onBoleroManchesChange(newId);
                }
              }}
            >
              <option value="">Aucune</option>
              {boleroManchesOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.detail}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
