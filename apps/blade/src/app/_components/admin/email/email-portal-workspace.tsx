"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Archive,
  CalendarClock,
  ChevronRight,
  CircleAlert,
  Clock3,
  Code2,
  Copy,
  Eye,
  FileText,
  FlaskConical,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  Rocket,
  Search,
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

import type {
  CampaignAudienceMode,
  EmailAudienceOptions,
  EmailAudienceResolution,
  EmailPortalPreview,
  EmailPortalSend,
  EmailPortalSendDetail,
  EmailPortalTab,
  EmailPortalTemplate,
  TemplateEditorSeed,
  TemplatePreviewResult,
} from "./email-portal-types";
import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import { ADMIN_PAGE_EYEBROWS } from "~/consts/admin-page-eyebrows";
import { formatClubDateTime, formatClubTime } from "~/lib/dates";
import {
  audienceDefinitions,
  toggleAudienceSelection,
} from "./email-audience-selection";
import { suppressedRecipientCount } from "./email-preview-counts";
import { visibleRecipients as filterVisibleRecipients } from "./email-recipient-list";
import { dateTimeLocalToIso } from "./email-schedule-formatting";
import { statusClass, statusLabel } from "./email-send-status";
import {
  DEFAULT_CODE_TEMPLATE,
  DEFAULT_VISUAL_DOCUMENT,
} from "./email-template-defaults";
import { publishedTemplateOptions } from "./email-template-revisions";
import { useAudienceResolution } from "./use-audience-resolution";
import { useEmailComposeDraft } from "./use-email-compose-draft";

export type {
  CampaignAudienceMode,
  EmailAudienceOptions,
  EmailAudienceResolution,
  EmailPortalPreview,
  EmailPortalSend,
  EmailPortalSendDetail,
  EmailPortalTab,
  EmailPortalTemplate,
  TemplateEditorSeed,
  TemplatePreviewResult,
};

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
  const suppressed = suppressedRecipientCount(preview.counts);
  const blocked = preview.blockers.length > 0;
  return (
    <section className="rounded-md border border-primary/25 bg-primary/5 p-4 sm:p-5">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Delivery preflight
          </p>
          <div className="mt-2 flex items-end gap-3">
            <span className="font-mono text-4xl font-semibold tracking-tight">
              {preview.counts.finalUnique}
            </span>
            <span className="pb-1 text-sm text-muted-foreground">
              unique recipient
              {preview.counts.finalUnique === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-2 text-center">
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
          <div className="rounded border border-white/10 bg-background/70 px-3 py-2">
            <dt className="text-xs text-muted-foreground">Deselected</dt>
            <dd className="font-mono font-medium">
              {preview.counts.excludedManual ?? 0}
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
          Audience snapshot expires {formatClubTime(preview.expiresAt)}.
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
  campaignAudienceMode = "all",
  initialTab,
  isConfirming = false,
  isPreviewing = false,
  isTesting = false,
  onArchiveTemplate,
  onCancelSend,
  onConfirm,
  onDuplicateTemplate,
  onLoadTemplate,
  onLoadSend,
  onPreview,
  onPreviewTemplate,
  onPublishTemplate,
  onResolveAudience,
  onRetrySend,
  onSaveTemplate,
  onSendTest,
  preview,
  sends,
  templates,
}: {
  audienceOptions: EmailAudienceOptions | [];
  campaignAudienceMode?: CampaignAudienceMode;
  initialTab: EmailPortalTab;
  isConfirming?: boolean;
  isPreviewing?: boolean;
  isTesting?: boolean;
  onArchiveTemplate?: (templateId: string) => Promise<void> | void;
  onCancelSend?: (sendId: string) => Promise<void> | void;
  onConfirm?: () => Promise<void> | void;
  onDuplicateTemplate?: (templateId: string) => Promise<void> | void;
  onLoadTemplate?: (templateId: string) => Promise<TemplateEditorSeed>;
  onLoadSend?: (sendId: string) => Promise<EmailPortalSendDetail>;
  onPreview?: (input: {
    audiences: EmailAudienceDefinition[];
    content: EmailSendContent;
    excludedRecipients: string[];
    scheduledFor: string | null;
  }) => Promise<void> | void;
  onPreviewTemplate?: (templateId: string) => Promise<TemplatePreviewResult>;
  onPublishTemplate?: (templateId: string) => Promise<void> | void;
  onResolveAudience?: (
    audiences: EmailAudienceDefinition[],
  ) => Promise<EmailAudienceResolution>;
  onRetrySend?: (sendId: string) => Promise<void> | void;
  onSaveTemplate?: (input: TemplateEditorSeed) => Promise<void> | void;
  onSendTest?: (content: EmailSendContent) => Promise<void> | void;
  preview: EmailPortalPreview | null;
  sends: EmailPortalSend[];
  templates: EmailPortalTemplate[];
}) {
  const router = useRouter();
  const campaignDeliveryEnabled = campaignAudienceMode !== "disabled";
  const developmentReviewCampaign =
    campaignAudienceMode === "development_review";
  const [tab, setTab] = useState<EmailPortalTab>(initialTab);
  const [editor, setEditor] = useState<TemplateEditorSeed | null>(null);
  const [isLoadingEditor, setIsLoadingEditor] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [sendDetail, setSendDetail] = useState<EmailPortalSendDetail | null>(
    null,
  );
  const [loadingSendId, setLoadingSendId] = useState<string | null>(null);
  const [templatePreview, setTemplatePreview] = useState<{
    result: TemplatePreviewResult;
    templateId: string;
  } | null>(null);
  const {
    clear: clearComposeDraft,
    compose,
    setExcludedRecipients,
    update: updateCompose,
  } = useEmailComposeDraft(developmentReviewCampaign);
  const {
    contentMode,
    excludedRecipients,
    plainText,
    scheduleMode,
    scheduledFor,
    selectedAudiences,
    subject,
    templateRevisionId,
  } = compose;

  useEffect(() => {
    if (preview) setConfirmationOpen(true);
  }, [preview]);

  const options = Array.isArray(audienceOptions)
    ? { hackathons: [], presets: [], roles: [] }
    : audienceOptions;
  const publishedTemplates = useMemo(
    () => publishedTemplateOptions(templates),
    [templates],
  );
  const selectedAudienceDefinitions = useMemo(
    () => audienceDefinitions(selectedAudiences),
    [selectedAudiences],
  );
  const { isResolving: isResolvingAudience, resolution: audienceResolution } =
    useAudienceResolution({
      audiences: selectedAudienceDefinitions,
      resolve: onResolveAudience,
      setExcludedRecipients,
    });
  const visibleRecipients = useMemo(
    () =>
      filterVisibleRecipients(
        audienceResolution?.recipients ?? [],
        recipientSearch,
      ),
    [audienceResolution, recipientSearch],
  );
  const selectedRecipientCount =
    (audienceResolution?.recipients.length ?? 0) - excludedRecipients.size;

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
    updateCompose("selectedAudiences", (current) =>
      toggleAudienceSelection(current, key),
    );
  };

  const tabs: {
    icon: LucideIcon;
    id: EmailPortalTab;
    label: string;
  }[] = [
    { icon: Send, id: "compose", label: "Compose" },
    { icon: Sparkles, id: "templates", label: "Templates" },
    { icon: Clock3, id: "sends", label: "Sends" },
  ];

  return (
    <main
      data-email-portal-layout="responsive"
      className={adminPageLayoutClassName}
    >
      <AdminPageHeader
        description="Build reusable email templates, choose exactly who should receive them, and review every delivery from one place."
        eyebrow={ADMIN_PAGE_EYEBROWS.email}
        icon={Mail}
        title="Email Portal"
      />
      <div className="overflow-hidden rounded-lg border border-white/10 bg-card shadow-2xl shadow-black/20">
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
                    aria-label={`${template.name} template`}
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
            className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_21rem]"
          >
            <div className="space-y-6 p-4 sm:p-6">
              <div>
                <h2 className="text-lg font-semibold">Compose campaign</h2>
                <p className="text-sm text-muted-foreground">
                  The audience is resolved, deduplicated, and frozen before
                  confirmation.
                </p>
              </div>
              {!campaignDeliveryEnabled && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                  Audience delivery is disabled in this environment. Use “Send
                  test to directors” to exercise Listmonk safely.
                </div>
              )}
              {developmentReviewCampaign && (
                <div className="rounded-md border border-violet-500/30 bg-violet-500/10 p-3 text-sm text-violet-100">
                  Development review mode is live. Campaign delivery is enforced
                  server-side to Team members and the explicit roles selected
                  below.
                </div>
              )}
              <div className="grid gap-2">
                <Label htmlFor="email-subject">Subject</Label>
                <Input
                  id="email-subject"
                  maxLength={200}
                  placeholder="A concise, useful subject"
                  value={subject}
                  onChange={(event) =>
                    updateCompose("subject", event.target.value)
                  }
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
                        onClick={() => updateCompose("contentMode", option.id)}
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
                        updateCompose("templateRevisionId", event.target.value)
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
                      onChange={(event) =>
                        updateCompose("plainText", event.target.value)
                      }
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
                  {options.presets
                    .filter(
                      (preset) =>
                        !developmentReviewCampaign ||
                        preset.kind === "team_members",
                    )
                    .map((preset) => (
                      <label
                        key={preset.kind}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-md border px-3 py-2 text-sm",
                          "cursor-pointer",
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
                <div className="rounded-md border border-white/10 bg-background/45 p-3">
                  <p className="mb-3 text-sm font-medium">Roles</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {options.roles.map((role) => {
                      const key = `role:${role.id}`;
                      return (
                        <label
                          key={role.id}
                          className={cn(
                            "flex min-h-10 cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm",
                            selectedAudiences.has(key)
                              ? "border-primary/35 bg-primary/10"
                              : "border-white/10",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={selectedAudiences.has(key)}
                            onChange={() => toggleAudience(key)}
                          />
                          {role.name || "Unnamed role"}
                        </label>
                      );
                    })}
                    {options.roles.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No roles are configured.
                      </p>
                    )}
                  </div>
                </div>
                {!developmentReviewCampaign &&
                  options.hackathons.map((hackathon) => (
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
                    onClick={() => updateCompose("scheduleMode", "now")}
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
                    onClick={() => updateCompose("scheduleMode", "schedule")}
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
                    updateCompose("scheduledFor", event.target.value);
                    updateCompose(
                      "scheduleMode",
                      event.target.value ? "schedule" : "now",
                    );
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
                  Send test to directors
                </Button>
                <Button
                  type="button"
                  disabled={
                    isPreviewing ||
                    !subject.trim() ||
                    selectedAudiences.size === 0 ||
                    (audienceResolution !== null &&
                      selectedRecipientCount === 0) ||
                    (contentMode === "template"
                      ? !templateRevisionId
                      : !plainText.trim()) ||
                    (scheduleMode === "schedule" && !scheduledFor)
                  }
                  onClick={() =>
                    onPreview?.({
                      audiences: audienceDefinitions(selectedAudiences),
                      content,
                      excludedRecipients: [...excludedRecipients].sort(),
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
                <section aria-labelledby="recipient-pool-heading">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3
                        id="recipient-pool-heading"
                        className="text-sm font-semibold"
                      >
                        Recipients
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {isResolvingAudience
                          ? "Resolving selected groups…"
                          : `${selectedRecipientCount} of ${
                              audienceResolution?.recipients.length ?? 0
                            } selected`}
                      </p>
                    </div>
                    {isResolvingAudience && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                  </div>
                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      aria-label="Search selected audience"
                      className="h-10 pl-9"
                      placeholder="Search people"
                      value={recipientSearch}
                      onChange={(event) =>
                        setRecipientSearch(event.target.value)
                      }
                    />
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={!audienceResolution?.recipients.length}
                      onClick={() => setExcludedRecipients(new Set())}
                    >
                      Select all
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={!audienceResolution?.recipients.length}
                      onClick={() =>
                        setExcludedRecipients(
                          new Set(
                            audienceResolution?.recipients.map(
                              ({ email }) => email,
                            ) ?? [],
                          ),
                        )
                      }
                    >
                      Deselect all
                    </Button>
                  </div>
                  <div className="mt-2 max-h-[28rem] space-y-1 overflow-y-auto pr-1">
                    {!isResolvingAudience && visibleRecipients.length === 0 ? (
                      <p className="rounded-md border border-dashed border-white/15 px-3 py-8 text-center text-xs leading-5 text-muted-foreground">
                        {audienceResolution
                          ? "No recipients match this search."
                          : "Choose an audience group to see its members."}
                      </p>
                    ) : (
                      visibleRecipients.map((recipient) => (
                        <label
                          key={recipient.email}
                          className="flex cursor-pointer items-start gap-2 rounded-md border border-transparent px-2 py-2 hover:border-white/10 hover:bg-background/60"
                        >
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={!excludedRecipients.has(recipient.email)}
                            onChange={() =>
                              setExcludedRecipients((current) => {
                                const next = new Set(current);
                                if (next.has(recipient.email)) {
                                  next.delete(recipient.email);
                                } else {
                                  next.add(recipient.email);
                                }
                                return next;
                              })
                            }
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-xs font-medium">
                              {recipient.name || recipient.email}
                            </span>
                            <span className="block truncate text-[11px] text-muted-foreground">
                              {recipient.email}
                            </span>
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </section>
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
                            ? formatClubDateTime(send.scheduledFor)
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
                          send.status === "failed" ||
                          (send.status === "queued" && send.safeError)) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onRetrySend?.(send.id)}
                          >
                            <RefreshCw className="h-4 w-4" /> Retry
                          </Button>
                        )}
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`View details for ${send.subject}`}
                          disabled={!onLoadSend || loadingSendId === send.id}
                          onClick={async () => {
                            if (!onLoadSend) return;
                            setLoadingSendId(send.id);
                            try {
                              setSendDetail(await onLoadSend(send.id));
                            } catch {
                              // The caller surfaces the request failure.
                            } finally {
                              setLoadingSendId(null);
                            }
                          }}
                        >
                          {loadingSendId === send.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
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
      {sendDetail && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setSendDetail(null);
          }}
        >
          <DialogContent className="max-h-[94svh] max-w-5xl overflow-y-auto border-white/10 bg-card p-0">
            <DialogHeader className="border-b border-border/70 px-5 py-4 text-left">
              <div className="flex flex-wrap items-center gap-2 pr-8">
                <DialogTitle>{sendDetail.send.subject}</DialogTitle>
                <Badge
                  variant="outline"
                  className={cn(
                    "capitalize",
                    statusClass(sendDetail.send.status),
                  )}
                >
                  {statusLabel(sendDetail.send.status)}
                </Badge>
              </div>
              <DialogDescription>
                Sent by{" "}
                {sendDetail.createdBy?.name ??
                  sendDetail.createdBy?.email ??
                  "Unknown administrator"}
                {sendDetail.send.createdAt
                  ? ` on ${formatClubDateTime(sendDetail.send.createdAt)}`
                  : ""}
                .
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
              <div className="min-w-0 space-y-5">
                <section>
                  <h3 className="text-sm font-semibold">Message body</h3>
                  <div className="mt-2 overflow-hidden rounded-md border border-white/10 bg-white">
                    {sendDetail.send.compiledHtml ? (
                      <iframe
                        title={`Email body for ${sendDetail.send.subject}`}
                        className="h-[34rem] w-full border-0 bg-white"
                        sandbox=""
                        srcDoc={sendDetail.send.compiledHtml}
                      />
                    ) : (
                      <pre className="max-h-[34rem] overflow-auto whitespace-pre-wrap p-5 font-sans text-sm leading-6 text-slate-950">
                        {sendDetail.send.compiledText ??
                          sendDetail.send.plainTextSource ??
                          "No retained message body."}
                      </pre>
                    )}
                  </div>
                </section>
                <section>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">Recipients</h3>
                    <span className="font-mono text-xs text-muted-foreground">
                      {sendDetail.recipients.length} retained
                    </span>
                  </div>
                  <div className="mt-2 max-h-80 divide-y divide-white/10 overflow-y-auto rounded-md border border-white/10">
                    {sendDetail.recipients.length === 0 ? (
                      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Recipient details are no longer retained.
                      </p>
                    ) : (
                      sendDetail.recipients.map((recipient) => (
                        <div
                          key={recipient.email}
                          className="flex items-start justify-between gap-3 px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm">
                              {recipient.email}
                            </p>
                            {Array.isArray(recipient.matchReasons) && (
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {recipient.matchReasons
                                  .filter(
                                    (reason): reason is string =>
                                      typeof reason === "string",
                                  )
                                  .map(statusLabel)
                                  .join(" · ")}
                              </p>
                            )}
                          </div>
                          {recipient.exclusionReason && (
                            <Badge variant="outline">
                              {statusLabel(recipient.exclusionReason)}
                            </Badge>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
              <aside className="space-y-5">
                <section className="rounded-md border border-white/10 bg-background/50 p-4">
                  <h3 className="text-sm font-semibold">Delivery summary</h3>
                  <dl className="mt-3 space-y-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Audience</dt>
                      <dd className="font-mono">
                        {sendDetail.send.finalRecipientCount ??
                          sendDetail.send.recipientCount ??
                          0}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Provider sent</dt>
                      <dd className="font-mono">
                        {sendDetail.send.providerSentCount ?? 0}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Bounces</dt>
                      <dd className="font-mono">
                        {sendDetail.send.providerBounceCount ?? 0}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">Scheduled</dt>
                      <dd className="text-right">
                        {sendDetail.send.scheduledFor
                          ? formatClubDateTime(sendDetail.send.scheduledFor)
                          : "Immediately"}
                      </dd>
                    </div>
                  </dl>
                  {sendDetail.send.safeError && (
                    <div className="mt-4 rounded border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                      <p>{sendDetail.send.safeError}</p>
                      {sendDetail.send.nextRetryAt && (
                        <p className="mt-1">
                          Automatic retry:{" "}
                          {formatClubDateTime(sendDetail.send.nextRetryAt)}
                        </p>
                      )}
                    </div>
                  )}
                </section>
                <section>
                  <h3 className="text-sm font-semibold">Activity</h3>
                  <div className="mt-2 max-h-96 space-y-2 overflow-y-auto">
                    {sendDetail.events.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No delivery events recorded.
                      </p>
                    ) : (
                      sendDetail.events.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-md border border-white/10 bg-background/45 p-3"
                        >
                          <p className="text-sm font-medium">
                            {statusLabel(event.type)}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatClubDateTime(event.createdAt)}
                            {event.toStatus
                              ? ` · ${statusLabel(event.toStatus)}`
                              : ""}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </aside>
            </div>
          </DialogContent>
        </Dialog>
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
            <div className="grid grid-cols-2 gap-2 text-center text-sm">
              <div className="rounded border border-white/10 p-2">
                {preview.counts.duplicatesCollapsed} duplicates
              </div>
              <div className="rounded border border-white/10 p-2">
                {suppressedRecipientCount(preview.counts)} suppressed
              </div>
              <div className="rounded border border-white/10 p-2">
                {preview.counts.excludedMissingFields} missing
              </div>
              <div className="rounded border border-white/10 p-2">
                {preview.counts.excludedManual ?? 0} deselected
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
                disabled={
                  !campaignDeliveryEnabled ||
                  !onConfirm ||
                  preview.blockers.length > 0 ||
                  isConfirming
                }
                onClick={async () => {
                  if (!onConfirm) return;
                  await onConfirm();
                  clearComposeDraft();
                  setConfirmationOpen(false);
                }}
              >
                {isConfirming && <Loader2 className="h-4 w-4 animate-spin" />}
                {!campaignDeliveryEnabled
                  ? "Audience delivery disabled"
                  : scheduleMode === "schedule"
                    ? "Schedule email"
                    : "Send email"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </main>
  );
}
