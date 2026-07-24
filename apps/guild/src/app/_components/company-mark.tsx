"use client";

import { useMemo, useState } from "react";

import { cn } from "@forge/ui";

const simpleIconSlugs: Record<string, string> = {
  "advanced micro devices": "amd",
  amd: "amd",
  "ford motor": "ford",
  nvidia: "nvidia",
  tesla: "tesla",
};

function normalizedName(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function companyLogoUrl(displayName: string, domain: string | null) {
  const normalized = normalizedName(displayName);
  const simpleIconSlug = simpleIconSlugs[normalized];
  if (simpleIconSlug) {
    return `https://cdn.simpleicons.org/${simpleIconSlug}/_/eee?viewbox=auto`;
  }
  if (!domain) return null;
  const companyUrl = encodeURIComponent(`https://${domain}`);
  return `https://www.google.com/s2/favicons?domain_url=${companyUrl}&sz=128`;
}

export function CompanyMark({
  className,
  displayName,
  domain,
  large = false,
}: {
  className?: string;
  displayName: string;
  domain: string | null;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const logoUrl = useMemo(
    () => companyLogoUrl(displayName, domain),
    [displayName, domain],
  );
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
      {failed || !logoUrl ? (
        initials
      ) : (
        // Known vector marks use Simple Icons. The rest use the company's
        // domain favicon, then fall back to a stable monogram.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className={cn(
            "max-h-[62%] max-w-[68%] object-contain",
            large && "max-h-[64%] max-w-[72%]",
          )}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
