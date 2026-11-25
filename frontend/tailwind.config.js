/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./frontend/index.html",
    "./frontend/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        health: {
          petroleo: '#0F4C5C',   // Azul petróleo principal
          teal: '#028090',       // Teal complementario
          esmeralda: '#10B981',   // Verde metas logradas
          ambar: '#F59E0B',       // Ámbar en progreso
          naranja: '#F97316',     // Naranja avance inicial
          coral: '#EF4444',       // Coral suave alertas / sin actividad
          bg: '#F8FAFC',          // Fondo general sereno
          card: '#FFFFFF',        // Tarjetas
          border: '#E2E8F0',      // Bordes limpios
          dark: '#0B2545',        // Texto títulos
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(15, 76, 92, 0.05)',
        'card': '0 4px 20px rgba(15, 76, 92, 0.08)',
        'modal': '0 20px 40px rgba(15, 76, 92, 0.15)',
      },
    },
  },
  plugins: [],
}
