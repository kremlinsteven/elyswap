/*
 * Every brand image the site shows, in one place. All are built from referensi/tools/make-assets.mjs until the owner sends a logo (then referensi/tools/apply-owner-assets.mjs):
 * mark = trimmed transparent logo (header/footer), markTile = the owner's square logo, og = the owner's banner on a 1200x630 card.
 */
export const ASSETS = {
  mark: "/brand/mark.webp",
  markTile: "/brand/mark-tile.webp",
  og: "/brand/og.jpg",
} as const;
