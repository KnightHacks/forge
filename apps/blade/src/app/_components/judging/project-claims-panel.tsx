"use client";

import { useState } from "react";
import { Copy, Mail, Search, Settings, Users } from "lucide-react";

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
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { Switch } from "@forge/ui/switch";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

type Claims = RouterOutputs["judging"]["getClaimsAdmin"];
export function ProjectClaimsPanel({ hackathonId }: { hackathonId: string }) {
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<"settings" | "send" | null>(null);
  const data = api.judging.getClaimsAdmin.useQuery({ hackathonId, query });
  const utils = api.useUtils();
  const send = api.judging.sendClaimLinks.useMutation({
    onSuccess: async (result) => {
      toast[result.failed ? "error" : "success"](
        `${result.sent} sent${result.failed ? `, ${result.failed} failed. Retry to send the remaining links.` : "."}`,
      );
      setDialog(null);
      await utils.judging.getClaimsAdmin.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const copy = api.judging.copyClaimLink.useMutation({
    onSuccess: async ({ url }) => {
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Claim link copied.");
      } catch {
        toast.error(
          "Clipboard unavailable. Try again in a secure browser window.",
        );
      }
    },
    onError: (error) => toast.error(error.message),
  });
  if (data.isPending)
    return (
      <div
        className="h-72 animate-pulse rounded-xl bg-muted"
        aria-label="Loading project claims"
      />
    );
  if (!data.data)
    return (
      <p role="alert">
        {data.error.message}{" "}
        <Button onClick={() => void data.refetch()}>Retry</Button>
      </p>
    );
  const claims = data.data;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="size-5" /> Project claims
              </CardTitle>
              <CardDescription className="mt-2">
                Connect hackers to their teams before opening their judging
                itineraries.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setDialog("settings")}>
                <Settings className="mr-2 size-4" /> Publication settings
              </Button>
              <Button
                disabled={!claims.claimUrl || send.isPending}
                onClick={() => setDialog("send")}
              >
                <Mail className="mr-2 size-4" /> Send claim links
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-md border px-3 py-2">
              Schedule: {claims.published ? "Open to hackers" : "Not published"}
            </span>
            <span className="rounded-md border px-3 py-2">
              Access:{" "}
              {claims.emergency
                ? "Emergency project search · no feedback"
                : "Claimed projects only"}
            </span>
            {claims.locked && (
              <span className="rounded-md border px-3 py-2">
                Imports: add-only
              </span>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Team contacts & delivery</CardTitle>
          <CardDescription>
            Find a hacker to resend their email, copy an unused link, or open
            their linked Discord profile.
          </CardDescription>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              aria-label="Search claim recipients"
              placeholder="Project, name, or email"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div
            className="max-h-[36rem] overflow-auto rounded-lg border"
            tabIndex={0}
            aria-label="Project claim recipients"
          >
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="bg-background/60">
                <tr>
                  <th className="p-3">Hacker / project</th>
                  <th className="p-3">Contact</th>
                  <th className="p-3">Claim</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {claims.members.map((member) => (
                  <tr key={member.id}>
                    <td className="p-3">
                      <p className="font-medium">
                        {member.firstName
                          ? `${member.firstName} ${member.lastName ?? ""}`
                          : member.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.projectTitle}
                      </p>
                    </td>
                    <td className="p-3">
                      <a
                        className="break-all underline"
                        href={`mailto:${member.email}`}
                      >
                        {member.email}
                      </a>
                      {member.discordUserId ? (
                        <a
                          className="mt-1 block text-primary underline"
                          href={`https://discord.com/users/${member.discordUserId}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open Discord
                          {member.discordUser ? ` · ${member.discordUser}` : ""}
                        </a>
                      ) : member.discordUser ? (
                        <p>{member.discordUser}</p>
                      ) : null}
                    </td>
                    <td className="p-3">
                      {member.userId
                        ? "Claimed"
                        : member.usedAt
                          ? "Link used"
                          : member.invited
                            ? "Invited"
                            : "Unclaimed"}
                      <p className="text-xs text-muted-foreground">
                        {member.sentAt ? "Email sent" : "Not sent"}
                      </p>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={`Copy claim link for ${member.name}`}
                          disabled={
                            !!member.usedAt ||
                            copy.isPending ||
                            !claims.claimUrl
                          }
                          onClick={() =>
                            copy.mutate({ hackathonId, memberId: member.id })
                          }
                        >
                          <Copy className="size-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label={`Send claim email to ${member.name}`}
                          disabled={
                            !!member.usedAt ||
                            send.isPending ||
                            !claims.claimUrl
                          }
                          onClick={() =>
                            send.mutate({ hackathonId, memberId: member.id })
                          }
                        >
                          <Mail className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!claims.members.length && (
              <p className="p-6 text-muted-foreground">
                No matching team members.
              </p>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Showing up to 100 members. Narrow the search to find someone.
          </p>
        </CardContent>
      </Card>
      {dialog === "settings" && (
        <ClaimSettings
          key={hackathonId}
          hackathonId={hackathonId}
          data={claims}
          close={() => setDialog(null)}
        />
      )}
      <Dialog
        open={dialog === "send"}
        onOpenChange={(open) => {
          if (!open && !send.isPending) setDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send project claim emails?</DialogTitle>
            <DialogDescription>
              Send a personal link to each recipient who has not received one.
              Links already delivered are skipped. Hackers must check in before
              claiming.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={send.isPending}
              onClick={() => setDialog(null)}
            >
              Cancel
            </Button>
            <Button
              disabled={send.isPending}
              onClick={() => send.mutate({ hackathonId })}
            >
              {send.isPending ? "Sending…" : "Send claim links"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClaimSettings({
  hackathonId,
  data,
  close,
}: {
  hackathonId: string;
  data: Claims;
  close: () => void;
}) {
  const [form, setForm] = useState({
    published: data.published,
    emergency: data.emergency,
    claimUrl: data.claimUrl,
  });
  const utils = api.useUtils();
  const save = api.judging.setClaimSettings.useMutation({
    onSuccess: async () => {
      await utils.judging.getClaimsAdmin.invalidate();
      toast.success("Hacker judging settings saved.");
      close();
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) close();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hacker judging publication</DialogTitle>
          <DialogDescription>
            Claims can happen before scheduling. Opening the schedule controls
            when hackers see their times.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="claim-url">Hacker portal claim-page URL</Label>
            <Input
              id="claim-url"
              type="url"
              placeholder="https://…/dashboard/judging"
              value={form.claimUrl}
              onChange={(event) =>
                setForm({ ...form, claimUrl: event.target.value })
              }
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="schedule-published">Open schedule</Label>
              <p className="text-sm text-muted-foreground">
                Publish a saved schedule to checked-in hackers.
              </p>
            </div>
            <Switch
              id="schedule-published"
              checked={form.published}
              onCheckedChange={(published) => setForm({ ...form, published })}
            />
          </div>
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="schedule-emergency">
                Emergency project search
              </Label>
              <Switch
                id="schedule-emergency"
                checked={form.emergency}
                onCheckedChange={(emergency) => setForm({ ...form, emergency })}
              />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Any checked-in hacker can look up one project's itinerary at a
              time. All scores and feedback are hidden. The schedule must be
              open first.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={save.isPending} onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={save.isPending}
            onClick={() => save.mutate({ hackathonId, ...form })}
          >
            {save.isPending ? "Saving…" : "Save settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
