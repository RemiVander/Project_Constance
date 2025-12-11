"use client";

import React from "react";

type StatusType = "devis" | "bon_commande";

type Props = {
  type: StatusType;
  statut: string; 
};

const BASE_CLASS =
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium";

const STYLES: Record<
  StatusType,
  Record<
    string,
    {
      label: string;
      className: string;
    }
  >
> = {
  devis: {
    EN_COURS: {
      label: "En cours",
      className: `${BASE_CLASS} bg-sky-100 text-sky-800`,
    },
    ACCEPTE: {
      label: "Accepté",
      className: `${BASE_CLASS} bg-emerald-100 text-emerald-800`,
    },
    REFUSE: {
      label: "Refusé",
      className: `${BASE_CLASS} bg-rose-100 text-rose-700`,
    },
  },
  bon_commande: {
    EN_ATTENTE_VALIDATION: {
      label: "En attente de validation",
      className: `${BASE_CLASS} bg-sky-100 text-sky-800`,
    },
    A_MODIFIER: {
      label: "À modifier",
      className: `${BASE_CLASS} bg-amber-100 text-amber-800`,
    },
    VALIDE: {
      label: "Validé",
      className: `${BASE_CLASS} bg-emerald-100 text-emerald-800`,
    },
    REFUSE: {
      label: "Refusé",
      className: `${BASE_CLASS} bg-rose-100 text-rose-700`,
    },
  },
};

export function StatusBadge({ type, statut }: Props) {
  const conf = STYLES[type][statut];

  if (!conf) {
    return (
      <span className={`${BASE_CLASS} bg-gray-100 text-gray-700`}>
        {statut}
      </span>
    );
  }

  return <span className={conf.className}>{conf.label}</span>;
}
