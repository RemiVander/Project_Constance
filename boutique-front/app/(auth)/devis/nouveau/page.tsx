import Link from "next/link";

export default function NouveauDevisChoixPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Nouveau devis</h1>
      <p className="text-sm text-gray-600">
        Que souhaitez-vous créer ?
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <Link
          href="/devis/nouveau/robe"
          className="block border rounded-xl p-4 bg-white shadow hover:shadow-md transition-shadow text-center"
        >
          <h2 className="font-semibold mb-1">Devis robe complète</h2>
          <p className="text-sm text-gray-600">
            Décolleté, découpes, bas, tissus, finitions… configuration
            complète de la robe.
          </p>
        </Link>

        <Link
          href="/devis/nouveau/bolero"
          className="block border rounded-xl p-4 bg-white shadow hover:shadow-md transition-shadow text-center"
        >
          <h2 className="font-semibold mb-1">Devis boléro seul</h2>
          <p className="text-sm text-gray-600">
            Boléro seul : devant, dos et manches en dentelle.
          </p>
        </Link>
      </div>
    </div>
  );
}

