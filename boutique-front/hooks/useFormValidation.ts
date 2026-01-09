import { useState } from "react";

export function useFormValidation() {
  const [invalidFields, setInvalidFields] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  const hasError = (key: string) => invalidFields.includes(key);

  const clearFieldError = (keys: string | string[]) => {
    const arr = Array.isArray(keys) ? keys : [keys];
    setInvalidFields((prev) => prev.filter((k) => !arr.includes(k)));
  };

  const setErrors = (fields: string[], errorMessage: string | null = null) => {
    setInvalidFields([...new Set(fields)]);
    if (errorMessage) {
      setSaveError(errorMessage);
    }
  };

  const clearErrors = () => {
    setInvalidFields([]);
    setSaveError(null);
  };

  const baseSelectClass = "w-full border rounded px-3 py-2 text-sm";
  const classFor = (key: string) =>
    hasError(key)
      ? `${baseSelectClass} border-red-500 bg-red-50`
      : baseSelectClass;

  return {
    invalidFields,
    saveError,
    hasError,
    clearFieldError,
    setErrors,
    clearErrors,
    baseSelectClass,
    classFor,
    setSaveError,
  };
}
