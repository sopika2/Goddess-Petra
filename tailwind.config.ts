import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // "Evidence file" palette — tweak here to restyle the whole site.
        ink: "#0B0A0D", // near-black page bg
        surface: "#120E13", // panels
        "surface-2": "#1A1419",
        line: "#3A2F36", // borders
        accent: "#FF2E88", // hot pink (primary)
        "accent-soft": "#FF73B5",
        muted: "#a7969f", // secondary text (AA on ink)
        evidence: "#F4C400", // caution-tape yellow
        manila: "#E8B53A", // evidence-folder manila
        blood: "#C8102E", // danger / threat red
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
        typewriter: ["var(--font-typewriter)", "ui-monospace", "monospace"],
        hand: ["var(--font-hand)", "ui-serif", "cursive"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 28px -6px rgba(255,46,136,0.55)",
        stamp: "3px 3px 0 #7A1640",
        folder: "6px 6px 0 rgba(0,0,0,0.45)",
        slab: "0 4px 0 #7A0A1D",
      },
    },
  },
  plugins: [],
};

export default config;
