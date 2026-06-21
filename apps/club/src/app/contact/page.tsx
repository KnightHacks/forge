import type { Metadata } from "next";

import { Redirect } from "../_components/redirect";

export const metadata: Metadata = {
  title: "Contact | Knight Hacks",
  robots: {
    index: false,
    follow: true,
  },
};

export default function ContactRedirectPage() {
  return <Redirect label="Contact" target="/about" />;
}
