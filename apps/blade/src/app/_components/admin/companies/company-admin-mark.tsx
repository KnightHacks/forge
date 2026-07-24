import { Building2 } from "lucide-react";

import { cn } from "@forge/ui";

export function CompanyAdminMark({
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
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.at(0))
    .join("")
    .toUpperCase();

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-background/70 font-mono font-semibold text-primary",
        large ? "h-20 w-20 text-lg" : "h-11 w-11 text-xs",
        className,
      )}
      aria-hidden="true"
    >
      {imageUrl ? (
        // Company images are private-bucket objects served by expiring URLs.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-contain p-2"
        />
      ) : initials ? (
        initials
      ) : (
        <Building2 className="h-5 w-5" />
      )}
    </span>
  );
}
