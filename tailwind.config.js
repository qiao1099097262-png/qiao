/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 深蓝底色
        'bg-deep': '#080d16',
        'bg-primary': '#0d1322',
        'bg-surface': '#111827',
        'bg-elevated': '#161e2e',

        // 保留旧名称 (别名映射到新颜色)
        'surface': '#111827',
        'bg-alt': '#0d1322',
        'border': 'rgba(255,255,255,0.06)',

        // 莫兰蒂文字色系 (覆盖旧名)
        'text-primary': '#e4ded6',
        'text-secondary': '#9a948a',
        'text-muted': '#69645e',

        // 莫兰蒂功能色 (覆盖旧名)
        'accent': '#8b98a8',
        'success': '#8ea38e',
        'warning': '#bfa47a',
        'danger': '#b88178',

        // 莫兰蒂扩展色
        'accent-hover': '#9aa7b5',
        'morandi-green': '#8ea38e',
        'morandi-gold': '#bfa47a',
        'morandi-rose': '#b88178',
        'morandi-sage': '#9ba89a',
        'morandi-blue': '#7d8ea3',
        'morandi-lavender': '#9d94a8',

        // 玻璃态边框
        'glass-border': 'rgba(255,255,255,0.06)',
        'glass-border-hover': 'rgba(255,255,255,0.12)',

        // RCI 温度色 (在深蓝底上)
        'rci-cold': '#3d5f8a',
        'rci-cool': '#5f85b0',
        'rci-normal': '#7a7d82',
        'rci-warm': '#c49260',
        'rci-hot': '#c06858',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
