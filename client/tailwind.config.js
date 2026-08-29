/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f6efe4",
        ink: "#1c1917",
        mint: "#7a7368",
        brand: {
          DEFAULT: "#b07d4f",
          100: "#f6ead8",
          200: "#eed9bb",
          300: "#e3c290",
          400: "#cfa565",
          500: "#b07d4f",
          600: "#9a6838",
          700: "#7c5636",
        },
        cash: {
          DEFAULT: "#7f9d6b",
          100: "#eaf1e4",
          600: "#5e7c4c",
        },
      },
      fontFamily: {
        body: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      boxShadow: {
        'nav': '0 -1px 0 rgba(28,25,23,0.06), 0 -16px 32px -20px rgba(28,25,23,0.25)',
      },
      keyframes: {},
    },
  },
  plugins: [],
};
