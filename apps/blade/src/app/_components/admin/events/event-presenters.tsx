import { AlertTriangle, CheckCircle2, Clock3, HelpCircle } from "lucide-react";

import { cn } from "@forge/ui";
import { Badge } from "@forge/ui/badge";

import type { EventAudience, EventIntegrationHealth } from "./types";

export { formatEventDateTime } from "~/lib/event-dates";

export function audienceLabel(audience: EventAudience) {
  if (audience === "dues") return "Dues paying";
  if (audience === "roles") return "Selected roles";
  return "Public";
}

export function IntegrationStatus({
  health,
  label,
}: {
  health: EventIntegrationHealth;
  label: string;
}) {
  const Icon =
    health === "synced"
      ? CheckCircle2
      : health === "pending"
        ? Clock3
        : health === "unknown"
          ? HelpCircle
          : AlertTriangle;
  const text =
    health === "synced"
      ? `${label} synchronized`
      : health === "pending"
        ? `${label} pending`
        : health === "unknown"
          ? `${label} status unknown`
          : `${label} needs attention`;

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 rounded-full border-white/10 bg-background/60 font-normal",
        health === "synced" &&
          "border-[hsl(var(--chart-2)/0.35)] text-[hsl(var(--chart-2))]",
        health === "error" && "border-destructive/35 text-destructive",
        health === "pending" && "text-muted-foreground",
        health === "unknown" &&
          "border-[hsl(var(--chart-3)/0.35)] text-[hsl(var(--chart-3))]",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {text}
    </Badge>
  );
}

export function EventTag({ color, name }: { color: string; name: string }) {
  return (
    <Badge
      variant="outline"
      className="gap-2 rounded-full border-white/10 bg-background/60 font-medium"
    >
      <span
        className="h-2.5 w-2.5 rounded-full border border-white/20"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {name}
    </Badge>
  );
}
