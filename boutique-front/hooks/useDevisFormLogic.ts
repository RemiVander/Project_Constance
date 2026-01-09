import { useMemo } from "react";
import { OptionsResponse, TransformationTarif, TissuTarif } from "./useDevisOptions";

type UseDevisFormLogicProps = {
  options: OptionsResponse | null;
  decDevantId: number | null;
  decDosId: number | null;
  decoupeDevantId: number | null;
  decoupeDosId: number | null;
  manchesId: number | null;
  basId: number | null;
  tissuDevantId: number | null;
  tissuDosId: number | null;
  tissuManchesId: number | null;
  tissuBasId: number | null;
};

export function useDevisFormLogic({
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
}: UseDevisFormLogicProps) {
  // Helpers
  function getRobeNom(robeId: number | null) {
    if (!options || robeId == null) return "";
    const robe = options.robe_modeles?.find((r) => r.id === robeId);
    return robe ? robe.nom : "";
  }

  function buildTransfoLabel(t: TransformationTarif) {
    const robeNom = getRobeNom(t.robe_modele_id);
    const baseLabel = t.epaisseur_ou_option
      ? `${t.finition ?? ""} – ${t.epaisseur_ou_option}`
      : t.finition ?? "";
    return robeNom ? `[${robeNom}] ${baseLabel}` : baseLabel;
  }

  function getTransfoById(id: number | null) {
    return options?.tarifs_transformations.find((t) => t.id === id) ?? null;
  }

  function getTissuById(id: number | null) {
    return options?.tarifs_tissus?.find((t) => t.id === id) ?? null;
  }

  const decDevant = getTransfoById(decDevantId);
  const decDos = getTransfoById(decDosId);
  const decoupeDevant = getTransfoById(decoupeDevantId);
  const decoupeDos = getTransfoById(decoupeDosId);
  const basTransfo = getTransfoById(basId);

  const tissuDevant = useMemo(
    () => getTissuById(tissuDevantId),
    [tissuDevantId, options]
  );
  const tissuDos = useMemo(
    () => getTissuById(tissuDosId),
    [tissuDosId, options]
  );
  const tissuBas = useMemo(
    () => getTissuById(tissuBasId),
    [tissuBasId, options]
  );

  const nbDecoupeDevant = decoupeDevant?.nb_epaisseurs ?? null;
  const nbDecoupeDos = decoupeDos?.nb_epaisseurs ?? null;

  const doubleDecolleteAlerte = useMemo(
    () => decDevant?.est_decollete && decDos?.est_decollete,
    [decDevant, decDos]
  );

  // Filtres
  function filterDecoupeDevantOptions() {
    let list =
      options?.tarifs_transformations.filter(
        (t) => t.categorie === "Découpe devant"
      ) ?? [];
    const nbDecolleteDevant = decDevant?.nb_epaisseurs;
    if (typeof nbDecolleteDevant === "number") {
      list = list.filter(
        (t) =>
          typeof t.nb_epaisseurs === "number" &&
          t.nb_epaisseurs === nbDecolleteDevant
      );
    }
    return list;
  }

  function filterDecolleteDosOptions() {
    let list =
      options?.tarifs_transformations.filter(
        (t) => t.categorie === "Décolleté dos"
      ) ?? [];
    const nbDev = decDevant?.nb_epaisseurs;
    if (typeof nbDev === "number") {
      list = list.filter(
        (t) =>
          typeof t.nb_epaisseurs === "number" && t.nb_epaisseurs <= nbDev
      );
    }
    return list;
  }

  function filterDecoupeDosOptions() {
    let list =
      options?.tarifs_transformations.filter(
        (t) => t.categorie === "Découpe dos"
      ) ?? [];

    const nbDev = decoupeDevant?.nb_epaisseurs;
    if (typeof nbDev === "number") {
      list = list.filter(
        (t) =>
          typeof t.nb_epaisseurs === "number" && t.nb_epaisseurs <= nbDev
      );
    }

    const nbDecolleteDos = decDos?.nb_epaisseurs;
    if (typeof nbDecolleteDos === "number") {
      list = list.filter(
        (t) =>
          typeof t.nb_epaisseurs === "number" &&
          t.nb_epaisseurs === nbDecolleteDos
      );
    }
    return list;
  }

  function filterTissusManches() {
    let list =
      options?.tarifs_tissus?.filter((t) => t.categorie === "Manches") ?? [];
    
    // Filtrer selon le type de manches choisi (ex: Tulipe -> seulement tissus Tulipe)
    if (manchesId) {
      const manchesTransfo = getTransfoById(manchesId);
      if (manchesTransfo?.finition) {
        const finitionManches = manchesTransfo.finition.toLowerCase().trim();
        list = list.filter((t) => {
          if (!t.forme) return false;
          const formeTissu = t.forme.toLowerCase().trim();
          return formeTissu === finitionManches || 
                 formeTissu.includes(finitionManches) || 
                 finitionManches.includes(formeTissu);
        });
      }
    }
    
    return list;
  }

  function filterTissusBas() {
    let list =
      options?.tarifs_tissus?.filter((t) => t.categorie === "Bas") ?? [];
    
    // Filtrer selon le nombre d'épaisseurs
    const nbBas = basTransfo?.nb_epaisseurs;
    if (nbBas != null) {
      list = list.filter(
        (t) =>
          typeof t.nb_epaisseurs === "number" && t.nb_epaisseurs === nbBas
      );
    }
    
    // Filtrer selon la finition bas choisie (ex: Fourreau -> pas d'évasé)
    if (basTransfo?.finition) {
      const finitionBas = basTransfo.finition.toLowerCase().trim();
      // Si c'est un fourreau, exclure les évasés
      if (finitionBas.includes("fourreau")) {
        list = list.filter((t) => {
          if (!t.forme) return true;
          const formeTissu = t.forme.toLowerCase().trim();
          return !formeTissu.includes("évasé") && !formeTissu.includes("evase");
        });
      }
      // Si c'est un évasé, exclure les fourreaux
      else if (finitionBas.includes("évasé") || finitionBas.includes("evase")) {
        list = list.filter((t) => {
          if (!t.forme) return true;
          const formeTissu = t.forme.toLowerCase().trim();
          return !formeTissu.includes("fourreau");
        });
      }
      // Sinon, essayer de faire correspondre la forme avec la finition
      else {
        list = list.filter((t) => {
          if (!t.forme) return true;
          const formeTissu = t.forme.toLowerCase().trim();
          return formeTissu === finitionBas || 
                 formeTissu.includes(finitionBas) || 
                 finitionBas.includes(formeTissu);
        });
      }
    }
    
    return list;
  }

  function filterTissusDevant() {
    let list =
      options?.tarifs_tissus?.filter(
        (t) => t.categorie && t.categorie.toLowerCase() === "devant"
      ) ?? [];

    if (nbDecoupeDevant != null) {
      list = list.filter(
        (t) =>
          typeof t.nb_epaisseurs === "number" &&
          t.nb_epaisseurs === nbDecoupeDevant
      );
    }
    return list;
  }

  function filterTissusDos() {
    let list =
      options?.tarifs_tissus?.filter((t) => t.categorie === "Dos") ?? [];

    if (nbDecoupeDos != null) {
      list = list.filter(
        (t) =>
          typeof t.nb_epaisseurs === "number" && t.nb_epaisseurs <= nbDecoupeDos
      );
    }

    if (tissuDevant?.nb_epaisseurs != null) {
      const nbDev = tissuDevant.nb_epaisseurs;
      list = list.filter(
        (t) =>
          typeof t.nb_epaisseurs === "number" && t.nb_epaisseurs <= nbDev
      );
    }

    if (tissuDevant && tissuDevant.matiere !== "crepe") {
      list = list.filter((t) => t.matiere !== "crepe");
    }

    return list;
  }

  return {
    getRobeNom,
    buildTransfoLabel,
    getTransfoById,
    getTissuById,
    decDevant,
    decDos,
    decoupeDevant,
    decoupeDos,
    basTransfo,
    tissuDevant,
    tissuDos,
    tissuBas,
    doubleDecolleteAlerte,
    filterDecoupeDevantOptions,
    filterDecolleteDosOptions,
    filterDecoupeDosOptions,
    filterTissusManches,
    filterTissusBas,
    filterTissusDevant,
    filterTissusDos,
  };
}
