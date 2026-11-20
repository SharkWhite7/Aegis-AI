import type { Metadata, Viewport } from "next";
import { Archivo, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

import SmoothScroll from "@/lib/motion/SmoothScroll";
import Nav from "@/components/chrome/Nav";
import StatusBar from "@/components/chrome/StatusBar";
import Texture from "@/components/chrome/Texture";
import ColumnGuides from "@/components/chrome/ColumnGuides";
import Frame from "@/components/chrome/Frame";
import { SITE } from "@/lib/site";

/* Display face: Archivo's variable width axis gives a real condensed cut
   instead of a horizontally squashed one. */
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0a0c0d",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${instrument.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <a
          href="#main"
          className="t-label sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:bg-magenta focus:px-3 focus:py-2 focus:text-ink"
        >
          Skip to content
        </a>

        {/* The site's chrome is handed to Frame rather than rendered
            here, so app routes under /console can leave it out. See
            components/chrome/Frame.tsx. */}
        <Frame
          siteBefore={
            <>
              <SmoothScroll />
              <Nav />
            </>
          }
          siteAfter={
            <>
              <StatusBar />
              <ColumnGuides />
              <Texture />
            </>
          }
        >
          {children}
        </Frame>
      </body>
    </html>
  );
}
