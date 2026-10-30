import { IBM_Plex_Sans, Inter } from "next/font/google";

/*
 * Only static Google fonts are loaded. Variable ones requested with fixed weights (DM Sans,
 * Plus Jakarta Sans, Manrope, …) come back as /l/font?kit= URLs that Turbopack and Vercel
 * builds fail to resolve.
 */

/** UI font — clear figures and labels for data-dense planning screens. */
export const ibmPlex = IBM_Plex_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ibm-plex",
  weight: ["400", "500", "600", "700"],
});

/** Fallback / alternative in the font picker. */
export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

export const fontVariables = [ibmPlex.variable, inter.variable].join(" ");
