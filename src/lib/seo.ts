import type { Metadata } from "next";
import { BRAND, CHAIN, hasGithub } from "@/config/brand";
import { ASSETS } from "@/config/assets";

export const HOME_TITLE = `${BRAND.name} | ${BRAND.slogan}`;
export const HOME_DESCRIPTION = `Elysium's canonical bridge back to HyperEVM waits about five and a half days before a withdrawal can be claimed. ${BRAND.name} compares that wait with faster routes (their fees, measured times and the trust they add), tracks your canonical withdrawal and claims it on HyperEVM when it is ready.`;

/**
 * Per-route metadata in one shape: a unique title, a description written for
 * the search result, a canonical URL on the production domain, and matching
 * Open Graph / X cards with the share card built from the owner banner (ASSETS.og).
 */
export function pageMeta({
  path,
  title,
  description,
  noindex = false,
  type = "website",
}: {
  path: string;
  title: string;
  description: string;
  noindex?: boolean;
  type?: "website" | "article";
}): Metadata {
  const url = `${BRAND.url}${path === "/" ? "" : path}`;
  const images = [{ url: ASSETS.og, width: 1200, height: 630, alt: `${BRAND.name}: ${BRAND.slogan}`, type: "image/webp" }];
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { type, url, siteName: BRAND.name, title, description, locale: "en_US", images },
    twitter: { card: "summary_large_image", site: BRAND.xHandle, creator: BRAND.xHandle, title, description, images: [{ url: ASSETS.og, alt: `${BRAND.name}: ${BRAND.slogan}` }] },
    robots: noindex ? { index: false, follow: true } : undefined,
  };
}

export type Crumb = { name: string; path: string };

export function breadcrumbLd(trail: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${BRAND.url}${c.path === "/" ? "" : c.path}`,
    })),
  };
}

export function faqLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.q, acceptedAnswer: { "@type": "Answer", text: i.a } })),
  };
}

export const siteLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${BRAND.url}/#org`,
    name: BRAND.name,
    url: BRAND.url,
    logo: `${BRAND.url}/icon.png`,
    // Only real profiles: the GitHub link joins once the public repository exists.
    sameAs: [BRAND.x, ...(hasGithub ? [BRAND.github] : [])],
    description: BRAND.description,
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BRAND.url}/#site`,
    name: BRAND.name,
    url: BRAND.url,
    inLanguage: "en",
    publisher: { "@id": `${BRAND.url}/#org` },
  },
];

export const appLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: BRAND.name,
  url: BRAND.url,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any (web browser)",
  description: `Route planner, canonical withdrawal tracker with HyperEVM claim, hop tracker and journey journal for HYPE leaving ${CHAIN.name}.`,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@id": `${BRAND.url}/#org` },
};

/** Serialise JSON-LD for a script tag; "<" is escaped so a value can never close the tag. */
export function ldJson(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
