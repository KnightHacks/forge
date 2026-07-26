"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Archive,
  CalendarClock,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Code2,
  Copy,
  Eye,
  FileText,
  FlaskConical,
  Loader2,
  Plus,
  RefreshCw,
  Rocket,
  Send,
  Sparkles,
  UsersRound,
} from "lucide-react";

import type {
  EmailAudienceDefinition,
  EmailSendContent,
} from "@forge/validators";
import { cn } from "@forge/ui";
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
import { Input } from "@forge/ui/input";
import { Label } from "@forge/ui/label";
import { Textarea } from "@forge/ui/textarea";

const CodeEmailEditor = dynamic(
  () => import("./code-email-editor").then((module) => module.CodeEmailEditor),
  {
    loading: () => (
      <div className="flex h-80 items-center justify-center rounded-md border border-white/10 bg-background/70 text-sm text-muted-foreground">
        Loading TSX editor…
      </div>
    ),
    ssr: false,
  },
);

const VisualEmailEditor = dynamic(
  () =>
    import("./visual-email-editor").then((module) => module.VisualEmailEditor),
  {
    loading: () => (
      <div className="flex h-80 items-center justify-center rounded-md border border-white/10 bg-background/70 text-sm text-muted-foreground">
        Loading visual editor…
      </div>
    ),
    ssr: false,
  },
);

export type EmailPortalTab = "compose" | "sends" | "templates";

export interface EmailPortalTemplate {
  id: string;
  kind: "code" | "visual";
  latestRevision?: {
    id?: string;
    publishedAt?: Date | string | null;
    state: "draft" | "published" | "superseded";
    version?: number;
  } | null;
  name: string;
  publishedRevision?: {
    id: string;
    version: number;
  } | null;
  updatedAt?: Date | string;
}

export interface EmailPortalSend {
  finalRecipientCount?: number;
  id: string;
  recipientCount?: number;
  scheduledFor?: Date | string | null;
  status: string;
  subject: string;
}

export interface EmailPortalPreview {
  blockers: {
    code: string;
    count: number;
    field: string;
  }[];
  counts: {
    duplicatesCollapsed: number;
    excludedBlocklisted: number;
    excludedInvalid: number;
    excludedMissingFields: number;
    excludedUnsubscribed: number;
    finalUnique: number;
    rawMatches: number;
  };
  expiresAt: string;
  sendId?: string;
  version: string;
}

export interface EmailAudienceOptions {
  hackathons: {
    allLabel: string;
    displayName: string;
    id: string;
    name: string;
    statuses: readonly string[];
  }[];
  presets: {
    kind: "alumni" | "current_members" | "team_members";
    label: string;
  }[];
}

export interface TemplateEditorSeed {
  id?: string;
  kind: "code" | "visual";
  name: string;
  source?: string;
  visualDocument?: Record<string, unknown>;
}

export interface TemplatePreviewResult {
  contract: {
    fallback?: string;
    field: string;
    required: boolean;
    type: string;
  }[];
  html: string;
  text: string;
}

const DEFAULT_CODE_TEMPLATE = `import { Container, Heading, Html, Merge, Text } from "@react-email/components";

export default (
  <Html>
    <Container style={{ maxWidth: 560, margin: "0 auto", padding: 32 }}>
      <Heading>Knight Hacks update</Heading>
      <Text>
        Hello <Merge field="recipient.firstName" fallback="friend" />,
      </Text>
      <Text>We have something exciting to share with you.</Text>
    </Container>
  </Html>
);`;

const DEFAULT_VISUAL_DOCUMENT = {
  root: {
    children: [
      {
        children: [
          { text: "Hello " },
          {
            fallback: "friend",
            field: "recipient.firstName",
            type: "merge",
          },
        ],
        type: "text",
      },
    ],
    type: "root",
  },
  version: 1,
};

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function statusClass(status: string) {
  if (status === "completed") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }
  if (status === "running" || status === "compiling") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }
  if (status === "scheduled") {
    return "border-violet-500/30 bg-violet-500/10 text-violet-300";
  }
  if (status.includes("failure")) {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }
  return "border-white/10 bg-background/60 text-muted-foreground";
}

function dateTimeLocalToIso(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function audienceDefinitions(selected: Set<string>): EmailAudienceDefinition[] {
  const result: EmailAudienceDefinition[] = [];
  for (const key of selected) {
    if (
      key === "current_members" ||
      key === "alumni" ||
      key === "team_members"
    ) {
      result.push({ kind: key });
      continue;
    }
    const [, hackathonId, status] = key.split(":");
    if (!hackathonId) continue;
    const existing = result.find(
      (item): item is Extract<EmailAudienceDefinition, { kind: "hackathon" }> =>
        item.kind === "hackathon" && item.hackathonId === hackathonId,
    );
    if (status === "all") {
      if (existing) existing.statuses = undefined;
      else result.push({ hackathonId, kind: "hackathon" });
      continue;
    }
    if (existing?.statuses) {
      existing.statuses.push(
        status as NonNullable<typeof existing.statuses>[number],
      );
    } else if (!existing) {
      result.push({
        hackathonId,
        kind: "hackathon",
        statuses: [
          status as NonNullable<
            Extract<EmailAudienceDefinition, { kind: "hackathon" }>["statuses"]
          >[number],
        ],
      });
    }
  }
  return result;
}

function TemplateEditorDialog({
  initial,
  onClose,
  onPreview,
  onSave,
}: {
  initial: TemplateEditorSeed;
  onClose: () => void;
  onPreview?: (templateId: string) => Promise<TemplatePreviewResult>;
  onSave?: (input: TemplateEditorSeed) => Promise<void> | void;
}) {
  const [name, setName] = useState(initial.name);
  const [kind, setKind] = useState(initial.kind);
  const [source, setSource] = useState(initial.source ?? DEFAULT_CODE_TEMPLATE);
  const [visualDocument, setVisualDocument] = useState(
    initial.visualDocument ?? DEFAULT_VISUAL_DOCUMENT,
  );
  const [preview, setPreview] = useState<TemplatePreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const save = async () => {
    if (!name.trim()) {
      setError("Template name is required.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await onSave?.(
        kind === "code"
          ? { id: initial.id, kind, name, source }
          : {
              id: initial.id,
              kind,
              name,
              visualDocument,
            },
      );
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Template could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[96svh] max-w-7xl overflow-y-auto border-white/10 bg-card p-0">
        <DialogHeader className="border-b border-border/70 px-5 py-4 text-left">
          <DialogTitle>
            {initial.id ? "Edit template" : "New email template"}
          </DialogTitle>
          <DialogDescription>
            Use the safe TSX dialect for maximum control, or the visual editor
            for quick layouts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(20rem,0.6fr)]">
          <div className="min-w-0 space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="grid gap-2">
                <Label htmlFor="email-template-name">Template name</Label>
                <Input
                  id="email-template-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Editor</Label>
                <div className="flex rounded-md border border-white/10 bg-background/60 p-1">
                  {(["code", "visual"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="tab"
                      aria-selected={kind === option}
                      className={cn(
                        "h-9 rounded px-3 text-sm font-medium capitalize",
                        kind === option
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => setKind(option)}
                    >
                      {option === "code" ? "Code" : "Visual"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {kind === "code" ? (
              <CodeEmailEditor source={source} onChange={setSource} />
            ) : (
              <VisualEmailEditor
                document={visualDocument}
                onChange={setVisualDocument}
              />
            )}
            {error && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
          <aside className="space-y-4">
            <div className="rounded-md border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <Code2 className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Expressive, bounded TSX</p>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">
                    React Email layout components are supported with Merge,
                    When, and Each. Imports, network calls, arbitrary functions,
                    and raw HTML are rejected.
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-md border border-white/10 bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">Preview & inferred fields</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!initial.id || !onPreview || isPreviewing}
                  onClick={async () => {
                    if (!initial.id || !onPreview) return;
                    setIsPreviewing(true);
                    try {
                      setPreview(await onPreview(initial.id));
                    } finally {
                      setIsPreviewing(false);
                    }
                  }}
                >
                  {isPreviewing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  Preview
                </Button>
              </div>
              {preview ? (
                <>
                  <div className="mt-4 max-h-80 overflow-auto rounded bg-white p-4 text-slate-950">
                    <iframe
                      title="Compiled email preview"
                      className="h-72 w-full border-0 bg-white"
                      sandbox=""
                      srcDoc={preview.html}
                    />
                  </div>
                  <div className="mt-4 space-y-2">
                    {preview.contract.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No merge fields inferred.
                      </p>
                    ) : (
                      preview.contract.map((field) => (
                        <div
                          key={field.field}
                          className="flex items-center justify-between gap-3 rounded border border-white/10 px-3 py-2 text-sm"
                        >
                          <code>{field.field}</code>
                          <span className="text-muted-foreground">
                            {field.required ? "required" : "optional"}
                            {field.fallback
                              ? ` · fallback “${field.fallback}”`
                              : ""}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Save the draft, then preview it to see the exact HTML and
                  personalization contract inferred from Merge, When, and Each.
                </p>
              )}
            </div>
          </aside>
        </div>
        <DialogFooter className="border-t border-border/70 px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={isSaving} onClick={save}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CountPreflight({
  isConfirming,
  onConfirm,
  preview,
}: {
  isConfirming: boolean;
  onConfirm?: () => Promise<void> | void;
  preview: EmailPortalPreview;
}) {
  const suppressed =
    preview.counts.excludedBlocklisted + preview.counts.excludedUnsubscribed;
  const blocked = preview.blockers.length > 0;
  return (
    <section className="rounded-md border border-primary/25 bg-primary/5 p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Delivery preflight
          </p>
          <div className="mt-2 flex items-end gap-3">
            <span className="font-mono text-5xl font-semibold tracking-tight">
              {preview.counts.finalUnique}
            </span>
            <span className="pb-1 text-sm text-muted-foreground">
              unique recipient
              {preview.counts.finalUnique === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded border border-white/10 bg-background/70 px-3 py-2">
            <dt className="text-xs text-muted-foreground">Duplicates</dt>
            <dd className="font-mono font-medium">
              {preview.counts.duplicatesCollapsed}
            </dd>
          </div>
          <div className="rounded border border-white/10 bg-background/70 px-3 py-2">
            <dt className="text-xs text-muted-foreground">Suppressed</dt>
            <dd className="font-mono font-medium">{suppressed}</dd>
          </div>
          <div className="rounded border border-white/10 bg-background/70 px-3 py-2">
            <dt className="text-xs text-muted-foreground">Missing</dt>
            <dd className="font-mono font-medium">
              {preview.counts.excludedMissingFields}
            </dd>
          </div>
        </dl>
      </div>
      {preview.blockers.length > 0 && (
        <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 p-3">
          <p className="flex items-center gap-2 text-sm font-medium text-destructive">
            <CircleAlert className="h-4 w-4" />
            Resolve personalization blockers
          </p>
          {preview.blockers.map((blocker) => (
            <p
              key={`${blocker.code}:${blocker.field}`}
              className="mt-1 font-mono text-sm"
            >
              {blocker.field} · {blocker.count} missing
            </p>
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Audience snapshot expires{" "}
          {new Date(preview.expiresAt).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
          .
        </p>
        <Button
          type="button"
          disabled={blocked || isConfirming || !onConfirm}
          onClick={() => onConfirm?.()}
        >
          Review & confirm
          {isConfirming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </section>
  );
}

export function EmailPortalWorkspace({
  audienceOptions,
  initialTab,
  isConfirming = false,
  isPreviewing = false,
  isTesting = false,
  onArchiveTemplate,
  onCancelSend,
  onConfirm,
  onDuplicateTemplate,
  onLoadTemplate,
  onPreview,
  onPreviewTemplate,
  onPublishTemplate,
  onRetrySend,
  onSaveTemplate,
  onSendTest,
  preview,
  sends,
  templates,
}: {
  audienceOptions: EmailAudienceOptions | [];
  initialTab: EmailPortalTab;
  isConfirming?: boolean;
  isPreviewing?: boolean;
  isTesting?: boolean;
  onArchiveTemplate?: (templateId: string) => Promise<void> | void;
  onCancelSend?: (sendId: string) => Promise<void> | void;
  onConfirm?: () => Promise<void> | void;
  onDuplicateTemplate?: (templateId: string) => Promise<void> | void;
  onLoadTemplate?: (templateId: string) => Promise<TemplateEditorSeed>;
  onPreview?: (input: {
    audiences: EmailAudienceDefinition[];
    content: EmailSendContent;
    scheduledFor: string | null;
  }) => Promise<void> | void;
  onPreviewTemplate?: (templateId: string) => Promise<TemplatePreviewResult>;
  onPublishTemplate?: (templateId: string) => Promise<void> | void;
  onRetrySend?: (sendId: string) => Promise<void> | void;
  onSaveTemplate?: (input: TemplateEditorSeed) => Promise<void> | void;
  onSendTest?: (content: EmailSendContent) => Promise<void> | void;
  preview: EmailPortalPreview | null;
  sends: EmailPortalSend[];
  templates: EmailPortalTemplate[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<EmailPortalTab>(initialTab);
  const [editor, setEditor] = useState<TemplateEditorSeed | null>(null);
  const [isLoadingEditor, setIsLoadingEditor] = useState(false);
  const [contentMode, setContentMode] = useState<"plainText" | "template">(
    "template",
  );
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [templatePreview, setTemplatePreview] = useState<{
    result: TemplatePreviewResult;
    templateId: string;
  } | null>(null);
  const [subject, setSubject] = useState("");
  const [plainText, setPlainText] = useState("");
  const [templateRevisionId, setTemplateRevisionId] = useState("");
  const [selectedAudiences, setSelectedAudiences] = useState(
    new Set<string>(["current_members"]),
  );
  const [scheduleMode, setScheduleMode] = useState<"now" | "schedule">("now");
  const [scheduledFor, setScheduledFor] = useState("");

  useEffect(() => {
    if (preview) setConfirmationOpen(true);
  }, [preview]);

  const options = Array.isArray(audienceOptions)
    ? { hackathons: [], presets: [] }
    : audienceOptions;
  const publishedTemplates = useMemo(
    () =>
      templates.flatMap((template) => {
        const revisionId =
          template.publishedRevision?.id ??
          (template.latestRevision?.state === "published"
            ? template.latestRevision.id
            : undefined);
        return revisionId ? [{ ...template, revisionId }] : [];
      }),
    [templates],
  );

  const content: EmailSendContent =
    contentMode === "plainText"
      ? { mode: "plainText", plainText, subject }
      : {
          fallbackData: {},
          mode: "template",
          subject,
          templateRevisionId,
        };

  const setActiveTab = (next: EmailPortalTab) => {
    setTab(next);
    router.replace(`/admin/email?tab=${next}`, { scroll: false });
  };

  const toggleAudience = (key: string) => {
    setSelectedAudiences((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else {
        if (key.endsWith(":all")) {
          const prefix = key.slice(0, -3);
          for (const value of next) {
            if (value.startsWith(prefix)) next.delete(value);
          }
        } else if (key.startsWith("hack:")) {
          const [, hackathonId] = key.split(":");
          next.delete(`hack:${hackathonId}:all`);
        }
        next.add(key);
      }
      return next;
    });
  };

  const tabs: {
    icon: LucideIcon;
    id: EmailPortalTab;
    label: string;
  }[] = [
    { icon: Sparkles, id: "templates", label: "Templates" },
    { icon: Send, id: "compose", label: "Compose" },
    { icon: Clock3, id: "sends", label: "Sends" },
  ];

  return (
    <main
      data-email-portal-layout="responsive"
      className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8"
    >
      <div className="overflow-hidden rounded-lg border border-white/10 bg-card shadow-2xl shadow-black/20">
        <header className="border-b border-border/70 px-4 py-5 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_18px_hsl(var(--primary))]" />
                Delivery console
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Email Portal
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Build reusable React Email templates, resolve a frozen audience,
                and hand one auditable campaign to Listmonk.
              </p>
            </div>
            <div className="grid grid-cols-3 divide-x divide-white/10 rounded-md border border-white/10 bg-background/60">
              <div className="px-4 py-2 text-center">
                <p className="font-mono text-lg font-semibold">
                  {templates.length}
                </p>
                <p className="text-xs text-muted-foreground">Templates</p>
              </div>
              <div className="px-4 py-2 text-center">
                <p className="font-mono text-lg font-semibold">
                  {sends.filter(({ status }) => status === "scheduled").length}
                </p>
                <p className="text-xs text-muted-foreground">Scheduled</p>
              </div>
              <div className="px-4 py-2 text-center">
                <p className="font-mono text-lg font-semibold">
                  {sends.filter(({ status }) => status === "running").length}
                </p>
                <p className="text-xs text-muted-foreground">Running</p>
              </div>
            </div>
          </div>
        </header>

        <div
          role="tablist"
          aria-label="Email portal sections"
          className="flex gap-1 overflow-x-auto border-b border-border/70 bg-background/40 px-3 pt-2 sm:px-5"
        >
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-controls={`email-${item.id}-panel`}
                aria-selected={tab === item.id}
                className={cn(
                  "flex h-11 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors",
                  tab === item.id
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        {tab === "templates" && (
          <section
            id="email-templates-panel"
            role="tabpanel"
            className="p-4 sm:p-6"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Reusable templates</h2>
                <p className="text-sm text-muted-foreground">
                  Drafts are immutable revisions. Only published revisions can
                  be selected for a send.
                </p>
              </div>
              <Button
                type="button"
                onClick={() =>
                  setEditor({
                    kind: "code",
                    name: "",
                    source: DEFAULT_CODE_TEMPLATE,
                  })
                }
              >
                <Plus className="h-4 w-4" /> New template
              </Button>
            </div>
            {templates.length === 0 ? (
              <div className="mt-6 rounded-md border border-dashed border-white/15 bg-background/40 px-5 py-12 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-primary" />
                <p className="mt-3 font-medium">No templates yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Start with safe TSX for full React Email layout control.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-3 xl:grid-cols-2">
                {templates.map((template) => (
                  <article
                    key={template.id}
                    className="group rounded-md border border-white/10 bg-background/55 p-4 transition-colors hover:border-primary/25"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary/10 text-primary">
                        {template.kind === "code" ? (
                          <Code2 className="h-5 w-5" />
                        ) : (
                          <Sparkles className="h-5 w-5" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-medium">
                            {template.name}
                          </h3>
                          <Badge
                            variant="outline"
                            className={statusClass(
                              template.latestRevision?.state ?? "draft",
                            )}
                          >
                            {template.latestRevision?.state ?? "draft"}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {template.kind === "code" ? "Safe TSX" : "Visual"} ·
                          revision {template.latestRevision?.version ?? 1}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!onLoadTemplate || isLoadingEditor}
                        onClick={async () => {
                          if (!onLoadTemplate) return;
                          setIsLoadingEditor(true);
                          try {
                            setEditor(await onLoadTemplate(template.id));
                          } finally {
                            setIsLoadingEditor(false);
                          }
                        }}
                      >
                        <Eye className="h-4 w-4" /> Edit & preview
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!onPreviewTemplate}
                        onClick={async () => {
                          if (!onPreviewTemplate) return;
                          const result = await onPreviewTemplate(template.id);
                          setTemplatePreview({
                            result,
                            templateId: template.id,
                          });
                        }}
                      >
                        <Eye className="h-4 w-4" /> Preview template
                      </Button>
                      {template.latestRevision?.state === "draft" && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onPublishTemplate?.(template.id)}
                        >
                          <Rocket className="h-4 w-4" /> Publish
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => onDuplicateTemplate?.(template.id)}
                      >
                        <Copy className="h-4 w-4" /> Duplicate
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => onArchiveTemplate?.(template.id)}
                      >
                        <Archive className="h-4 w-4" /> Archive
                      </Button>
                    </div>
                    {templatePreview?.templateId === template.id && (
                      <div className="mt-4 rounded-md border border-white/10 bg-background/70 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Sample output
                        </p>
                        <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">
                          {templatePreview.result.text}
                        </pre>
                        {templatePreview.result.contract.length > 0 && (
                          <p className="mt-2 font-mono text-xs text-primary">
                            {templatePreview.result.contract
                              .map(({ field }) => field)
                              .join(" · ")}
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === "compose" && (
          <section
            id="email-compose-panel"
            role="tabpanel"
            className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_24rem]"
          >
            <div className="space-y-6 p-4 sm:p-6">
              <div>
                <h2 className="text-lg font-semibold">Compose campaign</h2>
                <p className="text-sm text-muted-foreground">
                  The audience is resolved, deduplicated, and frozen before
                  confirmation.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email-subject">Subject</Label>
                <Input
                  id="email-subject"
                  maxLength={200}
                  placeholder="A concise, useful subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                />
              </div>
              <div className="space-y-3">
                <Label>Content</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    {
                      description: "Use a published reusable layout.",
                      icon: Sparkles,
                      id: "template" as const,
                      label: "React Email template",
                    },
                    {
                      description: "Send a simple text-only campaign.",
                      icon: FileText,
                      id: "plainText" as const,
                      label: "Plain text",
                    },
                  ].map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={cn(
                          "flex items-start gap-3 rounded-md border p-3 text-left",
                          contentMode === option.id
                            ? "border-primary/40 bg-primary/10"
                            : "border-white/10 bg-background/50",
                        )}
                        onClick={() => setContentMode(option.id)}
                      >
                        <Icon className="mt-0.5 h-5 w-5 text-primary" />
                        <span>
                          <span className="block text-sm font-medium">
                            {option.label}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {option.description}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {contentMode === "template" ? (
                  <div className="grid gap-2">
                    <Label htmlFor="published-template">Email template</Label>
                    <select
                      id="published-template"
                      className="h-11 rounded-md border border-input bg-background px-3 text-sm"
                      value={templateRevisionId}
                      onChange={(event) =>
                        setTemplateRevisionId(event.target.value)
                      }
                    >
                      <option value="">Choose a template</option>
                      {publishedTemplates.map((template) => (
                        <option
                          key={template.revisionId}
                          value={template.revisionId}
                        >
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="plain-text-email">Message</Label>
                    <Textarea
                      id="plain-text-email"
                      className="min-h-44"
                      placeholder="Write the complete text email…"
                      value={plainText}
                      onChange={(event) => setPlainText(event.target.value)}
                    />
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <Label>Audience</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Overlapping selections collapse to one normalized email.
                    Team means enabled roster roles with linked member profiles.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {options.presets.map((preset) => (
                    <label
                      key={preset.kind}
                      className={cn(
                        "flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm",
                        selectedAudiences.has(preset.kind)
                          ? "border-primary/35 bg-primary/10"
                          : "border-white/10 bg-background/50",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAudiences.has(preset.kind)}
                        onChange={() => toggleAudience(preset.kind)}
                      />
                      {preset.label}
                    </label>
                  ))}
                </div>
                {options.hackathons.map((hackathon) => (
                  <div
                    key={hackathon.id}
                    className="rounded-md border border-white/10 bg-background/45 p-3"
                  >
                    <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
                      <input
                        type="checkbox"
                        checked={selectedAudiences.has(
                          `hack:${hackathon.id}:all`,
                        )}
                        onChange={() =>
                          toggleAudience(`hack:${hackathon.id}:all`)
                        }
                      />
                      {hackathon.allLabel}
                    </label>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {hackathon.statuses.map((status) => {
                        const key = `hack:${hackathon.id}:${status}`;
                        return (
                          <label
                            key={key}
                            className={cn(
                              "cursor-pointer rounded border px-2.5 py-1.5 text-xs capitalize",
                              selectedAudiences.has(key)
                                ? "border-primary/35 bg-primary/10"
                                : "border-white/10",
                            )}
                          >
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={selectedAudiences.has(key)}
                              onChange={() => toggleAudience(key)}
                            />
                            {status}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <Label>Delivery</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-3 rounded-md border p-3 text-left",
                      scheduleMode === "now"
                        ? "border-primary/35 bg-primary/10"
                        : "border-white/10 bg-background/50",
                    )}
                    onClick={() => setScheduleMode("now")}
                  >
                    <Send className="h-5 w-5 text-primary" />
                    <span>
                      <span className="block text-sm font-medium">
                        Send now
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Handoff after confirmation
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-3 rounded-md border p-3 text-left",
                      scheduleMode === "schedule"
                        ? "border-primary/35 bg-primary/10"
                        : "border-white/10 bg-background/50",
                    )}
                    onClick={() => setScheduleMode("schedule")}
                  >
                    <CalendarClock className="h-5 w-5 text-primary" />
                    <span>
                      <span className="block text-sm font-medium">
                        Schedule
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Frozen audience, late suppressions removed
                      </span>
                    </span>
                  </button>
                </div>
                {scheduleMode === "schedule" && (
                  <Label htmlFor="scheduled-delivery">Schedule for</Label>
                )}
                <Input
                  id="scheduled-delivery"
                  aria-label="Schedule for"
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={(event) => {
                    setScheduledFor(event.target.value);
                    setScheduleMode(event.target.value ? "schedule" : "now");
                  }}
                />
                {scheduleMode === "schedule" && (
                  <p className="text-xs text-muted-foreground">
                    Forge holds the frozen audience until this time, then
                    removes late suppressions immediately before handoff.
                  </p>
                )}
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-border/70 pt-5 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    isTesting ||
                    !subject.trim() ||
                    (contentMode === "template"
                      ? !templateRevisionId
                      : !plainText.trim())
                  }
                  onClick={() => onSendTest?.(content)}
                >
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FlaskConical className="h-4 w-4" />
                  )}
                  Send test to Dylan
                </Button>
                <Button
                  type="button"
                  disabled={
                    isPreviewing ||
                    !subject.trim() ||
                    selectedAudiences.size === 0 ||
                    (contentMode === "template"
                      ? !templateRevisionId
                      : !plainText.trim()) ||
                    (scheduleMode === "schedule" && !scheduledFor)
                  }
                  onClick={() =>
                    onPreview?.({
                      audiences: audienceDefinitions(selectedAudiences),
                      content,
                      scheduledFor:
                        scheduleMode === "schedule"
                          ? dateTimeLocalToIso(scheduledFor)
                          : null,
                    })
                  }
                >
                  {isPreviewing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UsersRound className="h-4 w-4" />
                  )}
                  Preview audience
                </Button>
              </div>
            </div>
            <aside className="border-t border-border/70 bg-background/35 p-4 xl:border-l xl:border-t-0 xl:p-5">
              <div className="sticky top-20 space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Safety rail
                  </p>
                  <div className="mt-3 space-y-3">
                    {[
                      "No bulk delivery outside production mode",
                      "Test sends are fixed to dylan@knighthacks.org",
                      "Final unique count is locked at confirmation",
                      "Late unsubscribes are removed before handoff",
                    ].map((item) => (
                      <p
                        key={item}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
                {preview ? (
                  <CountPreflight
                    isConfirming={isConfirming}
                    onConfirm={
                      onConfirm ? () => setConfirmationOpen(true) : undefined
                    }
                    preview={preview}
                  />
                ) : (
                  <div className="rounded-md border border-dashed border-white/15 p-4">
                    <p className="text-sm font-medium">
                      Resolve before sending
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      You’ll see raw matches, collapsed duplicates,
                      suppressions, missing merge fields, and the exact final
                      recipient count here.
                    </p>
                  </div>
                )}
              </div>
            </aside>
          </section>
        )}

        {tab === "sends" && (
          <section
            id="email-sends-panel"
            role="tabpanel"
            className="p-4 sm:p-6"
          >
            <div>
              <h2 className="text-lg font-semibold">Delivery history</h2>
              <p className="text-sm text-muted-foreground">
                Campaign state is reconciled with Listmonk. Recipient snapshots
                are retained for 90 days.
              </p>
            </div>
            <div className="mt-5 overflow-hidden rounded-md border border-white/10">
              {sends.length === 0 ? (
                <div className="px-5 py-12 text-center text-sm text-muted-foreground">
                  No sends yet.
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {sends.map((send) => (
                    <article
                      key={send.id}
                      role="row"
                      aria-label={`${send.subject} ${statusLabel(send.status)}`}
                      className="grid gap-3 bg-background/45 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{send.subject}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {send.scheduledFor
                            ? new Date(send.scheduledFor).toLocaleString()
                            : "Immediate delivery"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {send.finalRecipientCount ?? send.recipientCount ?? 0}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          recipients
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 sm:justify-end">
                        <Badge
                          variant="outline"
                          className={cn("capitalize", statusClass(send.status))}
                        >
                          {statusLabel(send.status)}
                        </Badge>
                        {(send.status === "scheduled" ||
                          send.status === "draft") && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => onCancelSend?.(send.id)}
                          >
                            Cancel
                          </Button>
                        )}
                        {(send.status === "retryable_failure" ||
                          send.status === "failed") && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onRetrySend?.(send.id)}
                          >
                            <RefreshCw className="h-4 w-4" /> Retry
                          </Button>
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {editor && (
        <TemplateEditorDialog
          initial={editor}
          onClose={() => setEditor(null)}
          onPreview={onPreviewTemplate}
          onSave={onSaveTemplate}
        />
      )}
      {preview && (
        <Dialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
          <DialogContent className="max-w-xl border-white/10 bg-card">
            <DialogHeader className="text-left">
              <DialogTitle>
                {scheduleMode === "schedule"
                  ? "Confirm scheduled email"
                  : "Confirm email delivery"}
              </DialogTitle>
              <DialogDescription>
                This locks the frozen audience and content version shown below.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border border-primary/25 bg-primary/5 p-5 text-center">
              <p className="font-mono text-6xl font-semibold tracking-tight">
                {preview.counts.finalUnique}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {preview.counts.finalUnique} unique recipient
                {preview.counts.finalUnique === 1 ? "" : "s"}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded border border-white/10 p-2">
                {preview.counts.duplicatesCollapsed} duplicates
              </div>
              <div className="rounded border border-white/10 p-2">
                {preview.counts.excludedBlocklisted +
                  preview.counts.excludedUnsubscribed}{" "}
                suppressed
              </div>
              <div className="rounded border border-white/10 p-2">
                {preview.counts.excludedMissingFields} missing
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmationOpen(false)}
              >
                Back
              </Button>
              <Button
                type="button"
                disabled={preview.blockers.length > 0 || isConfirming}
                onClick={async () => {
                  await onConfirm?.();
                  setConfirmationOpen(false);
                }}
              >
                {isConfirming && <Loader2 className="h-4 w-4 animate-spin" />}
                {scheduleMode === "schedule" ? "Schedule email" : "Send email"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}
