import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Lore",
};

export default function LoreLayout({ children }: { children: ReactNode }) {
  return children;
}
