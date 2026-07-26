"use client";

import { useState } from "react";
import { ExternalLink, Loader2, SlidersHorizontal } from "lucide-react";

import type { GUILD } from "@forge/consts";
import { GUILD as GUILD_CONSTS } from "@forge/consts";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@forge/ui/dialog";
import { Switch } from "@forge/ui/switch";

import type { CurrentMember } from "~/hooks/use-member";
import { getGuildMemberUrl } from "~/lib/guild-urls";
import { api } from "~/trpc/react";

type OpportunityStatus = GUILD.GuildOpportunityStatus;

export function GuildPreferencesDialog({ member }: { member: CurrentMember }) {
  const apiUtils = api.useUtils();
  const [open, setOpen] = useState(false);
  const [profileVisible, setProfileVisible] = useState(
    member.guildProfileVisible,
  );
  const [resumeVisible, setResumeVisible] = useState(member.guildResumeVisible);
  const [opportunities, setOpportunities] = useState<OpportunityStatus[]>(
    member.guildOpportunityStatuses,
  );
  const [error, setError] = useState<string | null>(null);

  const updatePreferences = api.member.updateGuildPreferences.useMutation({
    async onSuccess() {
      await apiUtils.member.getMember.invalidate();
      setOpen(false);
    },
  });

  const toggleOpportunity = (status: OpportunityStatus) => {
    setOpportunities((current) =>
      current.includes(status)
        ? current.filter((candidate) => candidate !== status)
        : current.length < GUILD_CONSTS.GUILD_MAX_OPPORTUNITY_STATUSES
          ? [...current, status]
          : current,
    );
  };

  const resetDraft = () => {
    setProfileVisible(member.guildProfileVisible);
    setResumeVisible(member.guildResumeVisible);
    setOpportunities(member.guildOpportunityStatuses);
    setError(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) resetDraft();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-2">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          Guild preferences
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Guild preferences</DialogTitle>
          <DialogDescription>
            Choose what appears on your public Guild profile and how people can
            discover you.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <PreferenceSwitch
            checked={profileVisible}
            description="Turn this off to remove your profile from the public directory and profile pages."
            label="Show my profile on Guild"
            onCheckedChange={setProfileVisible}
          />
          <PreferenceSwitch
            checked={resumeVisible}
            description="Anyone can preview or download your uploaded resume while this is on."
            disabled={!profileVisible}
            label="Make my resume public"
            onCheckedChange={setResumeVisible}
          />

          <fieldset className="space-y-3">
            <div>
              <legend className="text-sm font-medium">
                Opportunity status
              </legend>
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                Choose up to {GUILD_CONSTS.GUILD_MAX_OPPORTUNITY_STATUSES}.
                These labels are public and searchable.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {GUILD_CONSTS.GUILD_OPPORTUNITY_STATUS_OPTIONS.map((status) => {
                const checked = opportunities.includes(status);
                const disabled =
                  !checked &&
                  opportunities.length >=
                    GUILD_CONSTS.GUILD_MAX_OPPORTUNITY_STATUSES;

                return (
                  <label
                    key={status}
                    className="flex cursor-pointer items-start gap-3 rounded-md border border-white/10 bg-background/60 p-3 text-sm has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50"
                  >
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={() => toggleOpportunity(status)}
                    />
                    <span className="leading-5">
                      {GUILD_CONSTS.GUILD_OPPORTUNITY_STATUS_LABELS[status]}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {profileVisible ? (
            <a
              href={getGuildMemberUrl(member.id)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              View your public Guild profile
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your public profile link becomes available when Guild visibility
              is on.
            </p>
          )}

          {error ? (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={updatePreferences.isPending}
            onClick={async () => {
              setError(null);
              try {
                await updatePreferences.mutateAsync({
                  guildOpportunityStatuses: opportunities,
                  guildProfileVisible: profileVisible,
                  guildResumeVisible: resumeVisible,
                });
              } catch (mutationError) {
                setError(
                  mutationError instanceof Error
                    ? mutationError.message
                    : "Guild preferences could not be saved.",
                );
              }
            }}
          >
            {updatePreferences.isPending ? (
              <Loader2
                className="mr-2 h-4 w-4 animate-spin"
                aria-hidden="true"
              />
            ) : null}
            Save preferences
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreferenceSwitch({
  checked,
  description,
  disabled = false,
  label,
  onCheckedChange,
}: {
  checked: boolean;
  description: string;
  disabled?: boolean;
  label: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-5 rounded-md border border-white/10 bg-background/60 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          {description}
        </p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onCheckedChange(value === true)}
      />
    </div>
  );
}
