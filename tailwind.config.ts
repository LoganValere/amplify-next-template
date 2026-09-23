import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        valere: {
          bg: "#050505",
          panel: "#111111",
          border: "#2a2a2a",
          muted: "#9a9a9a",
          fg: "#f4f4f5",
          accent: "#5b8def",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
