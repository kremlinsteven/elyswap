import type { MetadataRoute } from "next";
import { BRAND } from "@/config/brand";

export const ROUTES = ["", "/pools", "/plan", "/positions", "/alerts", "/book", "/method", "/token"];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((p) => ({ url: `${BRAND.url}${p}` }));
}
