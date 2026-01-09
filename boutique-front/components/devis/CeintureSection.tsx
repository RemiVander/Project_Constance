"use client";

type ComboTaille =
  | "AUCUNE"
  | "CEINTURE_ECHANTRE_DOS"
  | "CEINTURE_SEULE"
  | "REMONT_DEVANT_ECHANTRE_DOS"
  | "REMONT_DEVANT_SEULE"
  | "ECHANCRE_DOS_SEUL";

type CeintureSectionProps = {
  comboTaille: ComboTaille;
  setComboTaille: (val: ComboTaille) => void;
  baseSelectClass: string;
};

export function CeintureSection({
  comboTaille,
  setComboTaille,
  baseSelectClass,
}: CeintureSectionProps) {
  return (
    <div className="mt-6">
      <div className="border rounded-xl p-4 bg-white">
        <h2 className="font-semibold mb-3">
          Découpe taille devant et dos / <span className="font-bold">Ceinture</span>
        </h2>
        <div>
          <select
            id="select-decoupe-taille"
            className={baseSelectClass}
            value={comboTaille}
            onChange={(e) =>
              setComboTaille(e.target.value as ComboTaille)
            }
          >
            <option value="AUCUNE">Aucune</option>
            <option value="CEINTURE_ECHANTRE_DOS">
              Ceinture + échancré dos
            </option>
            <option value="CEINTURE_SEULE">Ceinture droite devant + dos</option>
            <option value="REMONT_DEVANT_ECHANTRE_DOS">
              Remonté devant + échancré dos
            </option>
            <option value="REMONT_DEVANT_SEULE">Remonté devant seul</option>
            <option value="ECHANCRE_DOS_SEUL">Échancré dos seul</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export type { ComboTaille };
