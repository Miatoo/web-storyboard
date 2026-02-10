/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#FAC638",
        "background-light": "#f8f8f5",
        "background-dark": "#231e0f",
        "retro-gray": "#c0c0c0",
        "retro-border": "#808080",
      },
      fontFamily: {
        display: ["Space Grotesk", "sans-serif"],
        mono: ["'VT323'", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
        full: "0.75rem",
      },
    },
  },
  plugins: [],
}


