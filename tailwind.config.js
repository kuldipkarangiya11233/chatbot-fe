/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Scan all React component files
    "./public/index.html" // Scan the main HTML file
  ],
  theme: {
    extend: {
      // You can extend the default Tailwind theme here
      // For example, add custom colors, fonts, etc.
      colors: {
        primary: '#3490dc', // Example primary color
        secondary: '#ffed4a', // Example secondary color
        danger: '#e3342f', // Example danger color
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Example: Using Inter font
      },
    },
  },
  plugins: [
    // You can add Tailwind plugins here if needed
    // require('@tailwindcss/forms'), // Example: for better form styling
  ],
}