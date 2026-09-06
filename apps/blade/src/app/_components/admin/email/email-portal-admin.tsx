"use client";

import { startTransition, useCallback, useState } from "react";

import type { RouterOutputs } from "@forge/api";
import { toast } from "@forge/ui/toast";

import type {
  CampaignAudienceMode,
  EmailPortalPreview,
  EmailPortalTab,
  TemplateEditorSeed,
} from "./email-portal-workspace";
import { useNavigationRouter as useRouter } from "~/app/_components/shared/route-transition-link";
import { api } from "~/trpc/react";
import { EmailPortalWorkspace } from "./email-portal-workspace";

export function EmailPortalAdmin({
  audienceOptions,
  campaignAudienceMode,
  initialTab,
  sends,
  templates,
}: {
  audienceOptions: RouterOutputs["email"]["listAudienceOptions"];
  campaignAudienceMode: CampaignAudienceMode;
  initialTab: EmailPortalTab;
  sends: RouterOutputs["email"]["listSends"];
  templates: RouterOutputs["email"]["listTemplates"];
}) {
  const campaignDeliveryEnabled = campaignAudienceMode !== "disabled";
  const router = useRouter();
  const utils = api.useUtils();
  const [preview, setPreview] = useState<EmailPortalPreview | null>(null);
  const refresh = () => {
    startTransition(() => router.refresh());
  };
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
    onSuccess() {
      setPreview(null);
      refresh();
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

  return (
    <EmailPortalWorkspace
      audienceOptions={audienceOptions}
      campaignAudienceMode={campaignAudienceMode}
      initialTab={initialTab}
      isConfirming={confirmSend.isPending}
      isPreviewing={previewSend.isPending}
      isTesting={sendTest.isPending}
      preview={preview}
      sends={sends}
      templates={templates}
      onArchiveTemplate={async (templateId) => {
        await archiveTemplate.mutateAsync({ templateId });
        refresh();
        toast.success("Template archived.");
      }}
      onCancelSend={async (sendId) => {
        await cancelSend.mutateAsync({ sendId });
        refresh();
        toast.success("Send cancelled.");
      }}
      onConfirm={
        campaignDeliveryEnabled && preview?.sendId
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
        refresh();
        toast.success("Template duplicated as a draft.");
      }}
      onLoadTemplate={async (templateId) => {
        const detail = await utils.email.getTemplate.fetch({ templateId });
        const revision = detail.revisions[0];
        if (!revision) throw new Error("Template has no revision to edit.");
        return detail.template.kind === "code"
          ? {
              domain: detail.template.domain,
              id: detail.template.id,
              kind: "code",
              name: detail.template.name,
              source: revision.source ?? "",
            }
          : {
              domain: detail.template.domain,
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
        refresh();
        toast.success("Template published.");
      }}
      onRetrySend={async (sendId) => {
        await retrySend.mutateAsync({ sendId });
        refresh();
        toast.success("Retry queued.");
      }}
      onResolveAudience={resolveAudience}
      onSaveTemplate={async (input: TemplateEditorSeed) => {
        // `domain` has to be passed explicitly. It is required on the mutation
        // schema — deliberately, because it used to default to "club" and this
        // callback dropped it, so every save silently reset the template's
        // domain while reporting success.
        if (input.kind === "code") {
          await saveTemplate.mutateAsync({
            domain: input.domain,
            id: input.id,
            kind: "code",
            name: input.name,
            source: input.source ?? "",
          });
        } else {
          await saveTemplate.mutateAsync({
            domain: input.domain,
            id: input.id,
            kind: "visual",
            name: input.name,
            visualDocument: input.visualDocument ?? {},
          });
        }
        refresh();
        toast.success("Template draft saved.");
      }}
      onSendTest={async (content) => {
        await sendTest.mutateAsync({ content, sample: {} });
      }}
    />
  );
}
