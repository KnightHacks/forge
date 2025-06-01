import type { Config } from "tailwindcss";
import baseConfig from "@forge/tailwind-config/web";

const config: Config = {
  content: [
  "../../packages/ui/src/**/*.{ts,tsx}",
  "./src/app/pages/**/*.{ts,tsx}",
  "./src/app/components/**/*.{ts,tsx}",

]
,
  theme: {
    extend: {
      colors: {
        customDark: '#0F131A',
      },
    },
  },
};

export default config;
