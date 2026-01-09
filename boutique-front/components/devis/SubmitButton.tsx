"use client";

type SubmitButtonProps = {
  saving: boolean;
  mode: "create" | "edit";
  label?: {
    saving?: string;
    edit?: string;
    create?: string;
  };
  disabled?: boolean;
  onClick: () => void;
};

export function SubmitButton({
  saving,
  mode,
  label,
  disabled = false,
  onClick,
}: SubmitButtonProps) {
  const defaultLabels = {
    saving: mode === "edit" ? "Mise à jour…" : "Création…",
    edit: "Enregistrer les modifications",
    create: "Créer le devis",
  };

  const labels = { ...defaultLabels, ...label };

  return (
    <div className="border rounded-xl p-6 bg-white flex flex-col items-center gap-2 mt-6">
      <button
        type="button"
        disabled={saving || disabled}
        onClick={onClick}
        className="mt-2 inline-flex justify-center bg-gray-900 text-white text-sm font-semibold px-6 py-2 rounded-full disabled:opacity-50"
      >
        {saving ? labels.saving : mode === "edit" ? labels.edit : labels.create}
      </button>
    </div>
  );
}
