"use client";

import { useState } from "react";

import type { RouterOutputs } from "@forge/api";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";
import { toast } from "@forge/ui/toast";

import { useNavigationRouter as useRouter } from "~/app/_components/shared/route-transition-link";
import { api } from "~/trpc/react";

type Data = RouterOutputs["judging"]["listAdmin"];
type Challenge = Data["challenges"][number];
interface GroupValues {
  isMlhImportDefault: boolean;
  label: string;
  isGeneral: boolean;
  isScheduled: boolean;
}

function GroupForm({
  group,
  disabled,
  onSave,
  onDelete,
}: {
  group?: Challenge;
  disabled: boolean;
  onSave: (values: GroupValues) => Promise<void>;
  onDelete?: () => Promise<void>;
}) {
  return (
    <form
      aria-label={
        group ? `Judging group ${group.label}` : "Create judging group"
      }
      className="flex min-w-0 flex-wrap items-end gap-3 rounded-md border border-border p-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const values = new FormData(form);
        const label = values.get("label");
        void onSave({
          label: typeof label === "string" ? label : "",
          isGeneral: values.has("everyProject"),
          isMlhImportDefault: values.has("mlhDefault"),
          isScheduled: values.has("scheduled"),
        })
          .then(() => {
            if (!group) form.reset();
          })
          .catch(() => undefined);
      }}
    >
      <label className="min-w-0 basis-full space-y-1 text-sm font-medium">
        <span>
          {group ? `Group name: ${group.label}` : "New judging group"}
        </span>
        <Input
          name="label"
          defaultValue={group?.label ?? ""}
          disabled={disabled}
          required
          maxLength={255}
          className="h-11"
        />
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="everyProject"
          defaultChecked={group?.isGeneral ?? false}
          disabled={disabled}
        />
        Every project
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="scheduled"
          defaultChecked={group?.isScheduled ?? true}
          disabled={disabled}
        />
        Scheduled
      </label>
      <label className="flex min-h-11 items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="mlhDefault"
          defaultChecked={group?.isMlhImportDefault ?? false}
          disabled={disabled}
        />
        Default for MLH imports
      </label>
      <Button type="submit" disabled={disabled} className="h-11">
        {group ? "Save group" : "Create group"}
      </Button>
      {onDelete ? (
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className="h-11"
          onClick={() => void onDelete().catch(() => undefined)}
        >
          Delete group
        </Button>
      ) : null}
    </form>
  );
}

export function ChallengeConfigurationPanel({ data }: { data: Data }) {
  const router = useRouter();
  const utils = api.useUtils();
  const update = api.projects.updateChallenge.useMutation();
  const createGroup = api.projects.createGroup.useMutation();
  const updateGroup = api.projects.updateGroup.useMutation();
  const deleteGroup = api.projects.deleteGroup.useMutation();
  const [query, setQuery] = useState("");
  const pending =
    update.isPending ||
    createGroup.isPending ||
    updateGroup.isPending ||
    deleteGroup.isPending;
  const locked = data.challengeSetupLocked;
  const disabled = locked || pending;

  async function change(action: () => Promise<unknown>, message: string) {
    try {
      await action();
      await Promise.all([
        utils.projects.invalidate(),
        utils.judging.listScheduleAdmin.invalidate(),
      ]);
      router.refresh();
      toast.success(message);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update judging setup.",
      );
      throw error;
    }
  }
  const groups = data.challenges.filter((challenge) => challenge.isGroup);
  const imported = data.challenges.filter(
    (challenge) =>
      !challenge.isGroup &&
      challenge.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  );

  return (
    <section
      className="min-w-0 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5"
      aria-labelledby="challenge-setup-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="challenge-setup-title" className="text-lg font-semibold">
          Judging groups and challenges
        </h2>
        {locked ? <Badge variant="secondary">Setup locked</Badge> : null}
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Groups share one evaluation and appointment across their challenges. You
        can rename or remove the starter groups, or create your own.
        Every-project groups include all projects; no such group is required.
      </p>
      {locked ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Setup is locked after a schedule is saved or feedback starts.
        </p>
      ) : null}
      <div className="mt-4 space-y-3" aria-label="Judging groups">
        {groups.map((group) => (
          <GroupForm
            key={`${group.id}:${group.label}:${group.isGeneral}:${group.isScheduled}:${group.isMlhImportDefault}`}
            group={group}
            disabled={disabled}
            onSave={(values) =>
              change(
                () =>
                  updateGroup.mutateAsync({
                    ...values,
                    hackathonId: data.hackathon.id,
                    groupId: group.id,
                  }),
                "Group updated.",
              )
            }
            onDelete={() =>
              change(
                () =>
                  deleteGroup.mutateAsync({
                    hackathonId: data.hackathon.id,
                    groupId: group.id,
                  }),
                "Group deleted. Its challenges are now standalone.",
              )
            }
          />
        ))}
        <GroupForm
          disabled={disabled}
          onSave={(values) =>
            change(
              () =>
                createGroup.mutateAsync({
                  ...values,
                  hackathonId: data.hackathon.id,
                }),
              "Group created.",
            )
          }
        />
      </div>
      <h3 className="mt-6 font-semibold">Imported challenges</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Challenges come from Devpost. New MLH challenges default to the MLH
        group; your grouping changes survive re-imports. Child tags stay visible
        on projects and during judging, but children and every-project groups
        are hidden from search filters. Deleting a group keeps its imported
        challenges.
      </p>
      <Input
        className="mt-4 h-11"
        aria-label="Find a challenge"
        placeholder="Find a challenge…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div
        className="mt-3 max-h-96 overflow-y-auto rounded-md border border-border"
        tabIndex={0}
        aria-label="Challenge configuration"
      >
        {imported.length ? (
          imported.map((challenge) => (
            <div
              className="flex flex-col gap-2 border-b border-border p-3 last:border-b-0 sm:flex-row sm:items-center sm:gap-4"
              key={challenge.id}
            >
              <div className="min-w-0 flex-1 break-words text-sm font-medium">
                {challenge.label}
              </div>
              <label className="min-w-0 space-y-1 sm:w-60">
                <span className="text-xs text-muted-foreground">
                  Collapse into
                </span>
                <select
                  className="h-11 w-full rounded-md border border-input bg-background px-2 text-sm"
                  aria-label={`Collapse ${challenge.label} into`}
                  value={challenge.parentId ?? ""}
                  disabled={disabled}
                  onChange={(event) =>
                    void change(
                      () =>
                        update.mutateAsync({
                          hackathonId: data.hackathon.id,
                          challengeId: challenge.id,
                          parentId: event.target.value || null,
                          isScheduled: challenge.isScheduled,
                        }),
                      "Challenge updated.",
                    ).catch(() => undefined)
                  }
                >
                  <option value="">Standalone challenge</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  aria-label={`Schedule ${challenge.label}`}
                  checked={
                    challenge.parentId
                      ? (groups.find((group) => group.id === challenge.parentId)
                          ?.isScheduled ?? true)
                      : challenge.isScheduled
                  }
                  disabled={disabled || !!challenge.parentId}
                  onChange={(event) =>
                    void change(
                      () =>
                        update.mutateAsync({
                          hackathonId: data.hackathon.id,
                          challengeId: challenge.id,
                          parentId: challenge.parentId,
                          isScheduled: event.target.checked,
                        }),
                      "Challenge updated.",
                    ).catch(() => undefined)
                  }
                />
                Scheduled
              </label>
            </div>
          ))
        ) : (
          <p className="p-4 text-sm text-muted-foreground">
            No matching imported challenges.
          </p>
        )}
      </div>
    </section>
  );
}
