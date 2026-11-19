export const SITE = {
  name: "VICE AI",
  tagline: "Your World. Your AI. Your Story.",
  build: "0.1.0",
  stage: "PRE-ALPHA",
  // Miami. Where the fiction lives.
  coords: "25.7617° N / 80.1918° W",
  description:
    "An AI companion that runs beside the game, not inside it. It talks while you drive, remembers what you did last night, and never gives you the same session twice.",
} as const;

export const NAV = [
  { n: "01", label: "Co-Pilot", href: "#co-pilot" },
  { n: "02", label: "Missions", href: "#missions" },
  { n: "03", label: "Audio", href: "#audio" },
  { n: "04", label: "Memory", href: "#memory" },
  { n: "05", label: "Market", href: "#market" },
] as const;
