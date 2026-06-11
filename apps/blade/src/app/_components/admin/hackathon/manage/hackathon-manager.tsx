"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Pencil, Plus, ShieldCheck } from "lucide-react";
import { z } from "zod";

import type { SelectHackathon } from "@forge/db/schemas/knight-hacks";
import { HACKATHONS } from "@forge/consts";
import {
  HACKATHON_EMAIL_TEMPLATE_PRESET_KEYS,
  HACKATHON_EMAIL_TEMPLATE_PRESET_OPTIONS,
} from "@forge/email/hackathons";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@forge/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from "@forge/ui/form";
import { Input } from "@forge/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@forge/ui/select";
import { Switch } from "@forge/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@forge/ui/table";
import { toast } from "@forge/ui/toast";
import {
  createHackathonApplicationBackgroundKeySchema,
  createHackathonEmailTemplateKeySchema,
  getHackathonBackgroundIssues,
  getHackathonDateWindowIssues,
  getHackathonEmailTemplateIssues,
  hackathonDisplayNameSchema,
  hackathonRouteNameSchema,
  hackathonThemeSchema,
} from "@forge/validators";

import { api } from "~/trpc/react";

const BACKGROUND_OPTIONS = HACKATHONS.APPLICATION_BACKGROUND_OPTIONS;
const DEFAULT_BACKGROUND_KEY = BACKGROUND_OPTIONS[0].key;
type ApplicationBackgroundKey = (typeof BACKGROUND_OPTIONS)[number]["key"];
const EMAIL_TEMPLATE_OPTIONS = HACKATHON_EMAIL_TEMPLATE_PRESET_OPTIONS;
const DEFAULT_EMAIL_TEMPLATE_KEY = EMAIL_TEMPLATE_OPTIONS[0].key;
type EmailTemplateKey = (typeof EMAIL_TEMPLATE_OPTIONS)[number]["key"];
const hackathonApplicationBackgroundKeySchema =
  createHackathonApplicationBackgroundKeySchema(
    HACKATHONS.APPLICATION_BACKGROUND_KEYS,
  );
const hackathonEmailTemplateKeySchema = createHackathonEmailTemplateKeySchema(
  HACKATHON_EMAIL_TEMPLATE_PRESET_KEYS,
);

function getSafeBackgroundKey(
  backgroundKey?: string | null,
): ApplicationBackgroundKey {
  return BACKGROUND_OPTIONS.some(
    (background) => background.key === backgroundKey,
  )
    ? (backgroundKey as ApplicationBackgroundKey)
    : DEFAULT_BACKGROUND_KEY;
}

function getSafeEmailTemplateKey(
  emailTemplateKey?: string | null,
): EmailTemplateKey {
  return EMAIL_TEMPLATE_OPTIONS.some(
    (template) => template.key === emailTemplateKey,
  )
    ? (emailTemplateKey as EmailTemplateKey)
    : DEFAULT_EMAIL_TEMPLATE_KEY;
}

const formSchema = z
  .object({
    name: hackathonRouteNameSchema,
    displayName: hackathonDisplayNameSchema,
    theme: hackathonThemeSchema,
    applicationBackgroundEnabled: z.boolean(),
    applicationBackgroundKey: hackathonApplicationBackgroundKeySchema,
    backgroundImageName: z.string().optional(),
    backgroundColorEnabled: z.boolean(),
    backgroundColor: z.string().optional(),
    foregroundColorEnabled: z.boolean(),
    foregroundColor: z.string().optional(),
    accentColorEnabled: z.boolean(),
    accentColor: z.string().optional(),
    emailTemplateEnabled: z.boolean(),
    emailTemplateKey: hackathonEmailTemplateKeySchema,
    applicationOpen: z.string().min(1, "Application open is required."),
    applicationDeadline: z.string().min(1, "Application deadline is required."),
    confirmationDeadline: z
      .string()
      .min(1, "Confirmation deadline is required."),
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().min(1, "End date is required."),
  })
  .superRefine((values, ctx) => {
    const applicationOpen = new Date(values.applicationOpen);
    const applicationDeadline = new Date(values.applicationDeadline);
    const confirmationDeadline = new Date(values.confirmationDeadline);
    const startDate = new Date(values.startDate);
    const endDate = new Date(values.endDate);

    for (const issue of getHackathonBackgroundIssues(values)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: issue.message,
        path: issue.path,
      });
    }

    for (const issue of getHackathonEmailTemplateIssues(values)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: issue.message,
        path: issue.path,
      });
    }

    for (const issue of getHackathonDateWindowIssues({
      applicationDeadline,
      applicationOpen,
      confirmationDeadline,
      endDate,
      startDate,
    })) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: issue.message,
        path: issue.path,
      });
    }
  });

type HackathonFormValues = z.infer<typeof formSchema>;

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateTimeLocalValue(value: Date | string) {
  const date = new Date(value);
  const pad = (number: number) => number.toString().padStart(2, "0");

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
}

function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getDefaultValues(
  hackathon?: SelectHackathon | null,
): HackathonFormValues {
  if (hackathon) {
    return {
      name: hackathon.name,
      displayName: hackathon.displayName,
      theme: hackathon.theme,
      applicationBackgroundEnabled: hackathon.applicationBackgroundEnabled,
      applicationBackgroundKey: getSafeBackgroundKey(
        hackathon.applicationBackgroundKey,
      ),
      backgroundImageName: hackathon.backgroundImageName ?? undefined,
      backgroundColorEnabled: !!hackathon.backgroundColor,
      backgroundColor: hackathon.backgroundColor ?? "#ffffff",
      foregroundColorEnabled: !!hackathon.foregroundColor,
      foregroundColor: hackathon.foregroundColor ?? "#000000",
      accentColorEnabled: !!hackathon.accentColor,
      accentColor: hackathon.accentColor ?? "#ff0000",
      emailTemplateEnabled: hackathon.emailTemplateEnabled,
      emailTemplateKey: getSafeEmailTemplateKey(hackathon.emailTemplateKey),
      applicationOpen: toDateTimeLocalValue(hackathon.applicationOpen),
      applicationDeadline: toDateTimeLocalValue(hackathon.applicationDeadline),
      confirmationDeadline: toDateTimeLocalValue(
        hackathon.confirmationDeadline,
      ),
      startDate: toDateTimeLocalValue(hackathon.startDate),
      endDate: toDateTimeLocalValue(hackathon.endDate),
    };
  }

  const now = new Date();
  now.setSeconds(0, 0);
  const applicationOpen = now;
  const applicationDeadline = addDays(now, 30);
  const confirmationDeadline = addDays(now, 45);
  const startDate = addDays(now, 60);
  const endDate = addDays(now, 62);

  return {
    name: "",
    displayName: "",
    theme: "",
    applicationBackgroundEnabled: false,
    applicationBackgroundKey: DEFAULT_BACKGROUND_KEY,
    backgroundImageName: undefined,
    backgroundColorEnabled: false,
    backgroundColor: "#ffffff",
    foregroundColorEnabled: false,
    foregroundColor: "#000000",
    accentColorEnabled: false,
    accentColor: "#ff0000",
    emailTemplateEnabled: false,
    emailTemplateKey: DEFAULT_EMAIL_TEMPLATE_KEY,
    applicationOpen: toDateTimeLocalValue(applicationOpen),
    applicationDeadline: toDateTimeLocalValue(applicationDeadline),
    confirmationDeadline: toDateTimeLocalValue(confirmationDeadline),
    startDate: toDateTimeLocalValue(startDate),
    endDate: toDateTimeLocalValue(endDate),
  };
}

function toMutationPayload(values: HackathonFormValues) {
  return {
    name: values.name,
    displayName: values.displayName,
    theme: values.theme,
    applicationBackgroundEnabled: values.applicationBackgroundEnabled,
    applicationBackgroundKey: values.applicationBackgroundEnabled
      ? (values.applicationBackgroundKey as
          | ApplicationBackgroundKey
          | undefined)
      : null,
    emailTemplateEnabled: values.emailTemplateEnabled,
    emailTemplateKey: values.emailTemplateEnabled
      ? (values.emailTemplateKey as EmailTemplateKey | undefined)
      : null,
    backgroundImageName: values.backgroundImageName ?? null,
    backgroundColor: values.backgroundColorEnabled
      ? values.backgroundColor
      : null,
    foregroundColor: values.foregroundColorEnabled
      ? values.foregroundColor
      : null,
    accentColor: values.accentColorEnabled ? values.accentColor : null,
    applicationOpen: new Date(values.applicationOpen),
    applicationDeadline: new Date(values.applicationDeadline),
    confirmationDeadline: new Date(values.confirmationDeadline),
    startDate: new Date(values.startDate),
    endDate: new Date(values.endDate),
  };
}

export function HackathonManager() {
  const utils = api.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHackathon, setEditingHackathon] =
    useState<SelectHackathon | null>(null);
  const {
    data: hackathons = [],
    error: hackathonsError,
    isLoading,
    refetch: refetchHackathons,
  } = api.hackathon.getManagedHackathons.useQuery();

  const form = useForm({
    schema: formSchema,
    defaultValues: getDefaultValues(),
  });

  const selectedBackgroundEnabled = form.watch("applicationBackgroundEnabled");
  const selectedEmailTemplateEnabled = form.watch("emailTemplateEnabled");

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingHackathon(null);
    form.reset(getDefaultValues());
  };

  const openCreateDialog = () => {
    setEditingHackathon(null);
    form.reset(getDefaultValues());
    setDialogOpen(true);
  };

  const openEditDialog = (hackathon: SelectHackathon) => {
    setEditingHackathon(hackathon);
    form.reset(getDefaultValues(hackathon));
    setDialogOpen(true);
  };

  const createHackathon = api.hackathon.createHackathon.useMutation({
    onSuccess() {
      toast.success("Hackathon created.");
      closeDialog();
    },
    onError(error) {
      toast.error(error.message);
    },
    async onSettled() {
      await utils.hackathon.invalidate();
    },
  });

  const updateHackathon = api.hackathon.updateHackathon.useMutation({
    onSuccess() {
      toast.success("Hackathon updated.");
      closeDialog();
    },
    onError(error) {
      toast.error(error.message);
    },
    async onSettled() {
      await utils.hackathon.invalidate();
    },
  });

  const isSaving = createHackathon.isPending || updateHackathon.isPending;

  return (
    <main className="container space-y-8 py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            Officer-only setup
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Hackathons</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Create application routes, control deadlines, and choose the
            application and email presets for each hackathon.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          New Hackathon
        </Button>
      </header>

      <section className="overflow-x-auto rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hackathon</TableHead>
              <TableHead>Application</TableHead>
              <TableHead>Event Dates</TableHead>
              <TableHead>Background</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  Loading hackathons...
                </TableCell>
              </TableRow>
            ) : hackathonsError ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24">
                  <div className="flex flex-col items-center justify-center gap-3 text-center">
                    <div>
                      <div className="font-medium">
                        Failed to load hackathons.
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {hackathonsError.message}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void refetchHackathons()}
                    >
                      Retry
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : hackathons.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No hackathons yet.
                </TableCell>
              </TableRow>
            ) : (
              hackathons.map((hackathon) => (
                <TableRow key={hackathon.id}>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{hackathon.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        /hacker/application/{hackathon.name}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div>{formatDateTime(hackathon.applicationOpen)}</div>
                    <div>
                      Closes {formatDateTime(hackathon.applicationDeadline)}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div>{formatDateTime(hackathon.startDate)}</div>
                    <div>Ends {formatDateTime(hackathon.endDate)}</div>
                  </TableCell>
                  <TableCell>
                    {hackathon.applicationBackgroundEnabled &&
                    hackathon.applicationBackgroundKey ? (
                      <Badge variant="secondary">
                        {hackathon.applicationBackgroundKey}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Default</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {hackathon.emailTemplateEnabled &&
                    hackathon.emailTemplateKey ? (
                      <Badge variant="secondary">
                        {hackathon.emailTemplateKey}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Stock</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/hacker/application/${hackathon.name}`}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open
                        </Link>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(hackathon)}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (open) {
            setDialogOpen(true);
            return;
          }

          closeDialog();
        }}
      >
        <DialogContent className="max-h-[85svh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editingHackathon ? "Edit Hackathon" : "Create Hackathon"}
            </DialogTitle>
            <DialogDescription>
              Dates are saved from your local timezone. Route names become the
              public application URL.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              className="space-y-6"
              noValidate
              onSubmit={form.handleSubmit((values) => {
                const payload = toMutationPayload(values);

                if (editingHackathon) {
                  updateHackathon.mutate({
                    id: editingHackathon.id,
                    ...payload,
                  });
                  return;
                }

                createHackathon.mutate(payload);
              })}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Route Name</FormLabel>
                      <FormControl>
                        <Input placeholder="knight-hacks-ix" {...field} />
                      </FormControl>
                      <FormDescription>
                        Used in /hacker/application/[route-name].
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Knight Hacks IX" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="theme"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Theme</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Monsters in the machine"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="applicationOpen"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Applications Open</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="applicationDeadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Application Deadline</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmationDeadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmation Deadline</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hackathon Starts</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hackathon Ends</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <h3 className="font-medium">Visuals</h3>
                <FormField
                  control={form.control}
                  name="backgroundImageName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Background Image Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="site/name.png"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="backgroundColorEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <FormLabel>Background</FormLabel>
                        </div>
                        <FormControl>
                          <Input
                            type="color"
                            disabled={!field.value}
                            {...form.register("backgroundColor")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="foregroundColorEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <FormLabel>Foreground</FormLabel>
                        </div>
                        <FormControl>
                          <Input
                            type="color"
                            disabled={!field.value}
                            {...form.register("foregroundColor")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="accentColorEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                          <FormLabel>Accent</FormLabel>
                        </div>
                        <FormControl>
                          <Input
                            type="color"
                            disabled={!field.value}
                            {...form.register("accentColor")}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <FormField
                  control={form.control}
                  name="applicationBackgroundEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-4 space-y-0">
                      <div className="space-y-1">
                        <FormLabel>Application Background Override</FormLabel>
                        <FormDescription>
                          Leave off to use the stock purple application
                          background.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="applicationBackgroundKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Background Preset</FormLabel>
                      <Select
                        disabled={!selectedBackgroundEnabled}
                        value={field.value ?? undefined}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a preset" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BACKGROUND_OPTIONS.map((background) => (
                            <SelectItem
                              key={background.key}
                              value={background.key}
                            >
                              {background.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4 rounded-lg border p-4">
                <FormField
                  control={form.control}
                  name="emailTemplateEnabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between gap-4 space-y-0">
                      <div className="space-y-1">
                        <FormLabel>Email Template Override</FormLabel>
                        <FormDescription>
                          Leave off to use the current Knight Hacks VIII email
                          templates.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emailTemplateKey"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Template Preset</FormLabel>
                      <Select
                        disabled={!selectedEmailTemplateEnabled}
                        value={field.value ?? undefined}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a template preset" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EMAIL_TEMPLATE_OPTIONS.map((template) => (
                            <SelectItem key={template.key} value={template.key}>
                              {template.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeDialog}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editingHackathon ? "Save Changes" : "Create Hackathon"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
