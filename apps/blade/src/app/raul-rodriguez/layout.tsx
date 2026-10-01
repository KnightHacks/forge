import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Raul Rodriguez | KnightHacks Dev Team Application",
};

export default function RaulLayout({ children }: { children: ReactNode }) {
  return children;
}
