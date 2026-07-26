import { getTableColumns, getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { Roles } from "../schemas/auth";
import {
  EmailSend,
  EmailSendEvent,
  EmailSendRecipient,
  EmailTemplate,
  EmailTemplateRevision,
  Template,
} from "../schemas/knight-hacks";

describe("Email Portal additive storage", () => {
  it("TC-050 exposes distinct template and immutable revision storage", () => {
    expect(getTableName(EmailTemplate)).not.toBe(getTableName(Template));
    expect(Object.keys(getTableColumns(EmailTemplate))).toEqual(
      expect.arrayContaining([
        "archivedAt",
        "createdAt",
        "createdBy",
        "id",
        "kind",
        "name",
        "normalizedName",
        "updatedAt",
        "updatedBy",
      ]),
    );
    expect(Object.keys(getTableColumns(EmailTemplateRevision))).toEqual(
      expect.arrayContaining([
        "checksum",
        "compiledHtml",
        "compiledText",
        "createdAt",
        "createdBy",
        "id",
        "personalizationContract",
        "publishedAt",
        "source",
        "state",
        "templateId",
        "version",
        "visualDocument",
      ]),
    );
  });

  it("TC-050 stores frozen sends, recipients, provider state, and safe events", () => {
    expect(Object.keys(getTableColumns(EmailSend))).toEqual(
      expect.arrayContaining([
        "audienceDefinition",
        "audienceHash",
        "compiledHtml",
        "compiledText",
        "confirmedAt",
        "contentHash",
        "createdAt",
        "createdBy",
        "finalRecipientCount",
        "id",
        "listmonkCampaignId",
        "listmonkListId",
        "previewExpiresAt",
        "previewVersion",
        "providerMayHaveStarted",
        "providerTag",
        "retryAttemptCount",
        "retryLeaseExpiresAt",
        "safeError",
        "scheduledFor",
        "status",
        "subject",
        "templateRevisionId",
        "terminalAt",
      ]),
    );
    expect(Object.keys(getTableColumns(EmailSendRecipient))).toEqual(
      expect.arrayContaining([
        "attributes",
        "createdAt",
        "email",
        "exclusionReason",
        "listmonkSubscriberId",
        "matchReasons",
        "normalizedEmail",
        "sendId",
      ]),
    );
    expect(Object.keys(getTableColumns(EmailSendEvent))).toEqual(
      expect.arrayContaining([
        "actorId",
        "createdAt",
        "fromStatus",
        "id",
        "metadata",
        "sendId",
        "toStatus",
        "type",
      ]),
    );
  });

  it("TC-050 adds an independent team email-audience role flag", () => {
    expect(Object.keys(getTableColumns(Roles))).toContain(
      "emailAudienceEnabled",
    );
  });
});
