import type { Config } from "tailwindcss";

// Color tokens sourced from the validated data-viz reference palette (dark mode).
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        plane: "#0d0d0d", // page plane
        surface: "#1a1a19", // chart / card surface
        "surface-2": "#232322", // raised surface
        // Ink
        ink: "#ffffff",
        "ink-secondary": "#c3c2b7",
        "ink-muted": "#898781",
        // Chrome
        grid: "#2c2c2a",
        baseline: "#383835",
        hairline: "rgba(255,255,255,0.10)",
        // Status (fixed, never themed)
        good: "#0ca30c",
        warning: "#fab219",
        serious: "#ec835a",
        critical: "#d03b3b",
        // Categorical series (dark steps)
        "s-1": "#3987e5",
        "s-2": "#d95926",
        "s-3": "#199e70",
        "s-4": "#c98500",
        "s-5": "#d55181",
        "s-6": "#008300",
        "s-7": "#9085e9",
        "s-8": "#e66767",
      },
      fontFamily: {
        sans: [
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
