"use client";

import { TransformationTarif, TissuTarif, OptionsResponse } from "@/hooks/useDevisOptions";

type DevantDosSectionProps = {
  options: OptionsResponse;
  // États
  decDevantId: number | null;
  decDosId: number | null;
  decoupeDevantId: number | null;
  decoupeDosId: number | null;
  tissuDevantId: number | null;
  tissuDosId: number | null;
  // Setters
  setDecDevantId: (id: number | null) => void;
  setDecDosId: (id: number | null) => void;
  setDecoupeDevantId: (id: number | null) => void;
  setDecoupeDosId: (id: number | null) => void;
  setTissuDevantId: (id: number | null) => void;
  setTissuDosId: (id: number | null) => void;
  // Helpers
  getTransfoById: (id: number | null) => TransformationTarif | null;
  getTissuById: (id: number | null) => TissuTarif | null;
  getRobeNom: (robeId: number | null) => string;
  buildTransfoLabel: (t: TransformationTarif) => string;
  // Filtres
  filterDecoupeDevantOptions: () => TransformationTarif[];
  filterDecolleteDosOptions: () => TransformationTarif[];
  filterDecoupeDosOptions: () => TransformationTarif[];
  filterTissusDevant: () => TissuTarif[];
  filterTissusDos: () => TissuTarif[];
  // Validation
  hasError: (key: string) => boolean;
  clearFieldError: (keys: string | string[]) => void;
  baseSelectClass: string;
  classFor: (key: string) => string;
  // Alerte
  doubleDecolleteAlerte?: boolean;
};

export function DevantDosSection({
  options,
  decDevantId,
  decDosId,
  decoupeDevantId,
  decoupeDosId,
  tissuDevantId,
  tissuDosId,
  setDecDevantId,
  setDecDosId,
  setDecoupeDevantId,
  setDecoupeDosId,
  setTissuDevantId,
  setTissuDosId,
  getTransfoById,
  getTissuById,
  getRobeNom,
  buildTransfoLabel,
  filterDecoupeDevantOptions,
  filterDecolleteDosOptions,
  filterDecoupeDosOptions,
  filterTissusDevant,
  filterTissusDos,
  hasError,
  clearFieldError,
  baseSelectClass,
  classFor,
  doubleDecolleteAlerte,
}: DevantDosSectionProps) {
  return (
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
                const current = getTransfoById(decoupeDevantId);
                if (
                  current &&
                  typeof current.nb_epaisseurs === "number" &&
                  current.nb_epaisseurs !== nbNew
                ) {
                  setDecoupeDevantId(null);
                }
              }
            }}
          >
            <option value="">Aucun</option>
            {options.tarifs_transformations
              .filter(
                (t) =>
                  t.categorie === "Décolleté devant" &&
                  (!t.epaisseur_ou_option ||
                    !t.epaisseur_ou_option.toLowerCase().includes("boléro"))
              )
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

        {/* Tissu devant */}
        <div className="mb-3">
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
      </div>

      {/* DOS */}
      <div className="border rounded-xl p-4 bg-white">
        <h2 className="font-semibold mb-3">Dos</h2>

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
                const current = getTransfoById(decoupeDosId);
                if (
                  current &&
                  typeof current.nb_epaisseurs === "number" &&
                  current.nb_epaisseurs !== nbNew
                ) {
                  setDecoupeDosId(null);
                }
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

        {/* Alerte double décolleté */}
        {doubleDecolleteAlerte && (
          <div className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded">
            Attention : la présence d&apos;un décolleté devant et d&apos;un
            décolleté dos est déconseillée.
          </div>
        )}
      </div>
    </div>
  );
}
