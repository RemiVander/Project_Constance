import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Espace partenaires",
  description: "Portail B2B pour les boutiques partenaires",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-gray-100">
        <div
          className="min-h-screen flex flex-col"
          style={{
            backgroundImage: "url('/images/background.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "fixed",
          }}
        >
          <header className="bg-white/80 backdrop-blur border-b">
            <div className="max-w-5xl mx-auto flex items-center justify-between py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  C
                </div>
                <div>
                  <p className="font-semibold">Constance</p>
                  <p className="text-xs text-gray-500">
                    Bienvenue sur le site de nos partenaires
                  </p>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 flex items-center justify-center px-4">
            <div className="max-w-4xl w-full bg-white/90 backdrop-blur shadow-xl rounded-2xl p-6 md:p-10">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
