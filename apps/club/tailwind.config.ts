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
      backgroundImage: {
        "custom-radial": `radial-gradient(121.83% 96.39% at 50.3% 9.28%, 
          rgba(216, 179, 254, 0.7) 0%, 
          rgba(216, 179, 254, 0.7) 0.01%, 
          rgba(216, 179, 254, 0.7) 5.55%, 
          rgba(216, 179, 254, 0.7) 14.99%, 
          rgba(133, 87, 180, 0.598491) 42.5%, 
          rgba(46, 22, 71, 0.7) 86.9%)`,
      },
      filter: {
        "blur-20": "blur(20px)",
        "blur-25": "blur(25px)",
      },
      brightness: {
        150: "1.5",
      },
      transitionTimingFunction: {
        "minor-spring": "cubic-bezier(0.18,0.89,0.82,1.04)",
      },
      colors: {
        background: "hsl(var(--background))",
        950: "10182B",
        cream: '#F4F4ED',
      },
      boxShadow: {
        impact: `
          0px 0px 1879.49px #D8B5FE,
          0px 0px 1073.99px #D8B5FE,
          0px 0px 626.495px #D8B5FE,
          0px 0px 313.248px #D8B5FE,
          0px 0px 89.4993px #D8B5FE,
          0px 0px 44.7496px #D8B5FE`,
        glow: "0 0 20px rgba(255, 204, 112, 0.7), 0 0 40px rgba(200, 80, 192, 0.5), 0 0 60px rgba(65, 88, 208, 0.3)",
        glow2:
          "0 0 20px rgba(50, 255, 50, 0.7), 0 0 40px rgba(20, 200, 20, 0.5), 0 0 60px rgba(5, 150, 5, 0.3)",
      },
      fontFamily: {
        sans: [
          "Poppins",
          "Montserrat",
          "var(--font-geist-sans)",
          ...fontFamily.sans,
        ],
        mono: ["var(--font-geist-mono)", ...fontFamily.mono],
        narrow: ["Pragati Narrow", ...fontFamily.sans],

      },
      animation: {
        "infinite-scroll": "infinite-scroll 160s linear infinite",
      },
      keyframes: {
        "infinite-scroll": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-180%)" },
        },
        "reveal-up": {
          "0%": { opacity: "0", transform: "translateY(80%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "reveal-down": {
          "0%": { opacity: "0", transform: "translateY(-80%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "content-blur": {
          "0%": { filter: "blur(0.3rem)" },
          "100%": { filter: "blur(0)" },
        },
        "rotate-full": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      screens: {
        seOnly: { max: '390px' },

      }
    },
  },
} satisfies Config;
