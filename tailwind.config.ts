import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'DM Sans'", "sans-serif"],
      },
      colors: {
        surface: {
          0: "#0a0a0f",
          1: "#111118",
          2: "#1a1a24",
          3: "#22222f",
          4: "#2e2e3d",
        },
        accent: {
          DEFAULT: "#6ee7b7",
          dim: "#4ade80",
          blue: "#60a5fa",
          amber: "#fbbf24",
          red: "#f87171",
        },
        ink: {
          DEFAULT: "#e2e8f0",
          muted: "#94a3b8",
          faint: "#475569",
        },
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.3" },
        },
        "slide-in": {
          from: { transform: "translateY(-6px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 1.4s ease-in-out infinite",
        "slide-in": "slide-in 0.18s ease-out",
        "fade-in": "fade-in 0.25s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
