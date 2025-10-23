import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        // Cores primárias do BTG
        'btg': {
          'blue-deep': '#001E62',
          'blue': '#10408D',
          'blue-medium': '#195AB4',
          'blue-bright': '#307AE0',
          'blue-light': '#549CFF',
          'slate-dark': '#313B4A',
          'cyan': '#249AD0',
        },
        // Cores do sistema
        'primary': {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d6ff',
          300: '#a5b8ff',
          400: '#8191ff',
          500: '#307AE0', // BTG blue-bright
          600: '#195AB4', // BTG blue-medium
          700: '#10408D', // BTG blue
          800: '#001E62', // BTG blue-deep
          900: '#001447',
          950: '#000a2e',
        }
      }
    }
  },
  plugins: []
}

export default config
