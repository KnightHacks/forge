export type EmailPortalTab = "compose" | "sends" | "templates";
export type CampaignAudienceMode = "all" | "development_review" | "disabled";

export interface EmailPortalTemplate {
  domain: "club" | "hackathon";
  id: string;
  kind: "code" | "visual";
  latestRevision?: {
    id?: string;
    publishedAt?: Date | string | null;
    state: "draft" | "published" | "superseded";
    version?: number;
  } | null;
  name: string;
  publishedRevision?: {
    id: string;
    version: number;
  } | null;
  updatedAt?: Date | string;
}

export interface EmailPortalSend {
  finalRecipientCount?: number;
  id: string;
  nextRetryAt?: Date | string | null;
  recipientCount?: number;
  safeError?: string | null;
  scheduledFor?: Date | string | null;
  status: string;
  subject: string;
}

export interface EmailPortalPreview {
  blockers: {
    code: string;
    count: number;
    field: string;
  }[];
  counts: {
    duplicatesCollapsed: number;
    excludedBlocklisted: number;
    excludedInvalid: number;
    excludedManual?: number;
    excludedMissingFields: number;
    excludedUnsubscribed: number;
    finalUnique: number;
    rawMatches: number;
  };
  expiresAt: string;
  sendId?: string;
  version: string;
}

export interface EmailAudienceResolution {
  counts: {
    duplicatesCollapsed: number;
    excludedBlocklisted: number;
    excludedInvalid: number;
    excludedUnsubscribed: number;
    finalUnique: number;
    rawMatches: number;
  };
  recipients: {
    attributes: Record<string, unknown>;
    email: string;
    matchReasons: string[];
    name: string;
  }[];
}

export interface EmailPortalSendDetail {
  cancelledBy?: {
    email: string | null;
    id: string;
    name: string | null;
  } | null;
  createdBy?: {
    email: string | null;
    id: string;
    name: string | null;
  } | null;
  events: {
    createdAt: Date | string;
    fromStatus: string | null;
    id: string;
    metadata: unknown;
    toStatus: string | null;
    type: string;
  }[];
  recipients: {
    attributes: unknown;
    email: string;
    exclusionReason: string | null;
    matchReasons: unknown;
  }[];
  send: EmailPortalSend & {
    cancelledAt?: Date | string | null;
    compiledHtml?: string | null;
    compiledText?: string | null;
    confirmedAt?: Date | string | null;
    createdAt?: Date | string;
    nextRetryAt?: Date | string | null;
    plainTextSource?: string | null;
    providerBounceCount?: number;
    providerSentCount?: number;
    safeError?: string | null;
  };
}

export interface EmailAudienceOptions {
  hackathons: {
    allLabel: string;
    displayName: string;
    id: string;
    name: string;
    statuses: readonly string[];
  }[];
  presets: {
    kind: "alumni" | "current_members" | "team_members";
    label: string;
  }[];
  roles: {
    id: string;
    name: string;
  }[];
}

export interface TemplateEditorSeed {
  /**
   * Which product this template writes for. Decides the personalization fields
   * it may reference, and whether it can back a hackathon's status mail.
   */
  domain: "club" | "hackathon";
  id?: string;
  kind: "code" | "visual";
  name: string;
  source?: string;
  visualDocument?: Record<string, unknown>;
}

export interface TemplatePreviewResult {
  contract: {
    fallback?: string;
    field: string;
    required: boolean;
    type: string;
  }[];
  html: string;
  text: string;
}
