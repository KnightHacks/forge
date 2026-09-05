"use client";

import { useEffect, useReducer, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { ArrowLeft, FilePenLine } from "lucide-react";

import type { RouterOutputs } from "@forge/api";
import { Badge } from "@forge/ui/badge";
import { Button } from "@forge/ui/button";
import { toast } from "@forge/ui/toast";
import {
  checkUploadMetadata,
  FORM_BANNER_UPLOAD_POLICY,
  formDefinitionSchema,
} from "@forge/validators";

import type {
  BuilderDialog,
  BuilderInitial,
  CallbackCatalogItem,
} from "./form-builder-types";
import type {
  ConfiguredFormCallback,
  FormCallbackDraft,
} from "./form-callback-mappings";
import type { MediaInstruction } from "./form-definition-draft";
import {
  AdminPageHeader,
  adminPageLayoutClassName,
} from "~/app/_components/shared/admin-page";
import { ADMIN_PAGE_EYEBROWS } from "~/consts/admin-page-eyebrows";
import { api } from "~/trpc/react";
import { FormAvailabilityDialog } from "./form-availability-dialog";
import { draftAvailability } from "./form-availability-draft";
import { FormBuilderDetailsCard } from "./form-builder-details-card";
import {
  formatRespondentAudience,
  formatResponseMode,
  formatSectionName,
  formBuilderShareHref,
  toSlug,
} from "./form-builder-formatting";
import { FormBuilderHeaderActions } from "./form-builder-header-actions";
import { FormBuilderQuestionsSection } from "./form-builder-questions-section";
import { callbackInputMappings } from "./form-callback-mappings";
import { FormCallbacksDialog } from "./form-callbacks-dialog";
import {
  buildFormDefinition,
  draftInstructionsBody,
  draftMediaInstructions,
  draftTextInstructionId,
} from "./form-definition-draft";
import { FormDeleteDialog } from "./form-delete-dialog";
import { formQuestionsReducer } from "./form-questions-reducer";
import { FormShareDialog } from "./form-share-dialog";

export function AdminFormBuilder({
  callbacks,
  configuredCallbacks = [],
  initial,
  readOnly = false,
  respondentRoles,
  sections,
  shareAssets,
}: {
  callbacks: CallbackCatalogItem[];
  configuredCallbacks?: ConfiguredFormCallback[];
  initial?: BuilderInitial;
  readOnly?: boolean;
  respondentRoles: { id: string; name: string }[];
  sections: { id: string; name: string }[];
  shareAssets?: RouterOutputs["forms"]["getShareAssets"];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const savedInstructions = initial?.definition.instructions ?? [];
  const [textInstructionId] = useState(
    draftTextInstructionId(savedInstructions),
  );
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slugName ?? "");
  const [description, setDescription] = useState(
    initial?.definition.description ?? "",
  );
  const [banner, setBanner] = useState(initial?.definition.banner);
  const [instructions, setInstructions] = useState(
    draftInstructionsBody(savedInstructions),
  );
  const [mediaInstructions, setMediaInstructions] = useState<
    MediaInstruction[]
  >(draftMediaInstructions(savedInstructions));
  const [questions, dispatchQuestions] = useReducer(
    formQuestionsReducer,
    initial?.definition.questions ?? [],
  );
  const [revision, setRevision] = useState(initial?.revision ?? null);
  const [availability, setAvailability] = useState(() =>
    draftAvailability(initial, sections),
  );
  const [message, setMessage] = useState<string | null>(null);
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const [callbacksRefreshing, refreshCallbacks] = useTransition();
  const [callbackDraft, setCallbackDraft] = useState<FormCallbackDraft>({
    questionId: "",
    slug: callbacks.find((callback) => callback.available)?.slug ?? "",
    value: "",
  });
  const [openDialog, setOpenDialog] = useState<BuilderDialog>("none");
  const [respondentRoleSearch, setRespondentRoleSearch] = useState("");
  const questionSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  const create = api.forms.createForm.useMutation();
  const update = api.forms.updateForm.useMutation();
  const updateSettings = api.forms.updateSettings.useMutation();
  const changeState = api.forms.changeState.useMutation();
  const deleteForm = api.forms.deleteForm.useMutation();
  const configureCallback = api.forms.configureCallback.useMutation();
  const disableCallback = api.forms.disableCallback.useMutation();
  const createUpload = api.forms.createUpload.useMutation();
  const finalizeUpload = api.forms.finalizeUpload.useMutation();
  const shareOpen = searchParams.get("dialog") === "share";

  useEffect(() => {
    setRevision(initial?.revision ?? null);
  }, [initial?.revision]);

  function setShareOpen(open: boolean) {
    router.replace(
      formBuilderShareHref(pathname, searchParams.toString(), open),
      { scroll: false },
    );
  }

  function setDialogOpen(
    dialog: Exclude<BuilderDialog, "none">,
    open: boolean,
  ) {
    if (dialog === "callbacks") setCallbackError(null);
    setOpenDialog(open ? dialog : "none");
  }

  const definition = buildFormDefinition({
    banner,
    description,
    instructions,
    media: mediaInstructions,
    name,
    questions,
    textId: textInstructionId,
  });

  async function save() {
    if (readOnly) return;
    setMessage(null);
    const parsedDefinition = formDefinitionSchema.safeParse(definition);
    if (!parsedDefinition.success) {
      const issue = parsedDefinition.error.issues[0];
      setMessage(issue?.message ?? "Check the form questions and try again.");
      return;
    }
    const parsed = parsedDefinition.data;
    try {
      if (!initial) {
        const saved = await create.mutateAsync({
          closesAt: availability.closesAt
            ? new Date(availability.closesAt)
            : null,
          definition: parsed,
          duesOnly: availability.duesOnly,
          name,
          opensAt: availability.opensAt ? new Date(availability.opensAt) : null,
          respondentRoleIds: availability.respondentRoleIds,
          responseMode: availability.responseMode,
          sectionId: availability.sectionId,
          slugName: slug || toSlug(name),
        });
        router.replace(`/admin/forms/${saved.id}`);
        router.refresh();
        return;
      }
      const saved = await update.mutateAsync({
        definition: parsed,
        expectedRevision: revision ?? initial.revision,
        formId: initial.id,
        name,
        ...(initial.state === "draft" ? { slugName: slug } : {}),
      });
      setRevision(saved.revision);
      try {
        await updateSettings.mutateAsync({
          closesAt: availability.closesAt
            ? new Date(availability.closesAt)
            : null,
          duesOnly: availability.duesOnly,
          formId: initial.id,
          manuallyClosed: availability.manuallyClosed,
          opensAt: availability.opensAt ? new Date(availability.opensAt) : null,
          respondentRoleIds: availability.respondentRoleIds,
          responseMode: availability.responseMode,
          sectionId: availability.sectionId,
        });
      } catch (cause) {
        setMessage(
          `Form content saved, but availability settings were not saved. ${
            cause instanceof Error ? cause.message : "Refresh and try again."
          }`,
        );
        router.refresh();
        return;
      }
      setMessage("Form saved.");
      router.refresh();
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "The form could not be saved.",
      );
    }
  }

  async function transition(targetState: "archived" | "published") {
    if (!initial || readOnly) return;
    try {
      const saved = await changeState.mutateAsync({
        expectedRevision: revision ?? initial.revision,
        formId: initial.id,
        targetState,
      });
      setRevision(saved.revision);
      router.refresh();
    } catch (cause) {
      setMessage(
        cause instanceof Error ? cause.message : "State change failed.",
      );
    }
  }

  async function addCallback() {
    if (!initial) return;
    setCallbackError(null);
    try {
      await configureCallback.mutateAsync({
        callbackSlug: callbackDraft.slug,
        formId: initial.id,
        mappings: callbackInputMappings(callbackDraft),
      });
      setOpenDialog("none");
      toast.success("Callback saved for future responses.");
      refreshCallbacks(() => router.refresh());
    } catch (cause) {
      setCallbackError(
        cause instanceof Error
          ? cause.message
          : "Callback configuration failed.",
      );
    }
  }

  async function disableFormCallback(callbackSlug: string) {
    if (!initial) return;
    setCallbackError(null);
    try {
      await disableCallback.mutateAsync({ callbackSlug, formId: initial.id });
      setOpenDialog("none");
      toast.success("Callback disabled for future responses.");
      refreshCallbacks(() => router.refresh());
    } catch (cause) {
      setCallbackError(
        cause instanceof Error
          ? cause.message
          : "Callback could not be disabled.",
      );
    }
  }

  function deleteFormPermanently() {
    if (!initial) return;
    void deleteForm
      .mutateAsync({ formId: initial.id })
      .then(() => router.replace("/admin/forms"))
      .catch((cause: unknown) =>
        setMessage(
          cause instanceof Error
            ? cause.message
            : "The form could not be deleted.",
        ),
      );
  }

  async function uploadInstruction(file: File, type: "image" | "video") {
    if (!initial) return;
    try {
      setMessage(`Uploading ${file.name}…`);
      const upload = await createUpload.mutateAsync({
        contentType: file.type,
        fileName: file.name,
        formId: initial.id,
        purpose: "instruction",
        size: file.size,
      });
      const result = await fetch(upload.uploadUrl, {
        body: file,
        headers: { "Content-Type": upload.contentType },
        method: "PUT",
      });
      if (!result.ok) throw new Error("Instruction upload failed.");
      await finalizeUpload.mutateAsync({ attachmentId: upload.attachmentId });
      setMediaInstructions((current) => [
        ...current,
        {
          alt: file.name,
          attachmentId: upload.attachmentId,
          id: crypto.randomUUID(),
          type,
        },
      ]);
      setMessage("Instruction media uploaded. Save the form to publish it.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Upload failed.");
    }
  }

  async function uploadBanner(file: File) {
    if (!initial) return;
    const check = checkUploadMetadata(FORM_BANNER_UPLOAD_POLICY, {
      contentType: file.type,
      fileName: file.name,
      size: file.size,
    });
    if (!check.ok) {
      setMessage(check.message);
      return;
    }
    try {
      setMessage(`Uploading ${file.name}…`);
      const upload = await createUpload.mutateAsync({
        contentType: file.type,
        fileName: file.name,
        formId: initial.id,
        purpose: "banner",
        size: file.size,
      });
      const result = await fetch(upload.uploadUrl, {
        body: file,
        headers: { "Content-Type": upload.contentType },
        method: "PUT",
      });
      if (!result.ok) throw new Error("Banner upload failed.");
      await finalizeUpload.mutateAsync({ attachmentId: upload.attachmentId });
      setBanner({ alt: file.name, attachmentId: upload.attachmentId });
      setMessage("Banner uploaded. Save the form to publish it.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Upload failed.");
    }
  }

  const busy = create.isPending || update.isPending || updateSettings.isPending;

  return (
    <main className={adminPageLayoutClassName}>
      <Button asChild variant="ghost" className="-ml-3 min-h-11 w-fit gap-2">
        <Link href="/admin/forms">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Forms
        </Link>
      </Button>
      <AdminPageHeader
        actions={
          <FormBuilderHeaderActions
            busy={busy}
            initial={initial}
            onOpenDialog={setOpenDialog}
            onSave={save}
            onShare={() => setShareOpen(true)}
            onTransition={transition}
            readOnly={readOnly}
            shareAssets={shareAssets}
          />
        }
        description="Define the form, respondent experience, publishing state, and delivery behavior."
        eyebrow={
          initial
            ? ADMIN_PAGE_EYEBROWS.formEdit
            : ADMIN_PAGE_EYEBROWS.formCreate
        }
        icon={FilePenLine}
        title={readOnly ? "View form" : initial ? "Edit form" : "Create form"}
      />

      <div
        className="flex flex-wrap gap-2"
        aria-label="Form configuration summary"
      >
        <Badge variant="outline">
          {formatSectionName(sections, availability.sectionId)}
        </Badge>
        <Badge variant="outline">
          {formatResponseMode(availability.responseMode)}
        </Badge>
        <Badge variant="outline">
          {formatRespondentAudience(availability.respondentRoleIds)}
        </Badge>
        <Badge variant="outline">
          {availability.manuallyClosed ? "Manually closed" : "Schedule active"}
        </Badge>
      </div>

      {message && (
        <p
          role="status"
          className="rounded-md border border-white/10 bg-card/95 p-3 text-sm"
        >
          {message}
        </p>
      )}

      <div className="grid min-w-0 gap-5">
        <section className="grid min-w-0 gap-4">
          <FormBuilderDetailsCard
            banner={banner}
            description={description}
            initial={initial}
            instructions={instructions}
            mediaInstructions={mediaInstructions}
            name={name}
            onUploadBanner={uploadBanner}
            onUploadInstruction={uploadInstruction}
            readOnly={readOnly}
            setBanner={setBanner}
            setDescription={setDescription}
            setInstructions={setInstructions}
            setMediaInstructions={setMediaInstructions}
            setName={setName}
            setSlug={setSlug}
            slug={slug}
          />

          <FormBuilderQuestionsSection
            dispatchQuestions={dispatchQuestions}
            questionSensors={questionSensors}
            questions={questions}
            readOnly={readOnly}
          />
        </section>
      </div>

      <FormAvailabilityDialog
        availability={availability}
        onDone={() => setOpenDialog("none")}
        onOpenChange={(open) => setDialogOpen("settings", open)}
        open={!readOnly && openDialog === "settings"}
        respondentRoleSearch={respondentRoleSearch}
        respondentRoles={respondentRoles}
        sections={sections}
        setAvailability={setAvailability}
        setRespondentRoleSearch={setRespondentRoleSearch}
      />

      {initial && !readOnly && (
        <FormCallbacksDialog
          callbackDraft={callbackDraft}
          callbacks={callbacks}
          configureCallbackPending={
            configureCallback.isPending || callbacksRefreshing
          }
          configuredCallbacks={configuredCallbacks}
          disableCallbackPending={
            disableCallback.isPending || callbacksRefreshing
          }
          error={callbackError}
          onAddCallback={addCallback}
          onClose={() => setOpenDialog("none")}
          onDisableCallback={disableFormCallback}
          onOpenChange={(open) => setDialogOpen("callbacks", open)}
          open={openDialog === "callbacks"}
          questions={questions}
          responseMode={availability.responseMode}
          setCallbackDraft={setCallbackDraft}
        />
      )}

      {initial && shareAssets && (
        <FormShareDialog
          formName={name}
          onOpenChange={setShareOpen}
          open={shareOpen}
          shareAssets={shareAssets}
          slugName={slug}
        />
      )}

      {initial && !readOnly && (
        <FormDeleteDialog
          deletePending={deleteForm.isPending}
          onCancel={() => setOpenDialog("none")}
          onDelete={deleteFormPermanently}
          onOpenChange={(open) => setDialogOpen("actions", open)}
          open={openDialog === "actions"}
        />
      )}
    </main>
  );
}
