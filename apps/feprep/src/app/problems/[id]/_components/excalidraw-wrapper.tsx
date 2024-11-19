"use client";

import dynamic from "next/dynamic";
import { useTheme } from "next-themes";

import { Skeleton } from "@blade/ui/skeleton";

const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  {
    ssr: false,
    loading: () => <Skeleton className="h-full w-full" />,
  },
);

export default function ExcalidrawWrapper() {
  const { resolvedTheme } = useTheme();

  const checkDarkTheme =
    typeof window !== "undefined" &&
    (resolvedTheme === "dark" ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches &&
        resolvedTheme === "system"));

  return (
    <div className="h-full w-full border-2 border-accent">
      <Excalidraw
        initialData={{
          appState: { theme: checkDarkTheme ? "dark" : "light" },
        }}
      />
    </div>
  );
}
