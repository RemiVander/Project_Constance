"use client";

import { OptionsResponse } from "@/hooks/useDevisOptions";
import { ManchesSection } from "./ManchesSection";
import { DentelleSection } from "./DentelleSection";

type TopUniqueSectionProps = {
  options: OptionsResponse;
  // États
  decDevantId: number | null;
  decDosId: number | null;
  decoupeDevantId: number | null;
  decoupeDosId: number | null;
  manchesId: number | null;
  tissuManchesId: number | null;
  dentelleChoice: string;
  topCeintre: string;
  // Setters
  setDecDevantId: (id: number | null) => void;
  setDecDosId: (id: number | null) => void;
  setDecoupeDevantId: (id: number | null) => void;
  setDecoupeDosId: (id: number | null) => void;
  setManchesId: (id: number | null) => void;
  setTissuManchesId: (id: number | null) => void;
  setDentelleChoice: (val: string) => void;
  setTopCeintre: (val: string) => void;
  // Helpers
  getTransfoById: (id: number | null) => any;
  getTissuById: (id: number | null) => any;
  getRobeNom: (robeId: number | null) => string;
  buildTransfoLabel: (t: any) => string;
  // Filtres
  filterDecoupeDevantOptions: () => any[];
  filterDecolleteDosOptions: () => any[];
  filterDecoupeDosOptions: () => any[];
  filterTissusManches: () => any[];
  // Validation
  hasError: (key: string) => boolean;
  clearFieldError: (keys: string | string[]) => void;
  baseSelectClass: string;
  classFor: (key: string) => string;
  // Alerte
  doubleDecolleteAlerte?: boolean;
};

export function TopUniqueSection({
  options,
  decDevantId,
  decDosId,
  decoupeDevantId,
  decoupeDosId,
  manchesId,
  tissuManchesId,
  dentelleChoice,
  topCeintre,
  setDecDevantId,
  setDecDosId,
  setDecoupeDevantId,
  setDecoupeDosId,
  setManchesId,
  setTissuManchesId,
  setDentelleChoice,
  setTopCeintre,
  getTransfoById,
  getTissuById,
  getRobeNom,
  buildTransfoLabel,
  filterDecoupeDevantOptions,
  filterDecolleteDosOptions,
  filterDecoupeDosOptions,
  filterTissusManches,
  hasError,
  clearFieldError,
  baseSelectClass,
  classFor,
  doubleDecolleteAlerte,
}: TopUniqueSectionProps) {
  return (
    <div className="space-y-6">
      {/* Devant/Dos - mais sans tissus */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* DEVANT */}
        <div className="border rounded-xl p-4 bg-white">
          <h2 className="font-semibold mb-3">Devant</h2>
          {/* Décolleté devant */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">
              Décolleté devant
            </label>
            <select
              className={classFor("decDevant")}
              value={decDevantId ?? ""}
              onChange={(e) => {
                const newId = e.target.value ? Number(e.target.value) : null;
                setDecDevantId(newId);
                clearFieldError(["decDevant", "decoupeDevant"]);
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
            <label className="block text-sm font-medium mb-1">
              Découpe devant
            </label>
            <select
              className={classFor("decoupeDevant")}
              value={decoupeDevantId ?? ""}
              onChange={(e) => {
                setDecoupeDevantId(
                  e.target.value ? Number(e.target.value) : null
                );
                clearFieldError("decoupeDevant");
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
              className={classFor("decDos")}
              value={decDosId ?? ""}
              onChange={(e) => {
                const newId = e.target.value ? Number(e.target.value) : null;
                setDecDosId(newId);
                clearFieldError(["decDos", "decoupeDos"]);
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
            <label className="block text-sm font-medium mb-1">
              Découpe dos
            </label>
            <select
              className={classFor("decoupeDos")}
              value={decoupeDosId ?? ""}
              onChange={(e) => {
                setDecoupeDosId(
                  e.target.value ? Number(e.target.value) : null
                );
                clearFieldError("decoupeDos");
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
          {doubleDecolleteAlerte && (
            <div className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded">
              Attention : la présence d&apos;un décolleté devant et d&apos;un
              décolleté dos est déconseillée.
            </div>
          )}
        </div>
      </div>

      {/* Top ceintré */}
      <div className="border rounded-xl p-4 bg-white">
        <h2 className="font-semibold mb-3">Configuration top unique</h2>
        <div>
          <label className="block text-sm font-medium mb-1">
            Top ceintré
          </label>
          <select
            className={baseSelectClass}
            value={topCeintre}
            onChange={(e) => {
              setTopCeintre(e.target.value);
            }}
          >
            <option value="">-- Sélectionnez --</option>
            <option value="oui">Oui</option>
            <option value="non">Non</option>
          </select>
        </div>
      </div>

      {/* Manches + Dentelle */}
      <div className="grid md:grid-cols-2 gap-6">
        <ManchesSection
          options={options}
          manchesId={manchesId}
          tissuManchesId={tissuManchesId}
          setManchesId={setManchesId}
          setTissuManchesId={setTissuManchesId}
          getTransfoById={getTransfoById}
          buildTransfoLabel={buildTransfoLabel}
          filterTissusManches={filterTissusManches}
          hasError={hasError}
          clearFieldError={clearFieldError}
          baseSelectClass={baseSelectClass}
          classFor={classFor}
        />
        <DentelleSection
          options={options}
          dentelleChoice={dentelleChoice}
          setDentelleChoice={setDentelleChoice}
          hasError={hasError}
          clearFieldError={clearFieldError}
          classFor={classFor}
        />
      </div>
    </div>
  );
}
