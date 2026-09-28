import type { Metadata, Viewport } from "next";
import {
  DM_Sans,
  Fraunces,
  IBM_Plex_Sans,
  Libre_Franklin,
  Manrope,
  Nunito_Sans,
  Source_Sans_3,
  Space_Grotesk,
} from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-sans",
  weight: ["400", "500", "600", "700"],
});

const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ibm-plex",
  weight: ["400", "500", "600", "700"],
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito-sans",
  weight: ["400", "500", "600", "700"],
});

const libreFranklin = Libre_Franklin({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-libre-franklin",
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700"],
});

const fontVariables = [
  dmSans.variable,
  sourceSans.variable,
  ibmPlex.variable,
  nunitoSans.variable,
  libreFranklin.variable,
  manrope.variable,
  spaceGrotesk.variable,
  fraunces.variable,
].join(" ");

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
    { media: "(prefers-color-scheme: light)", color: "#F3FBF3" },
    { media: "(prefers-color-scheme: dark)", color: "#101A12" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <body className="min-h-[100dvh] font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
