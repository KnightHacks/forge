"use client";

import { useCallback, useState } from "react";

import type { RouterOutputs } from "@forge/api";
import { toast } from "@forge/ui/toast";

import type {
  EmailPortalPreview,
  EmailPortalTab,
  TemplateEditorSeed,
} from "./email-portal-workspace";
import { api } from "~/trpc/react";
import { EmailPortalWorkspace } from "./email-portal-workspace";

export function EmailPortalAdmin({
  initialAudienceOptions,
  initialSends,
  initialTab,
  initialTemplates,
}: {
  initialAudienceOptions: RouterOutputs["email"]["listAudienceOptions"];
  initialSends: RouterOutputs["email"]["listSends"];
  initialTab: EmailPortalTab;
  initialTemplates: RouterOutputs["email"]["listTemplates"];
}) {
  const utils = api.useUtils();
  const [preview, setPreview] = useState<EmailPortalPreview | null>(null);
  const templates = api.email.listTemplates.useQuery(
    { includeArchived: false, limit: 50 },
    { initialData: initialTemplates },
  );
  const sends = api.email.listSends.useQuery(
    { limit: 50 },
    { initialData: initialSends },
  );
  const audiences = api.email.listAudienceOptions.useQuery(undefined, {
    initialData: initialAudienceOptions,
  });
  const saveTemplate = api.email.saveTemplateDraft.useMutation();
  const publishTemplate = api.email.publishTemplate.useMutation();
  const archiveTemplate = api.email.archiveTemplate.useMutation();
  const duplicateTemplate = api.email.duplicateTemplate.useMutation();
  const previewSend = api.email.previewSend.useMutation({
    onSuccess(result) {
      setPreview(result);
      toast.success(
        `Audience resolved: ${result.counts.finalUnique} unique recipients.`,
      );
    },
    onError(error) {
      toast.error(error.message || "The audience could not be resolved.");
    },
  });
  const confirmSend = api.email.confirmSend.useMutation({
    async onSuccess() {
      setPreview(null);
      await utils.email.listSends.invalidate();
      toast.success("Campaign confirmed.");
    },
    onError(error) {
      toast.error(error.message || "The campaign could not be confirmed.");
    },
  });
  const sendTest = api.email.sendTest.useMutation({
    onSuccess(result) {
      toast.success(`Test sent to ${result.recipient}.`);
    },
    onError(error) {
      toast.error(error.message || "The directors-only test send failed.");
    },
  });
  const cancelSend = api.email.cancelSend.useMutation();
  const retrySend = api.email.retrySend.useMutation();
  const resolveAudience = useCallback(
    async (
      audienceDefinitions: Parameters<
        typeof utils.email.resolveAudience.fetch
      >[0]["audiences"],
    ) => {
      try {
        return await utils.email.resolveAudience.fetch({
          audiences: audienceDefinitions,
        });
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Recipients could not be loaded.",
        );
        throw error;
      }
    },
    [utils],
  );

  const refreshTemplates = async () => {
    await utils.email.listTemplates.invalidate();
  };

  return (
    <EmailPortalWorkspace
      audienceOptions={audiences.data}
      initialTab={initialTab}
      isConfirming={confirmSend.isPending}
      isPreviewing={previewSend.isPending}
      isTesting={sendTest.isPending}
      preview={preview}
      sends={sends.data}
      templates={templates.data}
      onArchiveTemplate={async (templateId) => {
        await archiveTemplate.mutateAsync({ templateId });
        await refreshTemplates();
        toast.success("Template archived.");
      }}
      onCancelSend={async (sendId) => {
        await cancelSend.mutateAsync({ sendId });
        await utils.email.listSends.invalidate();
        toast.success("Send cancelled.");
      }}
      onConfirm={
        preview?.sendId
          ? async () => {
              const sendId = preview.sendId;
              if (!sendId) return;
              await confirmSend.mutateAsync({
                expectedRecipientCount: preview.counts.finalUnique,
                previewVersion: preview.version,
                sendId,
              });
            }
          : undefined
      }
      onDuplicateTemplate={async (templateId) => {
        await duplicateTemplate.mutateAsync({ templateId });
        await refreshTemplates();
        toast.success("Template duplicated as a draft.");
      }}
      onLoadTemplate={async (templateId) => {
        const detail = await utils.email.getTemplate.fetch({ templateId });
        const revision = detail.revisions[0];
        if (!revision) throw new Error("Template has no revision to edit.");
        return detail.template.kind === "code"
          ? {
              id: detail.template.id,
              kind: "code",
              name: detail.template.name,
              source: revision.source ?? "",
            }
          : {
              id: detail.template.id,
              kind: "visual",
              name: detail.template.name,
              visualDocument:
                (revision.visualDocument as Record<string, unknown> | null) ??
                {},
            };
      }}
      onLoadSend={async (sendId) => {
        try {
          return await utils.email.getSend.fetch({ sendId });
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Send details could not be loaded.",
          );
          throw error;
        }
      }}
      onPreview={async (input) => {
        await previewSend.mutateAsync(input);
      }}
      onPreviewTemplate={async (templateId) => {
        return utils.email.previewTemplate.fetch({
          sample: {},
          templateId,
        });
      }}
      onPublishTemplate={async (templateId) => {
        await publishTemplate.mutateAsync({ templateId });
        await refreshTemplates();
        toast.success("Template published.");
      }}
      onRetrySend={async (sendId) => {
        await retrySend.mutateAsync({ sendId });
        await utils.email.listSends.invalidate();
        toast.success("Retry queued.");
      }}
      onResolveAudience={resolveAudience}
      onSaveTemplate={async (input: TemplateEditorSeed) => {
        if (input.kind === "code") {
          await saveTemplate.mutateAsync({
            id: input.id,
            kind: "code",
            name: input.name,
            source: input.source ?? "",
          });
        } else {
          await saveTemplate.mutateAsync({
            id: input.id,
            kind: "visual",
            name: input.name,
            visualDocument: input.visualDocument ?? {},
          });
        }
        await refreshTemplates();
        toast.success("Template draft saved.");
      }}
      onSendTest={async (content) => {
        await sendTest.mutateAsync({ content, sample: {} });
      }}
    />
  );
}
