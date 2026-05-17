/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'text-primary': '#1a1a2e',
        'text-secondary': '#4a4a5e',
        'surface': '#ffffff',
        'bg-alt': '#f8f9fa',
        'border': '#e5e7eb',
        'success': '#16a34a',
        'warning': '#f59e0b',
        'danger': '#dc2626',
        'rci-cold': '#1e40af',
        'rci-cool': '#60a5fa',
        'rci-normal': '#9ca3af',
        'rci-warm': '#f97316',
        'rci-hot': '#dc2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
