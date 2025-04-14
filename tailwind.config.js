/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.{html,js}"],
  theme: {
    extend: {
      transitionDuration: {
        '1500': '1500ms',
      }
    },
  },
  plugins: [],
}