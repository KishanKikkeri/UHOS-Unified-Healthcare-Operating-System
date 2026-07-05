import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "UHOS — District Command Center",
  description: "Unified Healthcare Operating System — Pulse AI district monitoring.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-base font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
