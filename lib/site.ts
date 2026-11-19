export const SITE = {
  name: "AEGIS AI",
  tagline: "Your World. Your AI. Your Story.",
  build: "0.1.0",
  stage: "PRE-ALPHA",
  // Miami. Where the fiction lives.
  coords: "25.7617° N / 80.1918° W",
  description:
    "An AI companion that runs beside the game, not inside it. It talks while you drive, remembers what you did last night, and never gives you the same session twice.",
} as const;

export const NAV = [
  { n: "01", label: "Premise", href: "#premise" },
  { n: "02", label: "Co-Pilot", href: "#co-pilot" },
  { n: "03", label: "Your Game", href: "#your-game" },
  { n: "04", label: "The Session", href: "#session" },
  { n: "05", label: "Marketplace", href: "#market" },
  { n: "06", label: "Access", href: "#access" },
] as const;
