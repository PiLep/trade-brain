import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        plane: "var(--tb-plane)",
        bg: "var(--tb-bg)",
        surface: "var(--tb-surface)",
        card: "var(--tb-card)",
        "surface-2": "var(--tb-surface-2)",
        chip: "var(--tb-chip)",
        ink: "var(--tb-ink)",
        "ink-secondary": "var(--tb-ink-secondary)",
        "ink-muted": "var(--tb-ink-muted)",
        ink2: "var(--tb-ink2)",
        ink3: "var(--tb-ink3)",
        line: "var(--tb-line)",
        hairline: "var(--tb-hairline)",
        grid: "var(--tb-grid)",
        baseline: "var(--tb-baseline)",
        accent: "var(--tb-accent)",
        onacc: "var(--tb-onacc)",
        pos: "var(--tb-pos)",
        neg: "var(--tb-neg)",
        warn: "var(--tb-warn)",
        warnbg: "var(--tb-warnbg)",
        // legacy aliases
        good: "var(--tb-pos)",
        warning: "var(--tb-warn)",
        serious: "#ec835a",
        critical: "var(--tb-neg)",
        "s-1": "var(--tb-accent)",
        "s-2": "#d97b4f",
        "s-3": "#4ca88c",
        "s-4": "#cda23f",
        "s-5": "#c25e93",
        "s-6": "#008300",
        "s-7": "#9085e9",
        "s-8": "#e66767",
      },
      boxShadow: {
        soft: "var(--tb-shadow)",
      },
      borderRadius: {
        pill: "999px",
        card: "18px",
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      maxWidth: {
        shell: "1240px",
      },
    },
  },
  plugins: [],
};

export default config;
