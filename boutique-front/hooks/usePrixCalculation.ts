import { useMemo } from "react";
import { OptionsResponse, TransformationTarif, TissuTarif } from "./useDevisOptions";

type PrixCalculationInput = {
  options: OptionsResponse | null;
  transformations?: {
    decDevantId?: number | null;
    decDosId?: number | null;
    decoupeDevantId?: number | null;
    decoupeDosId?: number | null;
    manchesId?: number | null;
    basId?: number | null;
  };
  tissus?: {
    tissuDevantId?: number | null;
    tissuDosId?: number | null;
    tissuManchesId?: number | null;
    tissuBasId?: number | null;
  };
  finitionsIds?: number[];
  accessoiresIds?: number[];
  comboTaille?: string;
  getTransfoById: (id: number | null) => TransformationTarif | null;
  getTissuById: (id: number | null) => TissuTarif | null;
};

export function usePrixCalculation(input: PrixCalculationInput) {
  const {
    options,
    transformations = {},
    tissus = {},
    finitionsIds = [],
    accessoiresIds = [],
    comboTaille,
    getTransfoById,
    getTissuById,
  } = input;

  const coutInterneTotal = useMemo(() => {
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

    // Transformations
    if (transformations.decDevantId) addT(transformations.decDevantId);
    if (transformations.decDosId) addT(transformations.decDosId);
    if (transformations.decoupeDevantId) addT(transformations.decoupeDevantId);
    if (transformations.decoupeDosId) addT(transformations.decoupeDosId);
    if (transformations.manchesId) addT(transformations.manchesId);
    if (transformations.basId) addT(transformations.basId);

    // Ceinture / Découpe taille
    if (comboTaille && comboTaille !== "AUCUNE") {
      const ceintureTransfo = options.tarifs_transformations.find(
        (t) => t.categorie === "Ceinture"
      );
      const remontDevantTransfo = options.tarifs_transformations.find(
        (t) =>
          t.categorie === "Découpe taille devant et dos" &&
          t.epaisseur_ou_option === "Remonté devant"
      );
      const echancreDosTransfo = options.tarifs_transformations.find(
        (t) =>
          t.categorie === "Découpe taille devant et dos" &&
          t.epaisseur_ou_option === "Échancré dos"
      );

      switch (comboTaille) {
        case "CEINTURE_ECHANTRE_DOS":
          if (ceintureTransfo) total += ceintureTransfo.prix;
          if (echancreDosTransfo) total += echancreDosTransfo.prix;
          break;
        case "CEINTURE_SEULE":
          if (ceintureTransfo) total += ceintureTransfo.prix;
          break;
        case "REMONT_DEVANT_ECHANTRE_DOS":
          if (remontDevantTransfo) total += remontDevantTransfo.prix;
          if (echancreDosTransfo) total += echancreDosTransfo.prix;
          break;
        case "REMONT_DEVANT_SEULE":
          if (remontDevantTransfo) total += remontDevantTransfo.prix;
          break;
        case "ECHANCRE_DOS_SEUL":
          if (echancreDosTransfo) total += echancreDosTransfo.prix;
          break;
      }
    }

    // Tissus
    if (tissus.tissuDevantId) addTi(tissus.tissuDevantId);
    if (tissus.tissuDosId) addTi(tissus.tissuDosId);
    if (tissus.tissuManchesId) addTi(tissus.tissuManchesId);
    if (tissus.tissuBasId) addTi(tissus.tissuBasId);

    // Finitions supplémentaires
    for (const id of finitionsIds) {
      const f = options.finitions_supplementaires?.find((x) => x.id === id);
      if (f) total += f.prix;
    }

    // Accessoires
    for (const id of accessoiresIds) {
      const a = options.accessoires?.find((x) => x.id === id);
      if (a) total += a.prix;
    }

    // Housse (toujours incluse)
    const housse = options.accessoires?.find((a) =>
      a.nom.toLowerCase().includes("housse")
    );
    if (housse) total += housse.prix;

    return total;
  }, [
    options,
    transformations,
    tissus,
    finitionsIds,
    accessoiresIds,
    comboTaille,
    getTransfoById,
    getTissuById,
  ]);

  return { coutInterneTotal };
}
