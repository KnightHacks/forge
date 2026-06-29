"use client";

import { useState } from "react";
import { AlertTriangle, Search, Sparkles } from "lucide-react";

import { PERMISSIONS } from "@forge/consts";
import { Button } from "@forge/ui/button";
import { Checkbox } from "@forge/ui/checkbox";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";

const permissionGroups = [
  {
    keys: ["IS_OFFICER", "IS_JUDGE", "EMAIL_PORTAL"],
    label: "Global",
  },
  {
    keys: ["READ_MEMBERS", "EDIT_MEMBERS", "READ_CLUB_DATA"],
    label: "Members",
  },
  {
    keys: ["READ_HACKERS", "EDIT_HACKERS", "READ_HACK_DATA"],
    label: "Hackers",
  },
  {
    keys: [
      "READ_CLUB_EVENT",
      "EDIT_CLUB_EVENT",
      "CHECKIN_CLUB_EVENT",
      "READ_HACK_EVENT",
      "EDIT_HACK_EVENT",
      "CHECKIN_HACK_EVENT",
    ],
    label: "Events",
  },
  {
    keys: ["READ_FORMS", "READ_FORM_RESPONSES", "EDIT_FORMS"],
    label: "Forms",
  },
  {
    keys: ["ASSIGN_ROLES", "CONFIGURE_ROLES"],
    label: "Roles",
  },
  {
    keys: [
      "READ_ISSUES",
      "EDIT_ISSUES",
      "READ_ISSUE_TEMPLATES",
      "EDIT_ISSUE_TEMPLATES",
    ],
    label: "Issues",
  },
] as const satisfies readonly {
  keys: readonly PERMISSIONS.PermissionKey[];
  label: string;
}[];

const allPermissionKeys = permissionGroups.flatMap((group) => group.keys);

export function RolePermissionEditor({
  onChange,
  selected,
}: {
  onChange: (permissions: PERMISSIONS.PermissionKey[]) => void;
  selected: readonly PERMISSIONS.PermissionKey[];
}) {
  const [query, setQuery] = useState("");
  const selectedSet = new Set(selected);
  const normalizedQuery = query.trim().toLocaleLowerCase("en-US");

  const toggle = (key: PERMISSIONS.PermissionKey, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(key);
    else next.delete(key);
    onChange(allPermissionKeys.filter((permission) => next.has(permission)));
  };

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="Search permissions"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search permissions"
            className="h-11 pl-9 sm:h-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 flex-1 sm:min-h-9 sm:flex-none"
            onClick={() => onChange([])}
          >
            Clear all
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 flex-1 sm:min-h-9 sm:flex-none"
            onClick={() => onChange([...allPermissionKeys])}
          >
            Select all
          </Button>
        </div>
      </div>

      {selected.length === 0 && (
        <div className="flex items-start gap-3 rounded-md border border-primary/25 bg-primary/10 p-3 text-sm">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="font-medium">Cosmetic role</p>
            <p className="mt-0.5 text-muted-foreground">
              This role stays synced and assignable without granting Blade
              access.
            </p>
          </div>
        </div>
      )}

      {selectedSet.has("IS_OFFICER") && (
        <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium">Officer access is unrestricted</p>
            <p className="mt-0.5 text-muted-foreground">
              Officer bypasses every normal permission gate in Blade.
            </p>
          </div>
        </div>
      )}

      <div className="max-h-[48svh] space-y-4 overflow-y-auto rounded-md border border-white/10 bg-background/45 p-3 sm:p-4">
        {permissionGroups.map((group) => {
          const visible = group.keys.filter((key) => {
            const permission = PERMISSIONS.PERMISSION_DATA[key];
            if (!permission) return false;
            return (
              !normalizedQuery ||
              `${permission.name} ${permission.desc} ${key}`
                .toLocaleLowerCase("en-US")
                .includes(normalizedQuery)
            );
          });
          if (visible.length === 0) return null;
          return (
            <section key={group.label} className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                {group.label}
              </h3>
              <div className="space-y-2">
                {visible.map((key) => {
                  const permission = PERMISSIONS.PERMISSION_DATA[key];
                  if (!permission) return null;
                  const id = `role-permission-${key}`;
                  return (
                    <div
                      key={key}
                      className="flex items-start gap-3 rounded-md border border-white/10 bg-background/60 p-3"
                    >
                      <Checkbox
                        id={id}
                        checked={selectedSet.has(key)}
                        onCheckedChange={(checked) =>
                          toggle(key, checked === true)
                        }
                        className="mt-0.5"
                      />
                      <Label htmlFor={id} className="min-w-0 cursor-pointer">
                        <span className="block text-sm font-medium">
                          {permission.name}
                        </span>
                        <span className="mt-0.5 block text-sm font-normal leading-5 text-muted-foreground">
                          {permission.desc}
                        </span>
                      </Label>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground">
        {selected.length} permission{selected.length === 1 ? "" : "s"} selected
      </p>
    </div>
  );
}
