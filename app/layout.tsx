import type { Metadata } from "next";
import { Literata, Noto_Serif_Devanagari } from "next/font/google";
import "./globals.css";

const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
});

const devanagari = Noto_Serif_Devanagari({
  subsets: ["devanagari"],
  weight: ["500", "600"],
  variable: "--font-devanagari",
});

export const metadata: Metadata = {
  title: "कथा — Histórias com o seu vocabulário",
  description: "Marque palavras de sânscrito e peça uma história, um poema ou um haiku em português.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt" className={`${literata.variable} ${devanagari.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
