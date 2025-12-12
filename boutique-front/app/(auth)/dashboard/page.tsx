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

        if (data?.doit_changer_mdp) {
          router.replace("/profil");
          return;
        }

        setMe(data);
      } catch {
        router.replace("/login");
      }
    }
    load();
  }, [router]);

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
          <p className="text-sm text-gray-500">Construit une robe personnalisée.</p>
        </button>

        <button
          onClick={() => router.push("/devis/suivi")}
          className="bg-white border rounded-xl p-4 shadow hover:shadow-md"
        >
          <h2 className="font-semibold">Suivre un devis</h2>
          <p className="text-sm text-gray-500">Voir vos devis en cours.</p>
        </button>

        <button
          onClick={() => router.push("/bons-commande")}
          className="bg-white border rounded-xl p-4 shadow hover:shadow-md"
        >
          <h2 className="font-semibold">Mes bons de commande</h2>
          <p className="text-sm text-gray-500">
            Suivi des bons de commande et de leur validation.
          </p>
        </button>
      </div>
    </div>
  );
}
