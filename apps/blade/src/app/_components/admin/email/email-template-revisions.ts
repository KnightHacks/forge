import type { EmailPortalTemplate } from "./email-portal-types";

/**
 * Templates a send can actually use, paired with the revision the send should
 * reference: the explicitly published revision, or the latest revision when it
 * is itself published. Templates with no published revision are dropped.
 */
export function publishedTemplateOptions(
  templates: readonly EmailPortalTemplate[],
) {
  return templates.flatMap((template) => {
    const revisionId =
      template.publishedRevision?.id ??
      (template.latestRevision?.state === "published"
        ? template.latestRevision.id
        : undefined);
    return revisionId ? [{ ...template, revisionId }] : [];
  });
}
