"use client";

import { useState } from "react";

import { cn } from "@forge/ui";

export function CompanyMark({
  className,
  displayName,
  imageUrl,
  large = false,
}: {
  className?: string;
  displayName: string;
  imageUrl: string | null;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.at(0))
    .join("")
    .toUpperCase();

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-primary/20 bg-primary/10 font-mono font-semibold text-primary",
        large ? "h-14 w-14 text-base" : "h-11 w-11 text-sm",
        className,
      )}
      aria-hidden="true"
    >
      {failed || !imageUrl ? (
        initials
      ) : (
        // Officer-managed images are used when present; every other company
        // receives the same stable monogram treatment.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className={cn(
            "max-h-[72%] max-w-[76%] object-contain",
            large && "max-h-[76%] max-w-[80%]",
          )}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
