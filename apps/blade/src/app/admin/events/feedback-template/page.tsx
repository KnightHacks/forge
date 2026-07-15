import type { Metadata } from "next";

import { EventFeedbackTemplateEditor } from "~/app/_components/admin/events/event-feedback-template-editor";
import { api, HydrateClient } from "~/trpc/server";

export const metadata: Metadata = {
  title: "Blade | Event Feedback Template",
};

export default async function EventFeedbackTemplatePage() {
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
