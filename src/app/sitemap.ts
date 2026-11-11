import type { MetadataRoute } from "next";
import { BRAND } from "@/config/brand";

export const ROUTES = ["", "/routes", "/withdrawals", "/track", "/journeys", "/method", "/token"];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((p) => ({ url: `${BRAND.url}${p}` }));
}
