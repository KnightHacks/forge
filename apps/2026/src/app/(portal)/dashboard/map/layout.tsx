import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Map",
};

export default function MapLayout({ children }: { children: ReactNode }) {
  return children;
}
