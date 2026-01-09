"use client";

import { TransformationTarif, TissuTarif, FinitionSupp, Accessoire, OptionsResponse } from "@/hooks/useDevisOptions";

type BasSectionProps = {
  options: OptionsResponse;
  basId: number | null;
  tissuBasId: number | null;
  finitionsIds: number[];
  accessoiresIds: number[];
  setBasId: (id: number | null) => void;
  setTissuBasId: (id: number | null) => void;
  setFinitionsIds: (ids: number[]) => void;
  setAccessoiresIds: (ids: number[]) => void;
  getRobeNom: (robeId: number | null) => string;
  buildTransfoLabel: (t: TransformationTarif) => string;
  filterTissusBas: () => TissuTarif[];
  hasError: (key: string) => boolean;
  clearFieldError: (keys: string | string[]) => void;
  baseSelectClass: string;
  classFor: (key: string) => string;
};

export function BasSection({
  options,
  basId,
  tissuBasId,
  finitionsIds,
  accessoiresIds,
  setBasId,
  setTissuBasId,
  setFinitionsIds,
  setAccessoiresIds,
  getRobeNom,
  buildTransfoLabel,
  filterTissusBas,
  clearFieldError,
  baseSelectClass,
  classFor,
}: BasSectionProps) {
  return (
    <div className="mt-6">
      <div className="border rounded-xl p-4 bg-white">
        <h2 className="font-semibold mb-3">Bas de robe</h2>

        {/* FinitionBas */}
        <div className="mb-3">
          <label
            className="block text-sm font-medium mb-1"
            htmlFor="select-bas"
          >
            Finition Bas
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

        {/* Tissu bas */}
        <div className="mb-3">
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

        {/* Finitions supplémentaires */}
        <div className="mt-4">
          <label className="block text-sm font-medium mb-1">
            Finitions supplémentaires
          </label>
          <div className="space-y-1 border rounded p-2 max-h-40 overflow-y-auto">
            {options.finitions_supplementaires?.map((f) => (
              <label key={f.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={finitionsIds.includes(f.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      let newList = [...finitionsIds, f.id];

                      if (f.est_fente) {
                        const autres = options.finitions_supplementaires
                          ?.filter((x) => x.est_fente && x.id !== f.id)
                          .map((x) => x.id) ?? [];

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
          <label className="block text-sm font-medium font-bold mb-1">
            Accessoires
          </label>
          <div className="space-y-1 border rounded p-2 max-h-40 overflow-y-auto">
            {options.accessoires?.map((a) => {
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
  );
}
