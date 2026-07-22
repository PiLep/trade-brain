import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trade Brain — Portfolio & Signals",
  description:
    "Track your assets and get transparent, technical-analysis-based buy / hold / sell signals.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" data-theme="dark">
      <body className="bg-plane text-ink font-sans antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
