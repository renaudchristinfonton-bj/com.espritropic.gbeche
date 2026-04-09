/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#81ecff',
        secondary: '#ff7162',
        tertiary: '#b8ffb9',
      },
    },
  },
  plugins: [],
};