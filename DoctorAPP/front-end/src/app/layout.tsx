import type { Metadata } from "next";
import { Geist_Mono, Lato } from "next/font/google";
import "./globals.css";

const lato = Lato({
  variable: "--font-lato",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My HealthPal",
  description: "My HealthPal clinical dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${lato.variable} ${geistMono.variable} antialiased h-full`}
      >
        {/* Liquid Glass Canvas — animated mesh gradient substrate */}
        <div className="liquid-canvas" aria-hidden="true">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
        </div>

        {/* Page content — sits above the canvas */}
        <div className="relative z-0 h-full">
          {children}
        </div>
      </body>
    </html>
  );
}
