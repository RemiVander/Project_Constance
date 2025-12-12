"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { BoutiqueNavbar } from "@/components/BoutiqueNavbar";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function guard() {
      try {
        const me = await apiFetch("/api/boutique/me");

        if (me?.doit_changer_mdp && pathname !== "/profil") {
          router.replace("/profil");
          return;
        }

        setReady(true);
      } catch {
        router.replace("/login");
      }
    }

    guard();
  }, [router, pathname]);

  if (!ready) return null;

  return (
    <>
      <div className="sticky top-0 z-50">
        <BoutiqueNavbar />
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </>
  );
}
