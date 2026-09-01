"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@forge/ui/button";
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";

interface ProjectMember {
  email: string | null;
  id: string;
  name: string;
}

interface EditableMember {
  email: string;
  key: string;
  name: string;
}

export function ProjectMembersEditor({
  members,
}: {
  members: readonly ProjectMember[];
}) {
  const [rows, setRows] = useState<EditableMember[]>(() =>
    members.length
      ? members.map((member) => ({
          email: member.email ?? "",
          key: member.id,
          name: member.name,
        }))
      : [{ email: "", key: "new-member-0", name: "" }],
  );

  function updateMember(key: string, field: "email" | "name", value: string) {
    setRows((current) =>
      current.map((member) =>
        member.key === key ? { ...member, [field]: value } : member,
      ),
    );
  }

  return (
    <fieldset className="space-y-3 rounded-lg border border-border/70 p-4 sm:col-span-2">
      <legend className="px-1 text-sm font-semibold">Team contacts</legend>
      <div className="space-y-3">
        {rows.map((member, index) => (
          <div
            className="grid gap-3 rounded-md border border-border/60 bg-background/30 p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-end"
            key={member.key}
          >
            <label className="space-y-2">
              <Label htmlFor={`project-member-name-${member.key}`}>
                Member {index + 1} name
              </Label>
              <Input
                id={`project-member-name-${member.key}`}
                maxLength={255}
                name="memberName"
                onChange={(event) =>
                  updateMember(member.key, "name", event.target.value)
                }
                required
                value={member.name}
              />
            </label>
            <label className="space-y-2">
              <Label htmlFor={`project-member-email-${member.key}`}>
                Email (optional)
              </Label>
              <Input
                autoComplete="email"
                id={`project-member-email-${member.key}`}
                maxLength={320}
                name="memberEmail"
                onChange={(event) =>
                  updateMember(member.key, "email", event.target.value)
                }
                type="email"
                value={member.email}
              />
            </label>
            <Button
              aria-label={`Remove member ${index + 1}`}
              disabled={rows.length === 1}
              onClick={() =>
                setRows((current) =>
                  current.filter((candidate) => candidate.key !== member.key),
                )
              }
              size="icon"
              type="button"
              variant="outline"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        ))}
      </div>
      <Button
        disabled={rows.length >= 100}
        onClick={() =>
          setRows((current) => [
            ...current,
            { email: "", key: crypto.randomUUID(), name: "" },
          ])
        }
        size="sm"
        type="button"
        variant="outline"
      >
        <Plus className="mr-1 size-4" aria-hidden="true" /> Add team member
      </Button>
    </fieldset>
  );
}
