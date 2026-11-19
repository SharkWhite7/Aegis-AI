/**
 * Title normalisation.
 *
 * Must stay byte-identical in behaviour to `norm()` in the site's
 * lib/profiles.ts — lowercase, drop everything that is not a letter or a
 * digit — so a title typed on the marketing site and the same title typed
 * in the app resolve to one shared profile. If the two drift, the product
 * generates the same game twice and the reuse economics quietly break.
 */
export const slugify = (title: string): string =>
  title.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Titles too short to be a game. Guards the generator against junk input. */
export const isSlugUsable = (slug: string): boolean => slug.length >= 2;
