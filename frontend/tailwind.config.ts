import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: "#08090B", // near-black background
          raised: "#0D0F12",
        },
        panel: {
          DEFAULT: "#131519", // dark graphite
          border: "#22252B",
          hover: "#181B20",
        },
        accent: {
          DEFAULT: "#2DD4F0", // single cyan/blue accent — used sparingly
          dim: "#1B7A8C",
          soft: "rgba(45, 212, 240, 0.12)",
        },
        status: {
          critical: "#F5455C",
          "critical-soft": "rgba(245, 69, 92, 0.12)",
          warning: "#F5A524",
          "warning-soft": "rgba(245, 165, 36, 0.12)",
          healthy: "#34D399",
          "healthy-soft": "rgba(52, 211, 153, 0.12)",
        },
        ink: {
          DEFAULT: "#E7E9EC", // primary text
          muted: "#9199A3", // secondary text
          faint: "#5B6169", // tertiary / labels
        },
      },
      fontFamily: {
        display: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Inter",
          "sans-serif",
        ],
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Inter",
          "sans-serif",
        ],
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "Liberation Mono",
          "monospace",
        ],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.02) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
        drawer: "-24px 0 48px -12px rgba(0,0,0,0.55)",
      },
      keyframes: {
        pulseBeat: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "10%": { transform: "scale(1.35)", opacity: "1" },
          "20%": { transform: "scale(1)", opacity: "1" },
          "30%": { transform: "scale(1.2)", opacity: "1" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
        ringOut: {
          "0%": { transform: "scale(0.8)", opacity: "0.6" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
      },
      animation: {
        "pulse-beat": "pulseBeat 2.4s ease-in-out infinite",
        "ring-out": "ringOut 2.4s ease-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
