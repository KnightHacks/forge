"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarRange,
  Link2,
  Loader2,
  Pencil,
  Swords,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Button } from "@forge/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { toast } from "@forge/ui/toast";

import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import { ADMIN_PAGE_EYEBROWS } from "~/consts/admin-page-eyebrows";
import { api } from "~/trpc/react";
import { ClassSection } from "./class-section";
import { HackathonFormDialog } from "./hackathon-form-dialog";
import { formatHackathonDateTime } from "./hackathon-formatting";
import { StatusEmailSection } from "./status-email-section";

type Detail = RouterOutputs["hackathon"]["get"];
type Templates = RouterOutputs["email"]["listTemplates"];

const DATE_ROWS = [
  ["applicationOpen", "Applications open"],
  ["applicationDeadline", "Application deadline"],
  ["confirmationDeadline", "Confirmation deadline"],
  ["startDate", "Starts"],
  ["endDate", "Ends"],
] as const;

export function HackathonDetail({
  detail,
  templates,
}: {
  detail: Detail;
  templates: Templates;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // The data arrived as RSC props, so `router.refresh()` rather than
  // `utils.invalidate()`. `useTransition` and not a bare `startTransition`
  // because `refresh()` returns void — `isRefreshing` is the only signal that
  // the new props have landed, and every save button has to wait on it. Without
  // it the red banner stays up after the final save, which reads as a failure
  // and invites a second submit.
  const [isRefreshing, startRefresh] = useTransition();
  const refresh = () => startRefresh(() => router.refresh());

  const removed = api.hackathon.remove.useMutation({
    onError: (error) => {
      setConfirmingDelete(false);
      toast.error(error.message);
    },
    onSuccess: () => {
      // Closed before navigating. `router.push` is not instantaneous, and
      // `isPending` goes false the moment the mutation resolves — so leaving the
      // dialog open re-enables the button during the push, and a second click
      // re-runs `remove` on the id that was just deleted, surfacing "Hackathon
      // not found." right behind the success toast.
      setConfirmingDelete(false);
      toast.success("Hackathon deleted.");
      router.push("/admin/hackathon");
    },
  });

  const { hackathon } = detail;
  // The server refuses a delete once anyone has applied. Knowing that here is
  // what lets the button say so up front, instead of offering the action and
  // answering with a toast after the officer has confirmed it.
  const hasApplications = detail.applicationCount > 0;

  return (
    // Direct children on purpose: `adminPageLayoutClassName` ends in a
    // `space-y` that compiles to `> * + *`, so wrapping siblings would silently
    // delete a gap.
    <main className={adminPageLayoutClassName}>
      <Button asChild variant="ghost" className="-ml-3 min-h-11 w-fit gap-2">
        <Link href="/admin/hackathon">
          <ArrowLeft className="size-4" aria-hidden="true" /> Hackathons
        </Link>
      </Button>

      <AdminPageHeader
        actions={
          <>
            <Button
              className="min-h-11 gap-2"
              onClick={() => setEditing(true)}
              variant="secondary"
            >
              <Pencil className="size-4" aria-hidden="true" /> Edit details
            </Button>
            {/*
              Opens a confirmation rather than deleting outright. This button
              sits one position from "Edit details", and the server only refuses
              a hackathon that already has applications — so a misclick on a
              freshly configured one takes its six status emails and every class
              with it, with no undo.
            */}
            <Button
              className="min-h-11 gap-2"
              disabled={removed.isPending || isRefreshing || hasApplications}
              onClick={() => setConfirmingDelete(true)}
              title={
                hasApplications
                  ? `${detail.applicationCount} people have applied, so this hackathon can no longer be deleted.`
                  : undefined
              }
              variant="destructive"
            >
              {removed.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="size-4" aria-hidden="true" />
              )}
              Delete
            </Button>
          </>
        }
        description={hackathon.theme}
        eyebrow={ADMIN_PAGE_EYEBROWS.hackathonDetail}
        icon={Swords}
        title={hackathon.displayName}
      />

      {detail.isConfigured ? null : (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <TriangleAlert className="size-5" aria-hidden="true" />
              Not ready to use
            </CardTitle>
            <CardDescription className="text-destructive/90">
              This hackathon is missing at least one status email, so accepting
              someone would leave them untold. Hacker management is not built
              yet, so nothing is stopping you today — finish these before it is.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarRange className="size-5" aria-hidden="true" /> Dates
          </CardTitle>
          <CardDescription>
            Shown in UTC. Hackathon state is read from these — there is no
            stored "current hackathon" anywhere.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DATE_ROWS.map(([field, label]) => (
            <div key={field}>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="font-medium">
                {formatHackathonDateTime(hackathon[field])}
              </p>
            </div>
          ))}
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Application link</p>
            {hackathon.applicationUrl ? (
              <a
                className="flex min-w-0 items-center gap-1 break-all font-medium text-primary underline-offset-4 hover:underline"
                href={hackathon.applicationUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Link2 className="size-4 shrink-0" aria-hidden="true" />
                {hackathon.applicationUrl}
              </a>
            ) : (
              <p className="font-medium text-muted-foreground">Not set</p>
            )}
          </div>
        </CardContent>
      </Card>

      <StatusEmailSection
        detail={detail}
        isRefreshing={isRefreshing}
        onSaved={refresh}
        templates={templates}
      />

      <ClassSection
        detail={detail}
        isRefreshing={isRefreshing}
        onSaved={refresh}
      />

      <HackathonFormDialog
        hackathon={hackathon}
        onOpenChange={setEditing}
        onSaved={() => {
          setEditing(false);
          refresh();
        }}
        open={editing}
      />

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent className="max-w-lg border-destructive/30">
          <DialogHeader>
            {/* `DialogTitle` is `leading-none`, so a display name long enough
                to wrap collides with itself. Display names run to 255 chars. */}
            <DialogTitle className="break-words leading-tight">
              Delete {hackathon.displayName}?
            </DialogTitle>
            <DialogDescription>
              No one has applied yet, so this is still allowed. It stops being
              possible as soon as the first application arrives.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm text-muted-foreground">
              This also removes its status email configuration and every class
              on it. It cannot be undone.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </Button>
            <Button
              className="min-h-11 gap-2"
              disabled={removed.isPending}
              onClick={() => removed.mutate({ id: hackathon.id })}
              variant="destructive"
            >
              {removed.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="size-4" aria-hidden="true" />
              )}
              Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
