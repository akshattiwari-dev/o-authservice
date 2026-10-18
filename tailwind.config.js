/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#111111",
        body: "#3a3a3a",
        muted: "#5b5b5b",
        surface: "#F8F9FA",
        surfaceAlt: "#F5F5F5",
        border: "#E5E7EA",
        accent: {
          DEFAULT: "#0070F3",
          dark: "#0058CC",
          light: "#EAF3FF",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        serif: [
          "Lora",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "Times",
          "serif",
        ],
      },
      maxWidth: {
        article: "760px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(17, 17, 17, 0.04), 0 4px 12px rgba(17, 17, 17, 0.04)",
        card: "0 1px 3px rgba(17, 17, 17, 0.06), 0 1px 2px rgba(17, 17, 17, 0.04)",
      },
    },
  },
  plugins: [],
};
