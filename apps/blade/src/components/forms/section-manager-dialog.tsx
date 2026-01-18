"use client";

import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import * as z from "zod";

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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  useForm,
} from "@forge/ui/form";
import { Input } from "@forge/ui/input";
import { toast } from "@forge/ui/toast";

import { api } from "~/trpc/react";

const schema = z.object({
  name: z.string().min(1, "Please enter a name"),
});

const createSectionSchema = z.object({
  name: z.string().min(1, "Please enter a name"),
  roleIds: z.array(z.string().uuid()).optional().default([]),
});

const editSectionRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()).optional().default([]),
});

export function SectionManagerDialog({
  trigger,
}: {
  trigger?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editingRolesFor, setEditingRolesFor] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [sectionRolesMap, setSectionRolesMap] = useState<
    Map<string, { id: string; name: string }[]>
  >(new Map());

  const { data: sections = [] } = api.forms.getSections.useQuery(undefined, {
    enabled: isOpen,
  });

  const { data: sectionCounts = [] } = api.forms.getSectionCounts.useQuery(
    undefined,
    {
      enabled: isOpen,
    },
  );

  const { data: allRoles = [] } = api.roles.getAllLinks.useQuery(undefined, {
    enabled: isOpen,
  });

  const utils = api.useUtils();

  useEffect(() => {
    if (!isOpen || sections.length === 0) return;

    const fetchSectionRoles = async () => {
      const newRolesMap = new Map<string, { id: string; name: string }[]>();

      await Promise.all(
        sections
          .filter((s) => s !== "General")
          .map(async (section) => {
            try {
              const roles = await utils.forms.getSectionRoles.fetch({
                sectionName: section,
              });
              newRolesMap.set(section, roles);
            } catch {
              newRolesMap.set(section, []);
            }
          }),
      );

      setSectionRolesMap(newRolesMap);
    };

    void fetchSectionRoles();
  }, [isOpen, sections, utils.forms.getSectionRoles]);

  const countMap = new Map<string, number>();
  if (Array.isArray(sectionCounts)) {
    for (const sc of sectionCounts) {
      if (typeof sc === "object" && "section" in sc && "count" in sc) {
        countMap.set(sc.section, Number(sc.count));
      }
    }
  }

  const renameForm = useForm({
    schema: schema,
    defaultValues: {
      name: "",
    },
  });

  const createSectionForm = useForm({
    schema: createSectionSchema,
    defaultValues: {
      name: "",
      roleIds: [],
    },
  });

  const editRolesForm = useForm({
    schema: editSectionRolesSchema,
    defaultValues: {
      roleIds: [],
    },
  });

  const renameSection = api.forms.renameSection.useMutation({
    onSuccess() {
      toast.success("Section renamed");
      setEditingSection(null);
      renameForm.reset();
    },
    onError() {
      toast.error("Failed to rename section");
    },
    async onSettled() {
      await utils.forms.getSections.invalidate();
      await utils.forms.getForms.invalidate();
    },
  });

  const deleteSection = api.forms.deleteSection.useMutation({
    onSuccess() {
      toast.success("Section deleted (forms moved to General)");
    },
    onError() {
      toast.error("Failed to delete section");
    },
    async onSettled() {
      await utils.forms.getSections.invalidate();
      await utils.forms.getForms.invalidate();
    },
  });

  const createSection = api.forms.createSection.useMutation({
    onSuccess() {
      toast.success("Section created");
      setIsCreatingNew(false);
      createSectionForm.reset();
    },
    onError(error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "Failed to create section";
      toast.error(message);
    },
    async onSettled() {
      await utils.forms.getSections.invalidate();
      await utils.forms.getSectionCounts.invalidate();
    },
  });

  const updateSectionRoles = api.forms.updateSectionRoles.useMutation({
    onSuccess(_, variables) {
      toast.success("Section roles updated");
      setEditingRolesFor(null);
      editRolesForm.reset();
      void utils.forms.getSectionRoles
        .fetch({ sectionName: variables.sectionName })
        .then((roles) => {
          setSectionRolesMap((prev) => {
            const newMap = new Map(prev);
            newMap.set(variables.sectionName, roles);
            return newMap;
          });
        })
        .catch(() => {
          setSectionRolesMap((prev) => {
            const newMap = new Map(prev);
            newMap.set(variables.sectionName, []);
            return newMap;
          });
        });
    },
    onError(error: unknown) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : "Failed to update section roles";
      toast.error(message);
    },
    async onSettled() {
      await utils.forms.getSectionRoles.invalidate();
      await utils.forms.getSections.invalidate();
    },
  });

  const reorderSection = api.forms.reorderSection.useMutation({
    async onSettled() {
      await utils.forms.getSections.invalidate();
      await utils.forms.getForms.invalidate();
    },
  });

  const handleRename = (oldName: string) => {
    const newName = renameForm.getValues().name;
    if (!newName || newName === oldName) {
      setEditingSection(null);
      return;
    }
    renameSection.mutate({ oldName, newName });
  };

  const handleDelete = (section: string) => {
    if (section === "General") {
      toast.error("Cannot delete the General section");
      return;
    }
    deleteSection.mutate({ section });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="sm">
            <Pencil className="mr-2 h-4 w-4" /> Manage Sections
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage Sections</DialogTitle>
          <DialogDescription>
            Organize your forms by creating and managing sections.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {isCreatingNew && (
            <div className="rounded-md border p-3">
              <Form {...createSectionForm}>
                <form
                  onSubmit={createSectionForm.handleSubmit((values) => {
                    createSection.mutate({
                      name: values.name,
                      roleIds: values.roleIds,
                    } as { name: string; roleIds: string[] });
                  })}
                  className="space-y-3"
                >
                  <FormField
                    control={createSectionForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Section Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter section name"
                            autoFocus
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={createSectionForm.control}
                    name="roleIds"
                    render={() => (
                      <FormItem>
                        <div className="mb-4">
                          <FormLabel>Restrict to Roles (Optional)</FormLabel>
                          <FormDescription>
                            Select one or more roles that can access this
                            section. Leave empty to allow all users with form
                            access.
                          </FormDescription>
                        </div>
                        <div className="max-h-60 space-y-3 overflow-y-auto rounded-md border p-3">
                          {allRoles.map((role) => (
                            <FormField
                              key={role.id}
                              control={createSectionForm.control}
                              name="roleIds"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={role.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(role.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([
                                                ...(field.value ?? []),
                                                role.id,
                                              ])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== role.id,
                                                ) ?? [],
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="cursor-pointer font-normal">
                                      {role.name}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                          {allRoles.length === 0 && (
                            <p className="text-sm text-muted-foreground">
                              No roles available. All users will have access.
                            </p>
                          )}
                        </div>
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">
                      Create
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setIsCreatingNew(false);
                        createSectionForm.reset();
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}

          {sections.map((section: string, index) => {
            const sectionRoles = sectionRolesMap.get(section) ?? [];
            const isEditingRoles = editingRolesFor === section;
            const canMoveUp = index > 0;
            const canMoveDown = index < sections.length - 1;

            return (
              <div key={section} className="space-y-2 rounded-md border p-3">
                {editingSection === section ? (
                  <Form {...renameForm}>
                    <form
                      onSubmit={renameForm.handleSubmit(() =>
                        handleRename(section),
                      )}
                      className="flex flex-1 items-center gap-2"
                    >
                      <FormField
                        control={renameForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Section name"
                                autoFocus
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <Button type="submit" size="sm">
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingSection(null);
                          renameForm.reset();
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </form>
                  </Form>
                ) : isEditingRoles ? (
                  <div className="space-y-3">
                    <Form {...editRolesForm}>
                      <form
                        onSubmit={editRolesForm.handleSubmit((values) => {
                          updateSectionRoles.mutate({
                            sectionName: section,
                            roleIds: values.roleIds,
                          } as { sectionName: string; roleIds: string[] });
                        })}
                        className="space-y-3"
                      >
                        <FormField
                          control={editRolesForm.control}
                          name="roleIds"
                          render={() => (
                            <FormItem>
                              <div className="mb-2">
                                <FormLabel>
                                  Restrict to Roles (Optional)
                                </FormLabel>
                                <FormDescription>
                                  Select one or more roles that can access this
                                  section. Leave empty to allow all users with
                                  form access.
                                </FormDescription>
                              </div>
                              <div className="max-h-60 space-y-3 overflow-y-auto rounded-md border p-3">
                                {allRoles.map((role) => (
                                  <FormField
                                    key={role.id}
                                    control={editRolesForm.control}
                                    name="roleIds"
                                    render={({ field }) => {
                                      return (
                                        <FormItem
                                          key={role.id}
                                          className="flex flex-row items-start space-x-3 space-y-0"
                                        >
                                          <FormControl>
                                            <Checkbox
                                              checked={field.value?.includes(
                                                role.id,
                                              )}
                                              onCheckedChange={(checked) => {
                                                return checked
                                                  ? field.onChange([
                                                      ...(field.value ?? []),
                                                      role.id,
                                                    ])
                                                  : field.onChange(
                                                      field.value?.filter(
                                                        (value) =>
                                                          value !== role.id,
                                                      ) ?? [],
                                                    );
                                              }}
                                            />
                                          </FormControl>
                                          <FormLabel className="cursor-pointer font-normal">
                                            {role.name}
                                          </FormLabel>
                                        </FormItem>
                                      );
                                    }}
                                  />
                                ))}
                              </div>
                            </FormItem>
                          )}
                        />
                        <div className="flex gap-2">
                          <Button type="submit" size="sm">
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingRolesFor(null);
                              editRolesForm.reset();
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-1 items-center gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{section}</span>
                          <span className="text-sm text-muted-foreground">
                            {countMap.get(section) ?? 0}{" "}
                            {countMap.get(section) === 1 ? "form" : "forms"}
                          </span>
                          {section !== "General" && sectionRoles.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              Roles:{" "}
                              {sectionRoles.map((r) => r.name).join(", ")}
                            </span>
                          )}
                          {section !== "General" &&
                            sectionRoles.length === 0 && (
                              <span className="text-xs text-muted-foreground">
                                All users with form access
                              </span>
                            )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {section !== "General" && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                reorderSection.mutate({
                                  sectionName: section,
                                  direction: "up",
                                })
                              }
                              disabled={!canMoveUp}
                              className="rounded p-1 text-gray-300 hover:text-gray-500 disabled:cursor-not-allowed disabled:opacity-30"
                              aria-label="Move up"
                            >
                              <ArrowUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                reorderSection.mutate({
                                  sectionName: section,
                                  direction: "down",
                                })
                              }
                              disabled={!canMoveDown}
                              className="rounded p-1 text-gray-300 hover:text-gray-500 disabled:cursor-not-allowed disabled:opacity-30"
                              aria-label="Move down"
                            >
                              <ArrowDown className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {section !== "General" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingRolesFor(section);
                              const currentRoleIds = sectionRoles.map(
                                (r) => r.id,
                              );
                              editRolesForm.setValue("roleIds", currentRoleIds);
                            }}
                            title="Edit roles"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingSection(section);
                            renameForm.setValue("name", section);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {section !== "General" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(section)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreatingNew(true)}
            disabled={isCreatingNew}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
