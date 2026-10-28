import {
  DM_Sans,
  Fraunces,
  IBM_Plex_Sans,
  Inter,
  Libre_Franklin,
  Manrope,
  Nunito_Sans,
  Plus_Jakarta_Sans,
  Source_Sans_3,
  Space_Grotesk,
} from "next/font/google";

export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

export const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});

export const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-sans",
  weight: ["400", "500", "600", "700"],
});

export const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ibm-plex",
  weight: ["400", "500", "600", "700"],
});

export const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito-sans",
});

export const libreFranklin = Libre_Franklin({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-libre-franklin",
  weight: ["400", "500", "600", "700"],
});

export const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

export const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space-grotesk",
});

export const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});

export const fontVariables = [
  inter.variable,
  dmSans.variable,
  plusJakartaSans.variable,
  sourceSans.variable,
  ibmPlex.variable,
  nunitoSans.variable,
  libreFranklin.variable,
  manrope.variable,
  spaceGrotesk.variable,
  fraunces.variable,
].join(" ");
