import type { Metadata } from "next";

import { Redirect } from "../_components/redirect";
import { PUBLIC_LINKS } from "../_lib/site-config";

export const metadata: Metadata = {
  title: "Links | Knight Hacks",
  robots: {
    index: false,
    follow: true,
  },
};

export default function LinksRedirectPage() {
  return <Redirect label="Links" target={PUBLIC_LINKS.linktree} />;
}
