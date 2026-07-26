import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { MEMBER_DASHBOARD_PATH } from "@forge/validators";

import { EventFeedbackTemplateEditor } from "~/app/_components/admin/events/event-feedback-template-editor";
import { auth } from "~/server/auth";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Event Feedback Template",
};

export default async function EventFeedbackTemplatePage() {
  const session = await auth();
  if (!session) redirect("/");

  const permissions = await api.roles.getPermissions();
  if (permissions.IS_OFFICER !== true) redirect(MEMBER_DASHBOARD_PATH);

  const template = await api.event.getFeedbackTemplate();
  return (
    <HydrateClient>
      <EventFeedbackTemplateEditor
        definition={template.definition}
        revision={template.revision}
      />
    </HydrateClient>
  );
}
