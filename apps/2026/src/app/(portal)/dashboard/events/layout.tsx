import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Events",
};

export default function EventsLayout({ children }: { children: ReactNode }) {
  return children;
}
