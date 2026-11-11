import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { JsonLd } from "@/components/JsonLd";
import { ChainProvider } from "@/components/providers/ChainProvider";
import { Reveal } from "@/components/site/Reveal";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { WalletModalProvider } from "@/components/wallet/WalletButton";
import { WalletProvider } from "@/components/wallet/WalletProvider";
import { ASSETS } from "@/config/assets";
import { BRAND } from "@/config/brand";
import { HOME_DESCRIPTION, HOME_TITLE, siteLd } from "@/lib/seo";

// Inter (body), Geist (headings) and Geist Mono (figures): all OFL, self-hosted variable files.
const body = localFont({ src: [{ path: "../fonts/inter-latin-wght-normal.woff2", weight: "100 900", style: "normal" }], variable: "--font-body", display: "swap" });
const head = localFont({ src: [{ path: "../fonts/Geist-Variable.woff2", weight: "100 900", style: "normal" }], variable: "--font-head", display: "swap" });
const mono = localFont({ src: [{ path: "../fonts/GeistMono-Variable.woff2", weight: "100 900", style: "normal" }], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: { default: HOME_TITLE, template: `%s | ${BRAND.name}` },
  description: HOME_DESCRIPTION,
  applicationName: BRAND.name,
  openGraph: { type: "website", siteName: BRAND.name, title: HOME_TITLE, description: HOME_DESCRIPTION, images: [{ url: ASSETS.og, width: 1200, height: 630, alt: `${BRAND.name}: ${BRAND.slogan}` }] },
  twitter: { card: "summary_large_image", site: BRAND.xHandle, title: HOME_TITLE, description: HOME_DESCRIPTION, images: [ASSETS.og] },
};

export const viewport: Viewport = { themeColor: "#000000", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${head.variable} ${mono.variable}`}>
      <body>
        <noscript>
          <style>{".rv{opacity:1!important;transform:none!important}"}</style>
        </noscript>
        <JsonLd data={siteLd} />
        <WalletProvider>
          <WalletModalProvider>
            <ChainProvider>
              <SiteHeader />
              <main id="main">{children}</main>
              <SiteFooter />
              <Reveal />
            </ChainProvider>
          </WalletModalProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
