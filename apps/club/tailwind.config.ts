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
      transitionTimingFunction: {
        "minor-spring": "cubic-bezier(0.18,0.89,0.82,1.04)",
      },
      boxShadow: {
        impact: `
          0px 0px 1879.49px #D8B5FE,
          0px 0px 1073.99px #D8B5FE,
          0px 0px 626.495px #D8B5FE,
          0px 0px 313.248px #D8B5FE,
          0px 0px 89.4993px #D8B5FE,
          0px 0px 44.7496px #D8B5FE`,
      },
      fontFamily: {
        sans: [
          "Poppins",
          "Montserrat",
          "var(--font-geist-sans)",
          ...fontFamily.sans,
        ],
        mono: ["var(--font-geist-mono)", ...fontFamily.mono],
      },
      animation: {
        "infinite-scroll": "infinite-scroll 265s linear infinite",
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
      },
    },
  },
} satisfies Config;
