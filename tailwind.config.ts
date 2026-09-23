import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        valere: {
          bg: "#f7f7f5",
          panel: "#ffffff",
          border: "#deded9",
          muted: "#686864",
          fg: "#171716",
          accent: "#2563eb",
          "accent-soft": "#eff6ff",
          surface: "#f0f0ed",
          success: "#15803d",
          warning: "#a16207",
          danger: "#b91c1c",
        },
      },
      boxShadow: {
        editorial: "0 1px 2px rgba(23, 23, 22, 0.05), 0 8px 24px rgba(23, 23, 22, 0.04)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
