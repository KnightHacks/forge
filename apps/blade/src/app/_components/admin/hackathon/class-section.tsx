"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Sparkles, Trash2, Users } from "lucide-react";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { ResponsiveComboBox } from "@forge/ui/responsive-combo-box";
import { Switch } from "@forge/ui/switch";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

type Detail = RouterOutputs["hackathon"]["get"];
type HackathonClass = Detail["classes"][number];

/**
 * Only the three fields `DiscordRoleField` reads, rather than the whole
 * `useQuery` return type — that one is generic enough that inference gives up
 * and widens `data` to `{}`.
 */
interface DiscordRoleQuery {
  data?: RouterOutputs["roles"]["listDiscordOptions"];
  isError: boolean;
  isLoading: boolean;
}

export function ClassSection({
  detail,
  isRefreshing,
  onSaved,
}: {
  detail: Detail;
  isRefreshing: boolean;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState<HackathonClass | null>(null);

  const removed = api.hackathon.removeClass.useMutation({
    // Refreshes on failure too. The common error here is another officer having
    // already deleted the class, and toasting without refreshing leaves the
    // phantom row on screen with live Edit and Remove buttons that re-toast on
    // every click.
    onError: (error) => {
      toast.error(error.message);
      onSaved();
    },
    onSuccess: () => {
      toast.success("Class removed.");
      onSaved();
    },
  });

  const hasVip = detail.classes.some(
    (hackathonClass) => hackathonClass.kind === "vip",
  );

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <Users className="size-5" aria-hidden="true" /> Classes
        </CardTitle>
        <CardDescription>
          Optional. Classes stagger a large crowd through things like meals, and
          the split is themed to make it enjoyable rather than bureaucratic. Add
          as many as this hackathon needs. VIP is configured here too but is not
          one of them — a VIP ignores class boundaries entirely, and is held
          alongside a class rather than instead of one.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          Linking a Discord role here records the link and nothing else. No role
          is granted and nothing changes in Discord. Roles are applied when
          hackers check in, which does not exist yet — so every headcount below
          reads zero until it does.
        </p>

        {detail.classes.length > 0 ? (
          <ul className="grid gap-3">
            {detail.classes.map((hackathonClass) => (
              <ClassRow
                hackathonClass={hackathonClass}
                key={hackathonClass.id}
                onEdit={() => setEditing(hackathonClass)}
                onRemove={() => removed.mutate({ id: hackathonClass.id })}
                removing={
                  removed.isPending &&
                  removed.variables.id === hackathonClass.id
                }
                // Stays disabled through the refresh: the row is still
                // rendered from stale props until the new ones land, and a
                // second click on a row that visibly did not disappear
                // produces a NOT_FOUND toast for a delete that worked.
                busy={removed.isPending || isRefreshing}
              />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No classes yet. A hackathon without them is perfectly valid.
          </p>
        )}

        <ClassAddForm
          hackathonId={detail.hackathon.id}
          hasVip={hasVip}
          isRefreshing={isRefreshing}
          onAdded={onSaved}
        />
      </CardContent>

      <ClassEditDialog
        hackathonClass={editing}
        onOpenChange={(next) => {
          if (!next) setEditing(null);
        }}
        onSaved={onSaved}
        open={editing !== null}
      />
    </Card>
  );
}

/**
 * `kind` is inside the draft and `usingPicker` is outside it, and the split is
 * the point: everything here is cleared after a successful add, and those two
 * belong on opposite sides of that line.
 *
 * `kind` inside — leaving it out meant adding the VIP entry left the form in
 * VIP mode with the toggle on and *not* disabled, so the next class was
 * created against a button reading "Add VIP".
 *
 * `usingPicker` outside — it is a UI preference, not data. Resetting it sent an
 * officer who had just pasted an ID (because the cached role list lags a
 * freshly created role) straight back to the picker that does not have it.
 */
interface ClassDraft {
  color: string;
  discordRoleId: string;
  kind: "class" | "vip";
  name: string;
}

/**
 * Mirrors `hackathonClassColorSchema` and `hackathonClassDiscordRoleSchema`.
 *
 * Not defence in depth — the server is still the authority. This exists because
 * both fields are free text and `toast.error(error.message)` prints tRPC's
 * message for an input-parse failure, which is a pretty-printed ZodError blob
 * rather than "Use a six-digit hex colour". Keeping Save disabled means the
 * officer never sees that. The colour case is worse than a bad message: the
 * value is also bound to `<input type="color">`, which coerces anything it
 * cannot parse to #000000, so the swatch silently goes black while the text
 * field still shows what was typed.
 */
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const DISCORD_SNOWFLAKE = /^[0-9]{17,20}$/;

function isCompleteClassDraft(draft: {
  color: string;
  discordRoleId: string;
  name: string;
}) {
  return (
    draft.name.trim() !== "" &&
    HEX_COLOR.test(draft.color.trim()) &&
    DISCORD_SNOWFLAKE.test(draft.discordRoleId.trim())
  );
}

const EMPTY_DRAFT: ClassDraft = {
  color: "#4F46E5",
  discordRoleId: "",
  kind: "class",
  name: "",
};

function ClassAddForm({
  hackathonId,
  hasVip,
  isRefreshing,
  onAdded,
}: {
  hackathonId: string;
  hasVip: boolean;
  isRefreshing: boolean;
  onAdded: () => void;
}) {
  const [draft, setDraft] = useState<ClassDraft>(EMPTY_DRAFT);
  const [usingPicker, setUsingPicker] = useState(true);
  const patch = (next: Partial<ClassDraft>) =>
    setDraft((current) => ({ ...current, ...next }));
  const kind = draft.kind;

  // Read-only. Note this procedure *does* run `filterDiscordRolesForLinking`,
  // which hides managed roles and any role already linked to a `Roles` row —
  // even though a class is allowed to share a role with anything. There is no
  // unfiltered guild-role procedure, so the paste field is the path for those,
  // and `DiscordRoleField` falls back to it whenever the current value is not
  // one the picker can display.
  const guildRoles = api.roles.listDiscordOptions.useQuery(undefined, {
    retry: false,
  });

  const created = api.hackathon.createClass.useMutation({
    onError: (error) => toast.error(error.message),
    onSuccess: () => {
      toast.success("Class added.");
      setDraft(EMPTY_DRAFT);
      onAdded();
    },
  });

  const complete = isCompleteClassDraft(draft);
  const noun = kind === "vip" ? "VIP" : "class";

  return (
    <div className="grid gap-3 rounded-md border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">Add a {noun}</p>
          <p className="text-sm text-muted-foreground">
            {kind === "vip"
              ? "A VIP ignores class boundaries: when class A is called, a VIP assigned to class B may still go. A hacker holds it alongside a class, not instead of one."
              : "An ordinary class. The plan is that hackers get whichever one has the fewest people at check-in — that assignment is not built yet."}
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm">
          <Switch
            checked={kind === "vip"}
            // No `aria-label`: the wrapping <label> already names it, and an
            // aria-label would override the visible "VIP" so voice control
            // could not target it.
            disabled={hasVip && kind !== "vip"}
            onCheckedChange={(next) => patch({ kind: next ? "vip" : "class" })}
          />
          <span>
            {hasVip && kind !== "vip" ? "VIP already configured" : "VIP"}
          </span>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="class-name">Name</Label>
          <Input
            id="class-name"
            // Matches `hackathonClassNameSchema`'s `.max(64)`, so an over-long
            // paste cannot reach Zod and surface as a raw error blob.
            maxLength={64}
            onChange={(event) => patch({ name: event.target.value })}
            placeholder={kind === "vip" ? "VIP" : "Operators"}
            value={draft.name}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="class-color">Colour</Label>
          <div className="flex items-center gap-2">
            <Input
              className="h-11 w-16 p-1"
              id="class-color"
              onChange={(event) => patch({ color: event.target.value })}
              type="color"
              value={draft.color}
            />
            <Input
              aria-label="Class colour hex"
              className="font-mono"
              onChange={(event) => patch({ color: event.target.value })}
              value={draft.color}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Chosen here, not read from the Discord role, so it can change
            without touching Discord.
          </p>
        </div>
      </div>

      <DiscordRoleField
        fieldId="class-role"
        onChange={(discordRoleId) => patch({ discordRoleId })}
        onPreferPaste={() => setUsingPicker(false)}
        preferPicker={usingPicker}
        roles={guildRoles}
        setPreferPicker={setUsingPicker}
        value={draft.discordRoleId}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          className="min-h-11 gap-2"
          disabled={created.isPending || isRefreshing || !complete}
          onClick={() =>
            created.mutate({
              color: draft.color,
              discordRoleId: draft.discordRoleId,
              hackathonId,
              kind,
              name: draft.name,
            })
          }
        >
          {created.isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="size-4" aria-hidden="true" />
          )}
          Add {noun}
        </Button>
      </div>
    </div>
  );
}

/**
 * Editing an existing class. `kind` is deliberately absent: a class cannot
 * become the VIP entry or stop being it, because the partial unique index
 * allows one VIP per hackathon and flipping `kind` would have to contend with
 * it. Delete and re-add is the honest path for that, and it is available while
 * nobody is assigned — which is exactly when changing `kind` still makes sense.
 */
function ClassEditDialog({
  hackathonClass,
  onOpenChange,
  onSaved,
  open,
}: {
  hackathonClass: HackathonClass | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  open: boolean;
}) {
  const [draft, setDraft] = useState({
    color: "",
    discordRoleId: "",
    name: "",
  });
  const [usingPicker, setUsingPicker] = useState(true);
  const patch = (next: Partial<typeof draft>) =>
    setDraft((current) => ({ ...current, ...next }));

  // Same render-phase re-seed as the hackathon dialog, and for the same reason:
  // this component stays mounted, so without it the second class an officer
  // edits would open holding the first one's values.
  const [seededId, setSeededId] = useState<string | null>(null);
  if (open && hackathonClass && seededId !== hackathonClass.id) {
    setSeededId(hackathonClass.id);
    setDraft({
      color: hackathonClass.color,
      discordRoleId: hackathonClass.discordRoleId,
      name: hackathonClass.name,
    });
    // Reset per class, unlike the add form, where the preference is
    // deliberately sticky across adds. Here each open is a different class:
    // editing one whose role is not in the picker left the field in paste mode
    // for the next class, and clicking "Choose from list" there wiped a stored
    // role id that was perfectly valid.
    setUsingPicker(true);
  }
  if (!open && seededId !== null) setSeededId(null);

  const guildRoles = api.roles.listDiscordOptions.useQuery(undefined, {
    retry: false,
  });

  const saved = api.hackathon.updateClass.useMutation({
    // Closes on failure as well: the class may have been deleted elsewhere, and
    // leaving the dialog open over a row that no longer exists gives the officer
    // nothing to do but cancel.
    onError: (error) => {
      toast.error(error.message);
      onOpenChange(false);
      onSaved();
    },
    onSuccess: () => {
      toast.success("Class saved.");
      onOpenChange(false);
      onSaved();
    },
  });

  const complete = isCompleteClassDraft(draft);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="break-words leading-tight">
            Edit {hackathonClass?.name}
          </DialogTitle>
          <DialogDescription>
            Changing the Discord role here records the new link. Nothing is
            granted or revoked in Discord — roles apply at check-in.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-class-name">Name</Label>
            <Input
              id="edit-class-name"
              maxLength={64}
              onChange={(event) => patch({ name: event.target.value })}
              value={draft.name}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-class-color">Colour</Label>
            <div className="flex items-center gap-3">
              <input
                className="size-10 shrink-0 cursor-pointer rounded-md border bg-transparent"
                id="edit-class-color"
                onChange={(event) => patch({ color: event.target.value })}
                type="color"
                value={draft.color}
              />
              <Input
                aria-label="Class colour hex"
                className="font-mono"
                onChange={(event) => patch({ color: event.target.value })}
                value={draft.color}
              />
            </div>
          </div>

          <DiscordRoleField
            fieldId="edit-class-role"
            onChange={(discordRoleId) => patch({ discordRoleId })}
            onPreferPaste={() => setUsingPicker(false)}
            preferPicker={usingPicker}
            roles={guildRoles}
            setPreferPicker={setUsingPicker}
            value={draft.discordRoleId}
          />
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button
            className="min-h-11 gap-2"
            disabled={saved.isPending || !complete || !hackathonClass}
            onClick={() =>
              hackathonClass &&
              saved.mutate({
                color: draft.color,
                discordRoleId: draft.discordRoleId,
                id: hackathonClass.id,
                name: draft.name,
              })
            }
          >
            {saved.isPending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : null}
            Save class
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The Discord role input, shared by the add form and the edit dialog.
 *
 * Two bugs live in the interaction between the picker and the paste field, and
 * both are why this is one component rather than two copies:
 *
 * The control shown depends on `preferPicker` **and** whether any roles loaded,
 * but the toggle's label used to read from `preferPicker` alone. With Discord
 * unreachable the officer was already typing into the paste field while the
 * link said "Other — paste an ID"; clicking it wiped what they had typed and
 * re-rendered the identical field. The label now reads from what is actually on
 * screen, and the value is only cleared when the control really changes.
 *
 * And typing into the paste field pins it. The role list arriving late used to
 * swap the control out from under a typed id, leaving the combo box showing
 * "Choose a Discord role" while the draft still held a value the officer could
 * no longer see or clear.
 *
 * The third case is why `showingPicker` also tests whether the current value is
 * *in* the list. `roles.listDiscordOptions` runs `filterDiscordRolesForLinking`,
 * which drops managed roles and every role already linked to a `Roles` row — but
 * a class is explicitly allowed to point at exactly those. So a class linked to,
 * say, the club's Hacker role has a role id the picker will never contain, and
 * showing the picker would render a placeholder over a real stored value that
 * Save would then write back invisibly. Whenever the value cannot be displayed
 * by the picker, the field falls back to showing the id itself.
 */
function DiscordRoleField({
  fieldId,
  onChange,
  onPreferPaste,
  preferPicker,
  roles,
  setPreferPicker,
  value,
}: {
  fieldId: string;
  onChange: (value: string) => void;
  onPreferPaste: () => void;
  preferPicker: boolean;
  roles: DiscordRoleQuery;
  setPreferPicker: (next: boolean) => void;
  value: string;
}) {
  const roleOptions = roles.data ?? [];
  const valueIsSelectable =
    value === "" || roleOptions.some((role) => role.id === value);
  const showingPicker =
    preferPicker && roleOptions.length > 0 && valueIsSelectable;

  return (
    <div className="grid gap-2">
      <Label htmlFor={fieldId}>Discord role</Label>
      {showingPicker ? (
        <ResponsiveComboBox
          ariaLabel="Discord role"
          buttonPlaceholder="Choose a Discord role"
          getItemLabel={(role) => role.name}
          getItemValue={(role) => role.id}
          inputPlaceholder="Search roles..."
          isLoading={roles.isLoading}
          items={roleOptions}
          onValueChange={onChange}
          renderItem={(role) => role.name}
          triggerId={fieldId}
          value={value || null}
        />
      ) : (
        <Input
          className="font-mono"
          id={fieldId}
          onChange={(event) => {
            // Pins the paste field, so a role list resolving mid-type cannot
            // swap the control and hide what was typed.
            onPreferPaste();
            onChange(event.target.value);
          }}
          placeholder="990000000000000201"
          value={value}
        />
      )}
      <div className="flex flex-wrap items-center gap-2">
        {/* Paste stays available permanently, not only when Discord is
            down: a role created seconds ago can lag the cached list. */}
        {roleOptions.length > 0 ? (
          <Button
            className="h-auto p-0 text-xs"
            onClick={() => {
              onChange("");
              setPreferPicker(!showingPicker);
            }}
            type="button"
            variant="link"
          >
            {showingPicker ? "Other — paste an ID" : "Choose from list"}
          </Button>
        ) : null}
        {!valueIsSelectable && roleOptions.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            This role is not in the list — it is already linked elsewhere in
            Blade, or it is managed by Discord. Classes may still use it.
          </span>
        ) : null}
        {roles.isError ? (
          <span className="text-xs text-muted-foreground">
            Discord is unreachable, so paste the ID instead.
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ClassRow({
  busy,
  hackathonClass,
  onEdit,
  onRemove,
  removing,
}: {
  busy: boolean;
  hackathonClass: HackathonClass;
  onEdit: () => void;
  onRemove: () => void;
  removing: boolean;
}) {
  return (
    <li className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-md border p-3">
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="size-6 shrink-0 rounded-full border"
          style={{ backgroundColor: hackathonClass.color }}
        />
        <div className="min-w-0">
          {/* A div, not a p: `Badge` renders a div, and a div inside a p is a
              hydration error. */}
          <div className="flex items-center gap-2 font-medium">
            <span className="break-words">{hackathonClass.name}</span>
            {hackathonClass.kind === "vip" ? (
              <Badge className="gap-1" variant="secondary">
                <Sparkles className="size-3" aria-hidden="true" /> VIP
              </Badge>
            ) : null}
          </div>
          <p className="font-mono text-xs text-muted-foreground">
            {hackathonClass.discordRoleId}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">
          {hackathonClass.memberCount} assigned
        </span>
        {/*
          Editing is the only recovery from a mistyped role id. Deleting stops
          working the moment a hacker is assigned, and a class pointing at the
          wrong Discord role would then be permanently wrong.
        */}
        {/*
          Deliberately not disabled on `busy`. Radix restores focus to this
          button when the edit dialog closes, and `focus()` on a disabled
          element is a no-op — so disabling it during the refresh that follows a
          save dropped a keyboard officer back to the top of the document.
          Reopening mid-refresh is harmless: the dialog re-seeds on open.
        */}
        <Button
          aria-label={`Edit ${hackathonClass.name}`}
          className="min-h-11"
          onClick={onEdit}
          size="icon"
          variant="ghost"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </Button>
        <Button
          aria-label={`Remove ${hackathonClass.name}`}
          className="min-h-11"
          disabled={busy}
          onClick={onRemove}
          size="icon"
          variant="ghost"
        >
          {removing ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="size-4" aria-hidden="true" />
          )}
        </Button>
      </div>
    </li>
  );
}
