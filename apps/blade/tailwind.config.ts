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
        sans: ["var(--font-inter)", ...fontFamily.sans],
        heading: ["var(--font-space-grotesk)", ...fontFamily.sans],
        mono: ["var(--font-jetbrains-mono)", ...fontFamily.mono],
      },
    },
  },
} satisfies Config;
