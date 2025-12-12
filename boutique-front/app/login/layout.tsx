import "../globals.css";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-gray-100">
        <div
          className="min-h-screen flex items-center justify-center px-4"
          style={{
            backgroundImage: "url('/images/background.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            backgroundAttachment: "fixed",
          }}
        >
          <div className="bg-white/70 min-h-screen w-full flex items-center justify-center">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
