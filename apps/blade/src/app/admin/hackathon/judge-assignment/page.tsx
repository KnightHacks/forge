import type { Metadata } from "next";

import QRCodesClient from "./_components/judges-client";

export const metadata: Metadata = {
  title: "Blade | Hackers",
  description: "Manage Knight Hacks hackers.",
};

export default function Judges() {
  return <QRCodesClient />;
}
