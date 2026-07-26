"use client";

import { useMemo, useState } from "react";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  Eye,
  FileText,
  ImagePlus,
  Loader2,
  Monitor,
  Pencil,
  Plus,
  RotateCcw,
  Smartphone,
  Trash2,
} from "lucide-react";

import type { AlumniBulletinPostInput } from "@forge/validators";
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
import { alumniBulletinPostSchema } from "@forge/validators";

import type { AlumniBulletinCardData } from "~/app/_components/member/alumni-dashboard";
import {
  adminPageClassName,
  AdminPageHeader,
  adminPageStackClassName,
} from "~/app/_components/admin/admin-page";
import { AlumniBulletinCard } from "~/app/_components/member/alumni-dashboard";

export interface AlumniBulletinWorkspacePost extends AlumniBulletinCardData {
  displayOrder: number;
  expiresAt: Date | string | null;
  formName?: string | null;
  imageObjectName?: string | null;
  publishAt: Date | string | null;
  state: "archived" | "draft" | "published";
  status?: "archived" | "draft" | "expired" | "published" | "scheduled";
}

export interface AlumniLinkableForm {
  id: string;
  name: string;
  slug: string;
}

export type BulletinSaveHandler = (
  input: AlumniBulletinPostInput,
  fileContent?: string,
) => Promise<void> | void;

export type BulletinEditHandler = (
  postId: string,
  input: AlumniBulletinPostInput,
  fileContent?: string,
) => Promise<void> | void;

function toLocalDateTime(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function derivedStatus(post: AlumniBulletinWorkspacePost) {
  if (post.status) return post.status;
  if (post.state === "archived") return "archived";
  if (post.state === "draft") return "draft";
  const now = Date.now();
  if (post.expiresAt && new Date(post.expiresAt).getTime() <= now) {
    return "expired";
  }
  if (post.publishAt && new Date(post.publishAt).getTime() > now) {
    return "scheduled";
  }
  return "published";
}

function statusLabel(status: ReturnType<typeof derivedStatus>) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function statusClass(status: ReturnType<typeof derivedStatus>) {
  if (status === "published") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  }
  if (status === "scheduled") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-300";
  }
  if (status === "expired") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  }
  return "border-white/10 bg-background/60 text-muted-foreground";
}

async function fileToBulletinImage(file: File) {
  const source = await createImageBitmap(file);
  const targetWidth = Math.min(1_600, source.width);
  const targetHeight = Math.round(targetWidth * (9 / 16));
  const sourceRatio = source.width / source.height;
  const targetRatio = 16 / 9;
  const sourceWidth =
    sourceRatio > targetRatio ? source.height * targetRatio : source.width;
  const sourceHeight =
    sourceRatio > targetRatio ? source.height : source.width / targetRatio;
  const sourceX = (source.width - sourceWidth) / 2;
  const sourceY = (source.height - sourceHeight) / 2;
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image preview could not be prepared.");
  context.drawImage(
    source,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    targetWidth,
    targetHeight,
  );
  source.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.82),
  );
  if (!blob) throw new Error("Image preview could not be prepared.");
  if (blob.size > 2 * 1024 * 1024) {
    throw new Error("Bulletin image must be 2MB or smaller.");
  }
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Image could not be read."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Image could not be read."));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(blob);
  });
}

function BulletinEditorDialog({
  forms,
  initial,
  onClose,
  onSave,
  open,
}: {
  forms: AlumniLinkableForm[];
  initial?: AlumniBulletinWorkspacePost;
  onClose: () => void;
  onSave: BulletinSaveHandler;
  open: boolean;
}) {
  const initialAction = initial?.externalUrl
    ? "external"
    : initial?.formId
      ? "form"
      : "none";
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [state, setState] = useState<"draft" | "published">(
    initial?.state === "published" ? "published" : "draft",
  );
  const [publishAt, setPublishAt] = useState(
    toLocalDateTime(initial?.publishAt),
  );
  const [expiresAt, setExpiresAt] = useState(
    toLocalDateTime(initial?.expiresAt),
  );
  const [actionType, setActionType] = useState(initialAction);
  const [ctaLabel, setCtaLabel] = useState(initial?.ctaLabel ?? "");
  const [externalUrl, setExternalUrl] = useState(initial?.externalUrl ?? "");
  const [formId, setFormId] = useState(initial?.formId ?? "");
  const [imageObjectName, setImageObjectName] = useState(
    initial?.imageObjectName ?? null,
  );
  const [imageAlt, setImageAlt] = useState(initial?.imageAlt ?? "");
  const [imagePreview, setImagePreview] = useState(initial?.imageUrl ?? null);
  const [fileContent, setFileContent] = useState<string | undefined>();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    const result = alumniBulletinPostSchema.safeParse({
      body,
      ctaLabel: actionType === "none" ? null : ctaLabel,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      externalUrl: actionType === "external" ? externalUrl : null,
      formId: actionType === "form" ? formId : null,
      imageAlt: imagePreview ? imageAlt : null,
      imageObjectName: imagePreview
        ? (imageObjectName ?? "pending-upload.webp")
        : null,
      publishAt: publishAt ? new Date(publishAt) : null,
      state,
      title,
    });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Check the post details.");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(
        {
          ...result.data,
          imageObjectName: fileContent
            ? null
            : result.data.imageObjectName === "pending-upload.webp"
              ? null
              : result.data.imageObjectName,
        },
        fileContent,
      );
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Bulletin post could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-h-[calc(100svh-1rem)] w-[calc(100svw-1rem)] max-w-3xl gap-0 overflow-y-auto bg-card p-0">
        <DialogHeader className="border-b border-border/70 px-5 py-5 text-left sm:px-6">
          <DialogTitle>
            {initial ? "Edit bulletin post" : "Create bulletin post"}
          </DialogTitle>
          <DialogDescription>
            Build one focused card for the private alumni dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 px-5 py-5 sm:px-6">
          {error ? (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <div className="grid gap-2">
            <Label htmlFor="alumni-bulletin-title">Title</Label>
            <Input
              id="alumni-bulletin-title"
              className="h-11 bg-background/70"
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="alumni-bulletin-body">Body</Label>
              <span className="text-xs text-muted-foreground">
                Plain text or Markdown
              </span>
            </div>
            <Textarea
              id="alumni-bulletin-body"
              className="min-h-28 bg-background/70"
              maxLength={5_000}
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </div>

          <section className="rounded-md border border-white/10 bg-background/60 p-4">
            <div className="flex items-center gap-2">
              <ImagePlus className="h-4 w-4 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-semibold">Image</h3>
              <span className="text-xs text-muted-foreground">Optional</span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
              <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md border border-dashed border-white/15 bg-card">
                {imagePreview ? (
                  // The preview can be a local data URL before upload.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imagePreview}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImagePlus
                    className="h-7 w-7 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="grid content-start gap-3">
                <Input
                  type="file"
                  aria-label="Bulletin image file"
                  accept="image/jpeg,image/png,image/webp"
                  className="h-11 bg-card file:text-foreground"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setError(null);
                    try {
                      const content = await fileToBulletinImage(file);
                      setFileContent(content);
                      setImagePreview(content);
                      setImageObjectName(null);
                    } catch (imageError) {
                      setError(
                        imageError instanceof Error
                          ? imageError.message
                          : "Image could not be prepared.",
                      );
                    }
                  }}
                />
                {imagePreview ? (
                  <>
                    <div className="grid gap-2">
                      <Label htmlFor="alumni-bulletin-image-alt">
                        Image description
                      </Label>
                      <Input
                        id="alumni-bulletin-image-alt"
                        className="h-11 bg-card"
                        maxLength={240}
                        value={imageAlt}
                        onChange={(event) => setImageAlt(event.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-fit gap-2 text-muted-foreground"
                      onClick={() => {
                        setFileContent(undefined);
                        setImageAlt("");
                        setImageObjectName(null);
                        setImagePreview(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Remove image
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          </section>

          <section className="grid gap-4 rounded-md border border-white/10 bg-background/60 p-4">
            <div className="grid gap-2">
              <Label htmlFor="alumni-bulletin-action">Primary action</Label>
              <select
                id="alumni-bulletin-action"
                className="h-11 rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={actionType}
                onChange={(event) => setActionType(event.target.value)}
              >
                <option value="none">No action</option>
                <option value="external">External HTTPS link</option>
                <option value="form">Blade form</option>
              </select>
            </div>
            {actionType !== "none" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="alumni-bulletin-cta-label">
                    Button label
                  </Label>
                  <Input
                    id="alumni-bulletin-cta-label"
                    className="h-11 bg-card"
                    maxLength={80}
                    value={ctaLabel}
                    onChange={(event) => setCtaLabel(event.target.value)}
                  />
                </div>
                {actionType === "external" ? (
                  <div className="grid gap-2">
                    <Label htmlFor="alumni-bulletin-external-url">
                      HTTPS URL
                    </Label>
                    <Input
                      id="alumni-bulletin-external-url"
                      type="url"
                      className="h-11 bg-card"
                      placeholder="https://"
                      value={externalUrl}
                      onChange={(event) => setExternalUrl(event.target.value)}
                    />
                  </div>
                ) : (
                  <div className="grid gap-2">
                    <Label htmlFor="alumni-bulletin-form">Blade form</Label>
                    <select
                      id="alumni-bulletin-form"
                      className="h-11 rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      value={formId}
                      onChange={(event) => setFormId(event.target.value)}
                    >
                      <option value="">Choose a published form</option>
                      {forms.map((form) => (
                        <option key={form.id} value={form.id}>
                          {form.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : null}
          </section>

          <section className="grid gap-4 rounded-md border border-white/10 bg-background/60 p-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="alumni-bulletin-state">State</Label>
              <select
                id="alumni-bulletin-state"
                className="h-11 rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={state}
                onChange={(event) =>
                  setState(event.target.value as "draft" | "published")
                }
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="alumni-bulletin-publish-at">Publish at</Label>
              <Input
                id="alumni-bulletin-publish-at"
                type="datetime-local"
                className="h-11 bg-card"
                value={publishAt}
                onChange={(event) => setPublishAt(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="alumni-bulletin-expires-at">Expire at</Label>
              <Input
                id="alumni-bulletin-expires-at"
                type="datetime-local"
                className="h-11 bg-card"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
              />
            </div>
          </section>
        </div>

        <DialogFooter className="gap-2 border-t border-border/70 px-5 py-4 sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={isSaving}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="min-h-11 gap-2"
            disabled={isSaving}
            onClick={() => void save()}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileText className="h-4 w-4" aria-hidden="true" />
            )}
            {isSaving ? "Saving" : "Save post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AlumniBulletinWorkspace({
  forms,
  onArchive,
  onCreate,
  onEdit,
  onReorder,
  onRestore,
  posts,
}: {
  forms: AlumniLinkableForm[];
  onArchive: (postId: string) => Promise<void> | void;
  onCreate: BulletinSaveHandler;
  onEdit: BulletinEditHandler;
  onReorder: (postIds: string[]) => Promise<void> | void;
  onRestore: (postId: string) => Promise<void> | void;
  posts: AlumniBulletinWorkspacePost[];
}) {
  const [view, setView] = useState<"active" | "archive">("active");
  const [editor, setEditor] = useState<
    | { kind: "create" }
    | { kind: "edit"; post: AlumniBulletinWorkspacePost }
    | null
  >(null);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(
    "desktop",
  );
  const visiblePosts = useMemo(
    () =>
      posts
        .filter((post) =>
          view === "archive"
            ? derivedStatus(post) === "archived" ||
              derivedStatus(post) === "expired"
            : derivedStatus(post) !== "archived" &&
              derivedStatus(post) !== "expired",
        )
        .sort((left, right) => left.displayOrder - right.displayOrder),
    [posts, view],
  );
  const activeOrder = posts
    .filter((post) => post.state !== "archived")
    .sort((left, right) => left.displayOrder - right.displayOrder);
  const previewPosts = posts
    .filter((post) => derivedStatus(post) === "published")
    .sort((left, right) => left.displayOrder - right.displayOrder);
  const publishedCount = posts.filter(
    (post) => derivedStatus(post) === "published",
  ).length;
  const draftCount = posts.filter(
    (post) => derivedStatus(post) === "draft",
  ).length;
  const scheduledCount = posts.filter(
    (post) => derivedStatus(post) === "scheduled",
  ).length;

  const move = (postId: string, delta: -1 | 1) => {
    const index = activeOrder.findIndex((post) => post.id === postId);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= activeOrder.length) return;
    const next = activeOrder.map((post) => post.id);
    const currentId = next[index];
    const targetId = next[target];
    if (!currentId || !targetId) return;
    next[index] = targetId;
    next[target] = currentId;
    void onReorder(next);
  };

  return (
    <main data-alumni-admin-layout="full-width" className={adminPageClassName}>
      <div className={adminPageStackClassName}>
        <AdminPageHeader
          actions={
            <>
              <dl className="flex overflow-hidden rounded-md border border-white/10 bg-card/90">
                {[
                  ["Published", publishedCount],
                  ["Scheduled", scheduledCount],
                  ["Drafts", draftCount],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="border-l border-border/70 px-3 py-2 first:border-l-0"
                  >
                    <dd className="text-sm font-semibold">{value}</dd>
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                  </div>
                ))}
              </dl>
              <Button
                type="button"
                className="min-h-11 gap-2"
                onClick={() => setEditor({ kind: "create" })}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create bulletin post
              </Button>
            </>
          }
          description="Publish focused opportunities and calls to action for confirmed alumni."
          eyebrow="Alumni communications"
          icon={CalendarClock}
          title="Alumni bulletin"
        />

        <section className="overflow-hidden rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={view === "active" ? "secondary" : "ghost"}
                aria-label="View active bulletin"
                aria-pressed={view === "active"}
                onClick={() => setView("active")}
              >
                Active board
              </Button>
              <Button
                type="button"
                size="sm"
                variant={view === "archive" ? "secondary" : "ghost"}
                aria-label="View bulletin archive"
                aria-pressed={view === "archive"}
                onClick={() => setView("archive")}
              >
                Archive
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use the arrows to set the order alumni see.
            </p>
          </div>

          {visiblePosts.length > 0 ? (
            <div className="divide-y divide-border/70">
              {visiblePosts.map((post, index) => {
                const status = derivedStatus(post);
                return (
                  <article
                    key={post.id}
                    className="grid gap-3 px-4 py-4 transition-colors hover:bg-white/[0.025] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center md:px-5"
                  >
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Move ${post.title} up`}
                        disabled={view === "archive" || index === 0}
                        onClick={() => move(post.id, -1)}
                      >
                        <ArrowUp className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Move ${post.title} down`}
                        disabled={
                          view === "archive" ||
                          index === visiblePosts.length - 1
                        }
                        onClick={() => move(post.id, 1)}
                      >
                        <ArrowDown className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate font-semibold">{post.title}</h2>
                        <Badge
                          variant="outline"
                          className={cn("w-fit", statusClass(status))}
                        >
                          {statusLabel(status)}
                        </Badge>
                      </div>
                      <p className="mt-1 truncate text-sm text-muted-foreground">
                        {post.body || "No body copy"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      {status === "archived" || status === "expired" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => void onRestore(post.id)}
                        >
                          <RotateCcw className="h-4 w-4" aria-hidden="true" />
                          Restore
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => setEditor({ kind: "edit", post })}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="gap-2 text-muted-foreground"
                            onClick={() => void onArchive(post.id)}
                          >
                            <Archive className="h-4 w-4" aria-hidden="true" />
                            Archive
                          </Button>
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="flex min-h-48 items-center justify-center px-5 text-center">
              <div>
                <FileText
                  className="mx-auto h-8 w-8 text-muted-foreground"
                  aria-hidden="true"
                />
                <h2 className="mt-3 font-semibold">
                  {view === "archive"
                    ? "The archive is empty"
                    : "No bulletin posts yet"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {view === "archive"
                    ? "Archived and expired posts will appear here."
                    : "Create the first alumni call to action."}
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-lg border border-white/10 bg-card/95 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-semibold">
                <Eye className="h-4 w-4 text-primary" aria-hidden="true" />
                Board preview
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Published cards in their live order.
              </p>
            </div>
            <div className="flex gap-2" aria-label="Preview size">
              <Button
                type="button"
                size="sm"
                variant={previewMode === "desktop" ? "secondary" : "ghost"}
                aria-pressed={previewMode === "desktop"}
                className="gap-2"
                onClick={() => setPreviewMode("desktop")}
              >
                <Monitor className="h-4 w-4" aria-hidden="true" />
                Desktop
              </Button>
              <Button
                type="button"
                size="sm"
                variant={previewMode === "mobile" ? "secondary" : "ghost"}
                aria-pressed={previewMode === "mobile"}
                className="gap-2"
                onClick={() => setPreviewMode("mobile")}
              >
                <Smartphone className="h-4 w-4" aria-hidden="true" />
                Mobile
              </Button>
            </div>
          </div>
          <div className="bg-background/60 p-3 sm:p-5">
            <div
              className={cn(
                "mx-auto grid gap-3 transition-[max-width] duration-200 motion-reduce:transition-none",
                previewMode === "mobile" ? "max-w-sm" : "max-w-5xl",
              )}
            >
              {previewPosts.length > 0 ? (
                previewPosts.map((post) => (
                  <AlumniBulletinCard key={post.id} post={post} />
                ))
              ) : (
                <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-white/10 bg-card/80 px-5 text-center text-sm text-muted-foreground">
                  Nothing needs your attention right now.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {editor ? (
        <BulletinEditorDialog
          key={editor.kind === "edit" ? editor.post.id : "new"}
          forms={forms}
          initial={editor.kind === "edit" ? editor.post : undefined}
          onClose={() => setEditor(null)}
          onSave={(input, fileContent) =>
            editor.kind === "edit"
              ? onEdit(editor.post.id, input, fileContent)
              : onCreate(input, fileContent)
          }
          open
        />
      ) : null}
    </main>
  );
}
