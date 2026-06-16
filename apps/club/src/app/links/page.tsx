import type { Metadata } from "next";

import { LegacyRedirectPage } from "../_components/legacy-redirect-page";
import { PUBLIC_LINKS } from "../_lib/site-config";

export const metadata: Metadata = {
  title: "Links | Knight Hacks",
  robots: {
    index: false,
    follow: true,
  },
};

export default function LinksRedirectPage() {
  return <LegacyRedirectPage label="Links" target={PUBLIC_LINKS.linktree} />;
}
