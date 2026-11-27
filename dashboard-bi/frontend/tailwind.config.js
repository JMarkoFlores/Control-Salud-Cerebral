/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        health: {
          petroleo: '#0F4C5C',
          teal: '#028090',
          esmeralda: '#10B981',
          ambar: '#F59E0B',
          coral: '#EF4444',
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          dark: '#0B2545'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif']
      },
      boxShadow: {
        soft: '0 2px 10px rgba(15, 76, 92, 0.05)',
        card: '0 4px 20px rgba(15, 76, 92, 0.08)',
        modal: '0 20px 40px rgba(15, 76, 92, 0.15)'
      }
    }
  },
  plugins: []
};
