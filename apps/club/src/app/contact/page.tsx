import type { Metadata } from "next";

import { LegacyRedirectPage } from "../_components/legacy-redirect-page";

export const metadata: Metadata = {
  title: "Contact | Knight Hacks",
  robots: {
    index: false,
    follow: true,
  },
};

export default function ContactRedirectPage() {
  return <LegacyRedirectPage label="Contact" target="/about" />;
}
