/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        epitech: {
          blue: '#0091D3',
          yellow: '#FFFC9A',
        },
      },
    },
  },
  presets: [require("nativewind/preset")],
  plugins: [],
}
