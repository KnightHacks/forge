"use client";

import type { SetStateAction } from "react";
import { useCallback, useState } from "react";
import { BellRing, Hash, Loader2, Save, ShieldCheck } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@forge/ui/card";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

const DISCORD_SNOWFLAKE = /^[0-9]{17,20}$/;

function validOptionalSnowflake(value: string) {
  return value === "" || DISCORD_SNOWFLAKE.test(value);
}

function useScopedState<Value>(scope: string, initial: Value) {
  const [state, setState] = useState({ scope, value: initial });
  const value = state.scope === scope ? state.value : initial;
  const update = useCallback(
    (next: SetStateAction<Value>) => {
      setState((current) => {
        const currentValue = current.scope === scope ? current.value : initial;
        return {
          scope,
          value:
            typeof next === "function"
              ? (next as (current: Value) => Value)(currentValue)
              : next,
        };
      });
    },
    [initial, scope],
  );
  return [value, update] as const;
}

export function HackathonDiscordEventConfig({
  hackathonId,
  isRefreshing,
  onSaved,
}: {
  hackathonId: string;
  isRefreshing: boolean;
  onSaved: () => void;
}) {
  const utils = api.useUtils();
  const config = api.hackathonEvent.getDiscordConfig.useQuery({ hackathonId });
  const roles = api.roles.listDiscordOptions.useQuery(undefined, {
    retry: false,
  });
  const channels = api.roles.listReminderChannels.useQuery(undefined, {
    retry: false,
  });
  const configScope = config.data
    ? `${config.data.id}:${config.data.generalHackerDiscordRoleId ?? ""}:${config.data.eventAnnouncementChannelId ?? ""}`
    : hackathonId;
  const [announcementChannelId, setAnnouncementChannelId] = useScopedState(
    configScope,
    config.data?.eventAnnouncementChannelId ?? "",
  );
  const [generalRoleId, setGeneralRoleId] = useScopedState(
    configScope,
    config.data?.generalHackerDiscordRoleId ?? "",
  );

  const update = api.hackathonEvent.updateDiscordConfig.useMutation({
    onError: (error) => toast.error(error.message),
    onSuccess: async () => {
      toast.success("Hackathon Discord configuration saved.");
      await utils.hackathonEvent.getDiscordConfig.invalidate({ hackathonId });
      onSaved();
    },
  });

  const valid =
    validOptionalSnowflake(announcementChannelId.trim()) &&
    validOptionalSnowflake(generalRoleId.trim());
  const changed =
    announcementChannelId.trim() !==
      (config.data?.eventAnnouncementChannelId ?? "") ||
    generalRoleId.trim() !== (config.data?.generalHackerDiscordRoleId ?? "");
  const busy = config.isPending || update.isPending || isRefreshing;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5" aria-hidden="true" /> Hackathon
          Discord
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {config.isError ? (
          <div className="grid justify-items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive">
              Discord configuration could not be loaded.
            </p>
            <Button
              className="min-h-11"
              onClick={() => void config.refetch()}
              size="sm"
              variant="secondary"
            >
              Try again
            </Button>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="hackathon-general-role">General hacker role</Label>
            <ResponsiveComboBox
              ariaLabel="General hacker role"
              buttonPlaceholder="Choose a Discord role"
              emptyMessage="No roles found. Use the role ID fallback below."
              getItemLabel={(role) => role.name}
              getItemSearchValue={(role) => `${role.name} ${role.id}`}
              getItemValue={(role) => role.id}
              inputPlaceholder="Search Discord roles"
              isDisabled={busy}
              isLoading={roles.isLoading}
              items={roles.data ?? []}
              onValueChange={setGeneralRoleId}
              renderItem={(role) => role.name}
              triggerClassName="h-11 bg-background/70"
              triggerId="hackathon-general-role"
              value={generalRoleId || null}
            />
            <Input
              aria-label="General hacker role ID fallback"
              className="h-11 bg-background/70 font-mono"
              disabled={busy || config.isError}
              inputMode="numeric"
              maxLength={20}
              onChange={(event) => setGeneralRoleId(event.target.value)}
              placeholder="Manual role ID fallback"
              value={generalRoleId}
            />
            <p className="text-sm text-muted-foreground">
              Granted to every hacker admitted through primary check-in.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hackathon-announcement-channel">
              Event announcement channel
            </Label>
            <ResponsiveComboBox
              ariaLabel="Event announcement channel"
              buttonPlaceholder="Choose a text channel"
              emptyMessage="No writable channels found. Use the channel ID fallback below."
              getItemLabel={(channel) => `#${channel.name}`}
              getItemSearchValue={(channel) => `${channel.name} ${channel.id}`}
              getItemValue={(channel) => channel.id}
              inputPlaceholder="Search text channels"
              isDisabled={busy}
              isLoading={channels.isLoading}
              items={channels.data ?? []}
              onValueChange={setAnnouncementChannelId}
              renderItem={(channel) => (
                <span className="flex min-w-0 items-center gap-2">
                  <Hash
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span className="truncate">{channel.name}</span>
                </span>
              )}
              triggerClassName="h-11 bg-background/70"
              triggerId="hackathon-announcement-channel"
              value={announcementChannelId || null}
            />
            <Input
              aria-label="Event announcement channel ID fallback"
              className="h-11 bg-background/70 font-mono"
              disabled={busy || config.isError}
              inputMode="numeric"
              maxLength={20}
              onChange={(event) => setAnnouncementChannelId(event.target.value)}
              placeholder="Manual channel ID fallback"
              value={announcementChannelId}
            />
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <BellRing className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Hackathon event reminders are delivered here and ping this
              hackathon&apos;s general role.
            </p>
          </div>
        </div>

        {!valid ? (
          <p className="text-sm text-destructive">
            Discord IDs must contain 17 to 20 digits, or be left blank.
          </p>
        ) : null}

        <Button
          className="min-h-11 w-fit gap-2"
          disabled={busy || config.isError || !valid || !changed}
          onClick={() =>
            update.mutate({
              eventAnnouncementChannelId: announcementChannelId.trim() || null,
              generalHackerDiscordRoleId: generalRoleId.trim() || null,
              hackathonId,
            })
          }
        >
          {update.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          Save Discord configuration
        </Button>
      </CardContent>
    </Card>
  );
}
