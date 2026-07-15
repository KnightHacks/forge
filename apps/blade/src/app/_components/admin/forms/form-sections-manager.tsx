"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Save, Search } from "lucide-react";

import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { Card, CardHeader, CardTitle } from "@forge/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@forge/ui/tabs";

import { api } from "~/trpc/react";

interface SectionDraft {
  editorRoleIds: string[];
  id?: string;
  name: string;
  viewerRoleIds: string[];
}

function emptyDraft(): SectionDraft {
  return { editorRoleIds: [], name: "", viewerRoleIds: [] };
}

function toggle(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function RolePicker({
  label,
  onToggle,
  roles,
  selected,
}: {
  label: string;
  onToggle: (roleId: string) => void;
  roles: { id: string; name: string }[];
  selected: string[];
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="sr-only">{label}</legend>
      <div className="grid max-h-[42svh] gap-2 overflow-y-auto pr-1">
        {roles.length === 0 ? (
          <p className="rounded-md border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
            No matching roles.
          </p>
        ) : (
          roles.map((role) => (
            <label
              className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-white/10 bg-background/60 px-3 text-sm transition hover:border-primary/40"
              key={role.id}
            >
              <span className="min-w-0 truncate">{role.name}</span>
              <input
                aria-label={`${label}: ${role.name}`}
                checked={selected.includes(role.id)}
                type="checkbox"
                onChange={() => onToggle(role.id)}
              />
            </label>
          ))
        )}
      </div>
    </fieldset>
  );
}

export function FormSectionsManager() {
  const utils = api.useUtils();
  const provisioning = api.forms.sectionProvisioning.useQuery();
  const create = api.forms.createSection.useMutation({
    async onSuccess() {
      await utils.forms.sectionProvisioning.invalidate();
    },
  });
  const update = api.forms.updateSection.useMutation({
    async onSuccess() {
      await utils.forms.sectionProvisioning.invalidate();
    },
  });
  const [draft, setDraft] = useState<SectionDraft | null>(null);
  const [roleSearch, setRoleSearch] = useState("");
  const roles = useMemo(() => {
    const query = roleSearch.trim().toLowerCase();
    return (provisioning.data?.roles ?? []).filter(
      (role) => !query || role.name.toLowerCase().includes(query),
    );
  }, [provisioning.data?.roles, roleSearch]);

  function closeDialog() {
    setDraft(null);
    setRoleSearch("");
  }

  async function save() {
    if (!draft?.name.trim()) return;
    if (draft.id) {
      await update.mutateAsync({
        ...draft,
        name: draft.name.trim(),
        sectionId: draft.id,
      });
    } else {
      await create.mutateAsync({ ...draft, name: draft.name.trim() });
    }
    closeDialog();
  }

  return (
    <main className="container min-w-0 space-y-5 pb-16 pt-5 sm:pt-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Button asChild variant="ghost" className="-ml-3 min-h-11 gap-2">
            <Link href="/admin/forms">
              <ArrowLeft className="h-4 w-4" /> Forms
            </Link>
          </Button>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
            Form sections
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Officers define separate viewer and editor role groups. Editors also
            receive view access.
          </p>
        </div>
        <Button
          className="min-h-11 gap-2"
          onClick={() => setDraft(emptyDraft())}
        >
          <Plus className="h-4 w-4" /> Create section
        </Button>
      </header>

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        data-section-grid="compact"
      >
        {provisioning.data?.sections.map((section) => (
          <Card
            className="border-white/10 bg-card/95 shadow-xl shadow-black/15"
            data-section-card="compact"
            key={section.id}
          >
            <CardHeader className="flex-row items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <CardTitle className="truncate">{section.name}</CardTitle>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {section.viewerRoleIds.length} viewer roles
                  </Badge>
                  <Badge variant="outline">
                    {section.editorRoleIds.length} editor roles
                  </Badge>
                </div>
              </div>
              <Button
                variant="outline"
                className="min-h-10 shrink-0 px-3"
                size="sm"
                onClick={() =>
                  setDraft({
                    editorRoleIds: section.editorRoleIds,
                    id: section.id,
                    name: section.name,
                    viewerRoleIds: section.viewerRoleIds,
                  })
                }
              >
                Edit access
              </Button>
            </CardHeader>
          </Card>
        ))}
      </section>

      <Dialog
        open={Boolean(draft)}
        onOpenChange={(open) => !open && closeDialog()}
      >
        <DialogContent className="flex max-h-[90svh] max-w-2xl flex-col overflow-hidden p-0">
          <DialogHeader className="border-b border-border/70 px-5 py-4 text-left">
            <DialogTitle>
              {draft?.id ? "Edit section access" : "Create section"}
            </DialogTitle>
            <DialogDescription>
              Choose who can see forms in this section and who can edit them.
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <div className="grid min-h-0 gap-4 overflow-y-auto px-5 py-4">
              <div className="grid gap-2">
                <Label htmlFor="section-name">Name</Label>
                <Input
                  id="section-name"
                  className="h-11"
                  value={draft.name}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? { ...current, name: event.target.value }
                        : current,
                    )
                  }
                />
              </div>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  aria-label="Search roles"
                  className="h-11 pl-9"
                  placeholder="Search roles"
                  value={roleSearch}
                  onChange={(event) => setRoleSearch(event.target.value)}
                />
              </div>
              <Tabs defaultValue="viewers" className="min-h-0">
                <TabsList className="grid h-11 w-full grid-cols-2">
                  <TabsTrigger value="viewers">
                    Viewers ({draft.viewerRoleIds.length})
                  </TabsTrigger>
                  <TabsTrigger value="editors">
                    Editors ({draft.editorRoleIds.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="viewers" className="mt-3">
                  <RolePicker
                    label="Viewer role"
                    onToggle={(roleId) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              viewerRoleIds: toggle(
                                current.viewerRoleIds,
                                roleId,
                              ),
                            }
                          : current,
                      )
                    }
                    roles={roles}
                    selected={draft.viewerRoleIds}
                  />
                </TabsContent>
                <TabsContent value="editors" className="mt-3">
                  <RolePicker
                    label="Editor role"
                    onToggle={(roleId) =>
                      setDraft((current) =>
                        current
                          ? {
                              ...current,
                              editorRoleIds: toggle(
                                current.editorRoleIds,
                                roleId,
                              ),
                            }
                          : current,
                      )
                    }
                    roles={roles}
                    selected={draft.editorRoleIds}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}
          <DialogFooter className="border-t border-border/70 px-5 py-4">
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              className="min-h-11 gap-2"
              disabled={
                !draft?.name.trim() || create.isPending || update.isPending
              }
              onClick={() => void save()}
            >
              {draft?.id ? (
                <Save className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {draft?.id ? "Save section" : "Create section"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
