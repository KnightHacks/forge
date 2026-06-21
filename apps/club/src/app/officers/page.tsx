import type { Metadata } from "next";

import { Redirect } from "../_components/redirect";

export const metadata: Metadata = {
  title: "Officers | Knight Hacks",
  robots: {
    index: false,
    follow: true,
  },
};

export default function OfficersRedirectPage() {
  return <Redirect label="Officers" target="/teams" />;
}
