"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarRange, Plus, Swords, TriangleAlert } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";

import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import { ADMIN_PAGE_EYEBROWS } from "~/consts/admin-page-eyebrows";
import { HackathonFormDialog } from "./hackathon-form-dialog";
import { formatHackathonDate } from "./hackathon-formatting";

type Hackathons = RouterOutputs["hackathon"]["list"];

export function HackathonList({ hackathons }: { hackathons: Hackathons }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  return (
    <main className={adminPageLayoutClassName}>
      <AdminPageHeader
        actions={
          <Button className="min-h-11 gap-2" onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden="true" /> New hackathon
          </Button>
        }
        description="Every hackathon the platform knows about, newest first. Creating one here is all it takes — there is no code change and no deploy. A hackathon is ready to use once all six of its status emails are configured."
        eyebrow={ADMIN_PAGE_EYEBROWS.hackathons}
        icon={Swords}
        title="Hackathons"
      />

      {hackathons.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No hackathons yet</CardTitle>
            <CardDescription>
              Create one to give applications, events, and judging something to
              point at.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {hackathons.map((hackathon) => (
            <Card
              className="flex min-w-0 flex-col"
              data-unconfigured={hackathon.isConfigured ? undefined : "true"}
              key={hackathon.id}
            >
              <CardHeader className="min-w-0 space-y-2">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <CardTitle className="min-w-0 break-words">
                    {hackathon.displayName}
                  </CardTitle>
                  {hackathon.isConfigured ? null : (
                    <Badge className="shrink-0 gap-1" variant="destructive">
                      <TriangleAlert className="size-3" aria-hidden="true" />
                      Not ready
                    </Badge>
                  )}
                </div>
                <CardDescription className="break-words">
                  {hackathon.theme}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between gap-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2">
                    <CalendarRange
                      className="size-4 shrink-0"
                      aria-hidden="true"
                    />
                    {formatHackathonDate(hackathon.startDate)} –{" "}
                    {formatHackathonDate(hackathon.endDate)}
                  </p>
                  <p>
                    {hackathon.configuredStatusCount} of{" "}
                    {hackathon.requiredStatusCount} status emails configured
                  </p>
                  {hackathon.isConfigured ? null : (
                    <p className="font-medium text-destructive">
                      Not ready — set every status email before using it.
                    </p>
                  )}
                </div>
                <Button asChild className="min-h-11 w-full" variant="secondary">
                  <Link href={`/admin/hackathon/${hackathon.id}`}>
                    Configure
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <HackathonFormDialog
        onOpenChange={setCreating}
        onSaved={(created) => {
          setCreating(false);
          // Straight into the detail screen: a hackathon is unusable until its
          // status mail is configured, and that only exists there.
          router.push(`/admin/hackathon/${created.id}`);
        }}
        open={creating}
      />
    </main>
  );
}
