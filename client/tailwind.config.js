/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        warm: {
          50: "#fdfbf7",
          100: "#f7f3ea",
          500: "#b07d4f",
          700: "#7c5636",
        },
      },
    },
  },
  plugins: [],
};
