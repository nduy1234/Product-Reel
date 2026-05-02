import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProductReel AI — Agentic Video Ad Engine",
  description:
    "Convert a product image + 1-line description into a ready-to-publish marketing video using the BytePlus Seed ecosystem.",
  keywords: [
    "AI video",
    "product marketing",
    "TikTok ads",
    "Instagram Reels",
    "BytePlus Seed",
    "Seedance",
  ],
  openGraph: {
    title: "ProductReel AI",
    description: "Agentic content engine powered by BytePlus Seed models",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-surface antialiased">{children}</body>
    </html>
  );
}
