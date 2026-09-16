import type { Metadata, Viewport } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SPX Farm OS",
  description: "Estate operating system — from field tickets to settlement for Silva, SPX, and vendors",
  authors: [{ name: "SPX Farm OS" }],
  applicationName: "SPX Farm OS",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SPX Farm OS",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "SPX Farm OS",
    description: "Govern, manage, and execute estate instruments with clear firewalls",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@SPXFarmOS",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f7f4" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1714" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <body className="min-h-[100dvh] font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
