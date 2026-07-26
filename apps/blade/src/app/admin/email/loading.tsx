import { Clock3, Send, Sparkles } from "lucide-react";

import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeaderSkeleton,
  adminPageLayoutClassName,
} from "~/app/_components/admin/admin-page";

export default function EmailPortalLoading() {
  return (
    <main className={adminPageLayoutClassName}>
      <AdminPageHeaderSkeleton titleWidth="w-64" />
      <div className="overflow-hidden rounded-lg border border-white/10 bg-card shadow-2xl shadow-black/20">
        <div className="flex h-14 items-end gap-2 border-b border-border/70 bg-background/40 px-3 sm:px-5">
          {[
            { icon: Send, label: "Compose" },
            { icon: Sparkles, label: "Templates" },
            { icon: Clock3, label: "Sends" },
          ].map(({ icon: Icon, label }) => (
            <div className="flex h-11 items-center gap-2 px-3" key={label}>
              <Icon className="size-4 text-muted-foreground/40" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
        <div className="grid min-h-[32rem] gap-5 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-5">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-11 w-full" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    </main>
  );
}
