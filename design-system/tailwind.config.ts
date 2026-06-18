import type { Config } from "tailwindcss";

const brandColorUtilities = [
  "ink",
  "surface",
  "surface-2",
  "line",
  "accent",
  "accent-soft",
  "muted",
].flatMap((c) => [`bg-${c}`, `text-${c}`, `border-${c}`]);

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  // Safelist the brand color utilities so a design agent's own layout glue
  // (e.g. bg-surface, text-accent) resolves even though no app file uses it.
  safelist: brandColorUtilities,
  theme: {
    extend: {
      colors: {
        ink: "#0a0a0f",
        surface: "#15131c",
        "surface-2": "#1f1b2b",
        line: "#2a2536",
        accent: "#d6336c",
        "accent-soft": "#f06595",
        muted: "#a39bb5",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
        body: ["var(--font-body)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(214, 51, 108, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
