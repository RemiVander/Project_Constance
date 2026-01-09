"use client";

import { TransformationTarif, TissuTarif, OptionsResponse } from "@/hooks/useDevisOptions";

type ManchesSectionProps = {
  options: OptionsResponse;
  manchesId: number | null;
  tissuManchesId: number | null;
  setManchesId: (id: number | null) => void;
  setTissuManchesId: (id: number | null) => void;
  getTransfoById: (id: number | null) => TransformationTarif | null;
  buildTransfoLabel: (t: TransformationTarif) => string;
  getRobeNom?: (robeId: number | null) => string;
  filterTissusManches: () => TissuTarif[];
  hasError: (key: string) => boolean;
  clearFieldError: (keys: string | string[]) => void;
  baseSelectClass: string;
  classFor: (key: string) => string;
};

export function ManchesSection({
  options,
  manchesId,
  tissuManchesId,
  setManchesId,
  setTissuManchesId,
  buildTransfoLabel,
  getRobeNom,
  filterTissusManches,
  clearFieldError,
  baseSelectClass,
  classFor,
}: ManchesSectionProps) {
  return (
    <div className="border rounded-xl p-4 bg-white">
      <h2 className="font-semibold mb-3">Manches</h2>

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
      {manchesId && (
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
              const robeNom = getRobeNom ? getRobeNom(t.robe_modele_id) : "";
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
  );
}
