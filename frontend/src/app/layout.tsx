import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import SplashScreen from "@/components/SplashScreen";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Fon Güven & Şeffaflık Platformu | TÜBİTAK 2209-A",
  description:
    "Kişisel Finans, Yatırım Fonları, Finansal Şeffaflık ve Fonlara Güven Platformu (TÜBİTAK 2209-A Araştırma Projesi)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <SplashScreen />
        <AppShell>{children}</AppShell>
        <Footer />
      </body>
    </html>
  );
}
