"use client";

import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Skeleton } from "@forge/ui/skeleton";

import { MemberDetailDialog } from "~/app/_components/admin/members/member-detail-dialog";
import { api } from "~/trpc/react";

export function AnalyticsMemberDetail({
  canEdit,
  memberId,
  onChanged,
  onClose,
  onDeleted,
}: {
  canEdit: boolean;
  memberId: string;
  onChanged: () => void;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const detail = api.memberAdmin.getAdminMember.useQuery({ memberId });

  if (detail.data) {
    return (
      <MemberDetailDialog
        canEdit={canEdit}
        detail={detail.data}
        onChanged={() => {
          void detail.refetch();
          onChanged();
        }}
        onClose={onClose}
        onDeleted={onDeleted}
      />
    );
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="h-[100svh] max-h-[100svh] w-screen max-w-none gap-0 overflow-y-auto rounded-none border-0 bg-card p-0 sm:h-auto sm:max-h-[92svh] sm:w-[calc(100svw-1rem)] sm:max-w-5xl sm:rounded-lg sm:border sm:border-white/10">
        {!detail.error ? (
          <div aria-label="Member profile loading" aria-busy="true">
            <DialogHeader className="border-b border-border/70 bg-background/40 px-4 py-4 sm:px-6">
              <DialogTitle className="sr-only">Member profile</DialogTitle>
              <DialogDescription className="sr-only">
                Loading member profile and engagement details.
              </DialogDescription>
              <div className="flex items-start gap-3" aria-hidden="true">
                <Skeleton className="size-12 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-7 w-56 max-w-full" />
                  <Skeleton className="h-4 w-72 max-w-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              </div>
            </DialogHeader>
            <div
              className="grid gap-4 p-4 sm:p-6 lg:grid-cols-2"
              aria-hidden="true"
            >
              {Array.from({ length: 4 }).map((_, section) => (
                <section
                  className="overflow-hidden rounded-md border border-white/10 bg-background/60"
                  key={section}
                >
                  <div className="border-b border-border/70 px-4 py-3">
                    <Skeleton className="h-5 w-36" />
                  </div>
                  <div className="grid gap-3 p-4">
                    {Array.from({ length: 4 }).map((_, row) => (
                      <div
                        className="grid grid-cols-[7rem_minmax(0,1fr)] gap-3"
                        key={row}
                      >
                        <Skeleton className="h-3 w-20" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-6">
            <DialogHeader>
              <DialogTitle>Member could not be opened</DialogTitle>
              <DialogDescription>{detail.error.message}</DialogDescription>
            </DialogHeader>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
