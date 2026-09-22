import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "My Hack",
};

export default function JourneyLayout({ children }: { children: ReactNode }) {
  return children;
}
