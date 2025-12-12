import { BoutiqueNavbar } from "@/components/BoutiqueNavbar";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="sticky top-0 z-50">
        <BoutiqueNavbar />
      </div>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {children}
      </main>
    </>
  );
}
