"use client";

import { OptionsResponse } from "@/hooks/useDevisOptions";

type DentelleSectionProps = {
  options: OptionsResponse;
  dentelleChoice: string;
  setDentelleChoice: (val: string) => void;
  hasError: (key: string) => boolean;
  clearFieldError: (keys: string | string[]) => void;
  classFor: (key: string) => string;
};

export function DentelleSection({
  options,
  dentelleChoice,
  setDentelleChoice,
  clearFieldError,
  classFor,
}: DentelleSectionProps) {
  return (
    <div className="border rounded-xl p-4 bg-white">
      <h2 className="font-semibold mb-3">Dentelle</h2>
      <label className="block text-sm font-medium mb-1">
        Choix de la dentelle
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
        <option value="">-- Sélectionnez --</option>
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
  );
}
