"use client";

import type { CSSProperties } from "react";
import { Toaster as Sonner, toast } from "sonner";

import { useTheme } from "./theme";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ style, ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:shadow-black/25",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      style={
        {
          "--normal-bg": "hsl(var(--card))",
          "--normal-bg-hover": "hsl(var(--muted))",
          "--normal-border": "hsl(var(--border))",
          "--normal-border-hover": "hsl(var(--border))",
          "--normal-text": "hsl(var(--card-foreground))",
          ...style,
        } as CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster, toast };
