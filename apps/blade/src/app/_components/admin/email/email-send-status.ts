export function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export function statusClass(status: string) {
  if (status === "completed") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }
  if (status === "running" || status === "compiling") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }
  if (status === "scheduled") {
    return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  }
  if (status.includes("failure")) {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }
  return "border-white/10 bg-background/60 text-muted-foreground";
}
