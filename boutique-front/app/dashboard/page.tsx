"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch("/api/boutique/me");
        setMe(data);
      } catch {
        router.push("/login");
      }
    }
    load();
  }, []);

  if (!me) return <p>Chargement...</p>;

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold">Bonjour, {me.nom}</h1>

      <div className="grid md:grid-cols-3 gap-4">
        <button
          onClick={() => router.push("/devis/nouveau")}
          className="bg-white border rounded-xl p-4 shadow hover:shadow-md"
        >
          <h2 className="font-semibold">Créer un devis</h2>
          <p className="text-sm text-gray-500">
            Construit une robe personnalisée.
          </p>
        </button>

        <button
          onClick={() => router.push("/devis/suivi")}
          className="bg-white border rounded-xl p-4 shadow hover:shadow-md"
        >
          <h2 className="font-semibold">Suivre un devis</h2>
          <p className="text-sm text-gray-500">
            Voir vos devis en cours.
          </p>
        </button>

        <button
          onClick={() => router.push("/historique")}
          className="bg-white border rounded-xl p-4 shadow hover:shadow-md"
        >
          <h2 className="font-semibold">Mon historique</h2>
          <p className="text-sm text-gray-500">
            Vos devis passés et confirmés.
          </p>
        </button>
      </div>
    </div>
  );
}
