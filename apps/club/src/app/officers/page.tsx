import type { Metadata } from "next";

import { LegacyRedirectPage } from "../_components/legacy-redirect-page";

export const metadata: Metadata = {
  title: "Officers | Knight Hacks",
  robots: {
    index: false,
    follow: true,
  },
};

export default function OfficersRedirectPage() {
  return <LegacyRedirectPage label="Officers" target="/teams" />;
}
