import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Petrol teal — institutional trust, medical gravitas
        petrol: {
          50: "#EEF5F4",
          100: "#D7E8E6",
          200: "#AFD1CC",
          300: "#7FB3AC",
          400: "#4A9188",
          500: "#0E5C57",
          600: "#0B4F4A",
          700: "#093F3B",
          800: "#072F2C",
          900: "#05201E",
        },
        // Institutional gold — the ballot / seal accent
        gold: {
          50: "#FBF6E9",
          100: "#F3E6BE",
          200: "#E6CD87",
          300: "#D4A72C",
          400: "#C8992A",
          500: "#AD8021",
          600: "#8A6519",
        },
        ink: "#16211F",
        canvas: "#F7F8FA",
        line: "#E4E8E7",
        alert: "#B3441E",
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "1.25rem",
      },
      boxShadow: {
        soft: "0 2px 8px -2px rgba(11, 79, 74, 0.08), 0 8px 24px -8px rgba(11, 79, 74, 0.10)",
        lift: "0 4px 14px -2px rgba(11, 79, 74, 0.14), 0 16px 40px -12px rgba(11, 79, 74, 0.18)",
      },
      keyframes: {
        "seal-in": {
          "0%": { transform: "scale(0.6) rotate(-8deg)", opacity: "0" },
          "60%": { transform: "scale(1.06) rotate(2deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        "fade-up": {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "seal-in": "seal-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "fade-up": "fade-up 0.4s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
