import type { Config } from "tailwindcss";

/**
 * Paleta institucional Supersubsidio. Se usan colores hex/rgb (no oklch)
 * a proposito: el exportador de PDF rasteriza el DOM y las funciones de
 * color modernas rompen ese proceso.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        vino: {
          50: "#faf3f5",
          100: "#f3e3e8",
          200: "#e6c7d1",
          300: "#d2a0b0",
          400: "#b76f87",
          500: "#9c4b64",
          600: "#82384f",
          700: "#671c35",
          800: "#54182c",
          900: "#3d1120",
        },
        arena: {
          50: "#fbfaf8",
          100: "#f4f1ec",
          200: "#e8e2d8",
          300: "#d6ccbc",
        },
        tinta: {
          400: "#8a8079",
          500: "#6b625c",
          600: "#4a433e",
          700: "#332e2a",
          900: "#1c1917",
        },
        oro: "#f9c315",
        azulco: "#00338d",
        rojoco: "#e4002b",
      },
      fontFamily: {
        sans: ["var(--fuente-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        tarjeta: "0 1px 2px rgba(28,25,23,0.05), 0 4px 16px -6px rgba(28,25,23,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
