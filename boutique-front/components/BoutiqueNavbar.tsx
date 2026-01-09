"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Me = {
  id: number;
  nom: string;
  email: string;
};

const navLinks = [
  { href: "/dashboard", label: "Accueil" },
  { href: "/devis/nouveau", label: "Nouveau devis" },
  { href: "/devis/suivi", label: "Suivi devis" },
  { href: "/bons-commande", label: "Bons de commande" },
  { href: "/profil", label: "Profil" },
  { href: "/cgv", label: "CGV" },
];

export function BoutiqueNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = (await apiFetch("/api/boutique/me")) as Me;
        setMe(data);
      } catch (e: any) {
        if (e?.message?.includes("401")) {
          // si pas connecté : on laisse la page gérer, ou on redirige
          // router.replace("/login");
        }
      }
    }
    load();
  }, []);

  async function handleLogout() {
    try {
      await apiFetch("/api/boutique/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.replace("/login");
  }

  return (
    <header className="bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 lg:px-6 py-3 flex items-center justify-between gap-4">
        {/* Gauche : texte seulement */}
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">
            Espace partenaire Constance Cellier
          </div>
          {me && (
            <div className="text-[11px] text-slate-500 truncate">
              Connecté en tant que <span className="font-medium">{me.nom}</span>
            </div>
          )}
        </div>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-2 text-sm">
          {navLinks.map((link) => {
            const active =
              pathname === link.href ||
              (pathname && pathname.startsWith(link.href + "/"));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  "px-3 py-1 rounded-full transition whitespace-nowrap " +
                  (active
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-100")
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Droite */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1 rounded-full bg-slate-900 text-white hover:bg-black"
          >
            Déconnexion
          </button>
        </div>
      </div>

      {/* Nav mobile */}
      <nav className="md:hidden border-t border-slate-200 bg-white px-2 py-2 flex flex-wrap gap-2 text-xs">
        {navLinks.map((link) => {
          const active =
            pathname === link.href ||
            (pathname && pathname.startsWith(link.href + "/"));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                "px-2 py-1 rounded-full transition " +
                (active
                  ? "bg-slate-900 text-white"
                  : "bg-slate-50 text-slate-700")
              }
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
