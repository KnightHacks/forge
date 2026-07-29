/**
 * Browser storage names that more than one Blade module has to agree on.
 *
 * These are wire contracts: one side writes the value, another side reads it.
 * If a name changes in only one place the handshake breaks silently, so each
 * name is declared once here and both sides import it.
 */

/**
 * Set by the resume bundle route handler (`app/api/admin/resume-bundle`) and
 * read back by the analytics dashboard to learn how the download finished.
 */
export const RESUME_BUNDLE_DOWNLOAD_COOKIE = "resume-bundle-download";

/** localStorage key for the unsaved "create event" form draft. */
export const EVENT_CREATE_DRAFT_STORAGE_KEY = "blade:event-create-draft";

/** localStorage key for the unsaved email portal compose draft. */
export const EMAIL_COMPOSE_DRAFT_STORAGE_KEY =
  "blade:email-portal-compose-draft";

/**
 * localStorage key for the unsaved "create issue" draft. Doubles as the prefix
 * for each stored draft: `${ISSUE_CREATE_DRAFT_STORAGE_KEY}:${creationKey}`.
 */
export const ISSUE_CREATE_DRAFT_STORAGE_KEY = "forge:issues:create-draft";
