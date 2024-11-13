"use client";

import { Excalidraw } from "@excalidraw/excalidraw";
import { useTheme } from "next-themes";

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
