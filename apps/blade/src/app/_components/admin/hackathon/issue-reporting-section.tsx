"use client";

import { useState } from "react";
import { Loader2, MessageSquare, Save } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Button } from "@forge/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@forge/ui/card";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

export function IssueReportingSection({
  hackathonId,
}: {
  hackathonId: string;
}) {
  const query = api.hackathon.getIssueReporting.useQuery({ id: hackathonId });
  const utils = api.useUtils();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="size-5" aria-hidden="true" /> Hacker issue
          reports
        </CardTitle>
        <CardDescription>
          Choose the private organizer channel for this hackathon and the role
          to notify when a hacker sends a report.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {query.isPending ? (
          <p className="text-sm text-muted-foreground">
            Loading reporting settings…
          </p>
        ) : query.isError ? (
          <div className="grid gap-3" role="alert">
            <p className="text-sm text-destructive">
              Could not load reporting settings.
            </p>
            <Button
              className="min-h-11 w-fit"
              onClick={() => void query.refetch()}
              variant="outline"
            >
              Try again
            </Button>
          </div>
        ) : (
          <IssueReportingEditor
            key={`${hackathonId}:${query.data.issueReportsChannelId}:${query.data.issueReportsRoleId}`}
            hackathonId={hackathonId}
            settings={query.data}
            onSaved={() =>
              void utils.hackathon.getIssueReporting.invalidate({
                id: hackathonId,
              })
            }
          />
        )}
      </CardContent>
    </Card>
  );
}

function IssueReportingEditor({
  hackathonId,
  settings,
  onSaved,
}: {
  hackathonId: string;
  settings: RouterOutputs["hackathon"]["getIssueReporting"];
  onSaved: () => void;
}) {
  const [channel, setChannel] = useState(settings.issueReportsChannelId ?? "");
  const [role, setRole] = useState(settings.issueReportsRoleId ?? "");
  const save = api.hackathon.updateIssueReporting.useMutation({
    onSuccess: () => {
      toast.success("Issue reporting settings saved.");
      onSaved();
    },
    onError: (error) => toast.error(error.message),
  });
  const valid = [channel.trim(), role.trim()].every(
    (value) => !value || /^[0-9]{17,20}$/.test(value),
  );
  const unchanged =
    channel.trim() === (settings.issueReportsChannelId ?? "") &&
    role.trim() === (settings.issueReportsRoleId ?? "");
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="issue-report-channel">Discord channel ID</Label>
          <Input
            id="issue-report-channel"
            className="h-11 bg-background/70 font-mono"
            inputMode="numeric"
            maxLength={64}
            disabled={save.isPending}
            value={channel}
            onChange={(event) => setChannel(event.target.value)}
            placeholder="Channel ID"
          />
          <p className="text-sm text-muted-foreground">
            Leave empty to disable reports. The bot needs View Channel, Send
            Messages, and Embed Links.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="issue-report-role">Role to ping (optional)</Label>
          <Input
            id="issue-report-role"
            className="h-11 bg-background/70 font-mono"
            inputMode="numeric"
            maxLength={64}
            disabled={save.isPending}
            value={role}
            onChange={(event) => setRole(event.target.value)}
            placeholder="Role ID"
          />
          <p className="text-sm text-muted-foreground">
            Leave empty to send without a ping. Allow the bot to mention this
            role.
          </p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        Enable Developer Mode in Discord, then right-click the channel or role
        and copy its ID. Reports include the hacker’s name and Discord ID; keep
        this channel private to organizers.
      </p>
      {!valid && (
        <p className="text-sm text-destructive" role="alert">
          Use a 17–20 digit Discord ID, not a channel link or role mention.
        </p>
      )}
      <Button
        className="min-h-11 w-fit gap-2"
        disabled={save.isPending || !valid || unchanged}
        onClick={() =>
          save.mutate({
            hackathonId,
            issueReportsChannelId: channel.trim() || null,
            issueReportsRoleId: role.trim() || null,
          })
        }
      >
        {save.isPending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <Save className="size-4" aria-hidden="true" />
        )}
        Save reporting settings
      </Button>
    </div>
  );
}
