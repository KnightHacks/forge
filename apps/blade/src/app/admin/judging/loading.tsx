import { DoorOpen } from "lucide-react";

import { Skeleton } from "@forge/ui/skeleton";

import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";

export default function JudgingAdminLoading() {
  return (
    <main className={adminPageLayoutClassName} aria-busy="true">
      <AdminPageHeader
        description="Provision physical rooms, distribute guest access, and watch the live judge roster."
        eyebrow="Officer command center"
        icon={DoorOpen}
        title="Judging rooms"
      />
      <Skeleton className="h-24 w-full rounded-lg" />
      <section className="overflow-hidden rounded-lg border border-border bg-card">
        {[0, 1, 2].map((row) => (
          <div
            className="space-y-4 border-b border-border p-5 last:border-b-0"
            key={row}
          >
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-6 w-44" />
              <Skeleton className="max-w-1/2 h-9 w-72" />
            </div>
            <Skeleton className="h-20 w-full rounded-md" />
          </div>
        ))}
      </section>
    </main>
  );
}
