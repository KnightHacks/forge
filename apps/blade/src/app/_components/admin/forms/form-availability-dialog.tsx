"use client";

import type { Dispatch, SetStateAction } from "react";

import { Button } from "@forge/ui/button";
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

import type { FormAvailability } from "./form-availability-draft";

export function FormAvailabilityDialog({
  availability,
  onDone,
  onOpenChange,
  open,
  respondentRoleSearch,
  respondentRoles,
  sections,
  setAvailability,
  setRespondentRoleSearch,
}: {
  availability: FormAvailability;
  onDone: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  respondentRoleSearch: string;
  respondentRoles: { id: string; name: string }[];
  sections: { id: string; name: string }[];
  setAvailability: Dispatch<SetStateAction<FormAvailability>>;
  setRespondentRoleSearch: Dispatch<SetStateAction<string>>;
}) {
  function updateAvailability<Key extends keyof FormAvailability>(
    key: Key,
    value: FormAvailability[Key],
  ) {
    setAvailability((current) => ({ ...current, [key]: value }));
  }

  function toggleRespondentRole(roleId: string, selected: boolean) {
    setAvailability((current) => ({
      ...current,
      respondentRoleIds: selected
        ? [...current.respondentRoleIds, roleId]
        : current.respondentRoleIds.filter((id) => id !== roleId),
    }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90svh] max-w-2xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-border/70 px-5 py-4 text-left">
          <DialogTitle>Availability & access</DialogTitle>
          <DialogDescription>
            Set who can respond and when the direct link accepts responses.
          </DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 gap-4 overflow-y-auto px-5 py-4">
          <div className="grid gap-2">
            <Label>Section</Label>
            <select
              className="h-11 rounded-md border border-input bg-background px-3"
              value={availability.sectionId}
              onChange={(event) =>
                updateAvailability("sectionId", event.target.value)
              }
            >
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label>Response mode</Label>
            <select
              className="h-11 rounded-md border border-input bg-background px-3"
              value={availability.responseMode}
              onChange={(event) =>
                updateAvailability(
                  "responseMode",
                  event.target.value as FormAvailability["responseMode"],
                )
              }
            >
              <option value="single_locked">One, locked</option>
              <option value="single_editable">One, editable</option>
              <option value="multiple_locked">Multiple, locked</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="opens-at">Opens</Label>
            <Input
              id="opens-at"
              type="datetime-local"
              className="h-11"
              value={availability.opensAt}
              onChange={(event) =>
                updateAvailability("opensAt", event.target.value)
              }
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="closes-at">Closes</Label>
            <Input
              id="closes-at"
              type="datetime-local"
              className="h-11"
              value={availability.closesAt}
              onChange={(event) =>
                updateAvailability("closesAt", event.target.value)
              }
            />
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={availability.duesOnly}
              onChange={(event) =>
                updateAvailability("duesOnly", event.target.checked)
              }
            />
            Dues-paid members only
          </label>
          <fieldset className="grid gap-2 rounded-md border border-white/10 bg-background/60 p-3">
            <legend className="px-1 text-sm font-medium">
              Respondent roles
            </legend>
            <p className="text-xs text-muted-foreground">
              Leave all unchecked to allow every eligible member with the direct
              link.
            </p>
            <Input
              aria-label="Search respondent roles"
              className="h-11"
              placeholder="Search roles"
              value={respondentRoleSearch}
              onChange={(event) => setRespondentRoleSearch(event.target.value)}
            />
            <div className="grid max-h-56 gap-1 overflow-y-auto pr-1">
              {respondentRoles
                .filter((role) =>
                  role.name
                    .toLowerCase()
                    .includes(respondentRoleSearch.trim().toLowerCase()),
                )
                .map((role) => (
                  <label
                    className="flex min-h-11 items-center justify-between gap-3 rounded-md px-2 text-sm hover:bg-accent/50"
                    key={role.id}
                  >
                    <span className="min-w-0 truncate">{role.name}</span>
                    <input
                      checked={availability.respondentRoleIds.includes(role.id)}
                      type="checkbox"
                      onChange={(event) =>
                        toggleRespondentRole(role.id, event.target.checked)
                      }
                    />
                  </label>
                ))}
            </div>
          </fieldset>
          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={availability.manuallyClosed}
              onChange={(event) =>
                updateAvailability("manuallyClosed", event.target.checked)
              }
            />
            Manually closed
          </label>
        </div>
        <DialogFooter className="border-t border-border/70 px-5 py-4">
          <Button className="min-h-11" onClick={onDone}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
