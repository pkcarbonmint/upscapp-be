/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: [
    {
      pattern: /bg-gradient-to-./,
    },
    {
      pattern: /from-(red|green|blue)-400/,
    },
    {
      pattern: /to-(red|green|blue)-600/,
    },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
