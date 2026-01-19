import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

import baseConfig from "@forge/tailwind-config/web";

export default {
  // We need to append the path to the UI package to the content array so that
  // those classes are included correctly.
  content: [...baseConfig.content, "../../packages/ui/src/*.{ts,tsx}"],
  presets: [baseConfig],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", ...fontFamily.sans],
        mono: ["var(--font-geist-mono)", ...fontFamily.mono],
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shoot: {
          '0%': {transform: 'translate(0,0) rotate(-45deg)'},
          '100%': {transform: 'translate(calc(-1 * var(--dx)), var(--dy)) rotate(-45deg)',}
        },
        shrink: {
          '0%': {transform: 'scale(1.3)', opacity: '0'},
          '100%': {transform: 'scale(1)', opacity: '.9'}
        },
        flyIn: {
          '0%': {transform: 'translateY(-100px)'},
          '100%': {transform: 'translateY(0px)'},
        },
        mahoraga: {
          '0%, 100%': { transform: 'translateY(0) rotate(-1deg)' },
          '50%': { transform: 'translateY(-10px) rotate(1deg)' },
        }
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
        shoot: 'shoot var(--duration) linear',
        shrink: 'shrink 2s ease-in-out',
        flyIn: 'flyIn 2s ease-in-out',
        mahoraga: 'mahoraga 7s ease-in-out infinite'
      },
    },
    
  },
} satisfies Config;
