export const DIRECTORS_TEST_RECIPIENT = "directors@knighthacks.org";

const RAW_CONTENT_TEMPLATE_BODY = "{{ Safe .Tx.Data.body }}";
const RAW_CONTENT_TEMPLATE_NAME = "Forge raw-content transactional wrapper";

export type EmailDeliveryMode = "disabled" | "fake" | "production" | "test";

export interface EmailHttpRequest {
  body?: Record<string, unknown>;
  method: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
  path: string;
}

export type EmailHttpTransport = (
  request: EmailHttpRequest,
) => Promise<{ data: unknown }>;

export interface CampaignContent {
  html: string;
  isRetry?: boolean;
  recipientData?: {
    attributes: Record<string, unknown>;
    email: string;
    name: string;
  }[];
  recipientSnapshot: string[];
  sendAt?: string;
  sendId: string;
  subject: string;
  text: string;
}

export interface TestEmailContent {
  html: string;
  subject: string;
  text: string;
}

export interface TransactionalEmailContent extends TestEmailContent {
  data?: Record<string, string>;
  from?: string;
  recipients: string[];
  templateId?: number;
}

export class EmailProviderError extends Error {
  constructor(
    readonly code:
      | "EMAIL_DELIVERY_DISABLED"
      | "EMAIL_DELIVERY_MODE_REQUIRED"
      | "EMAIL_PROVIDER_INVALID_RESPONSE"
      | "EMAIL_PROVIDER_UNAVAILABLE"
      | "TEST_DELIVERY_ONLY",
    message: string,
  ) {
    super(message);
    this.name = "EmailProviderError";
  }
}

export interface EmailCampaignResult {
  campaignId: number;
  listId: number;
  tag: string;
}

export interface EmailCampaignStatus {
  bounceCount: number;
  sentCount: number;
  status: string;
  totalCount: number;
}

export interface EmailProviderGateway {
  createCampaign(input: CampaignContent): Promise<EmailCampaignResult>;
  reconcileCampaign(campaignId: number): Promise<EmailCampaignStatus>;
  lookupSubscriberStates(emails: string[]): Promise<
    {
      email: string;
      status: "blocklisted" | "enabled" | "unsubscribed";
    }[]
  >;
  removeRecipientNamespace(sendId: string, emails: string[]): Promise<void>;
  setCampaignStatus(
    campaignId: number,
    status: "cancelled" | "draft" | "running" | "scheduled",
  ): Promise<void>;
  sendTest(input: TestEmailContent): Promise<{
    providerId: number;
    recipient: typeof DIRECTORS_TEST_RECIPIENT;
  }>;
  sendTransactional(
    input: TransactionalEmailContent,
  ): Promise<{ providerId: number }>;
}

interface FakeCampaign {
  campaignId: number;
  recipients: string[];
}

function providerFailure(
  code: "EMAIL_PROVIDER_INVALID_RESPONSE" | "EMAIL_PROVIDER_UNAVAILABLE",
): EmailProviderError {
  return new EmailProviderError(
    code,
    code === "EMAIL_PROVIDER_INVALID_RESPONSE"
      ? "The email provider returned an unsupported response."
      : "The email provider is currently unavailable.",
  );
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function numericId(value: unknown): number {
  const data = record(value);
  if (typeof data?.id !== "number") {
    throw providerFailure("EMAIL_PROVIDER_INVALID_RESPONSE");
  }
  return data.id;
}

function transportOrFail(
  transport: EmailHttpTransport | undefined,
): EmailHttpTransport {
  if (!transport) {
    throw new EmailProviderError(
      "EMAIL_PROVIDER_UNAVAILABLE",
      "The email provider boundary requires an explicit transport.",
    );
  }
  return transport;
}

async function safeRequest(
  transport: EmailHttpTransport,
  request: EmailHttpRequest,
) {
  try {
    return await transport(request);
  } catch {
    throw providerFailure("EMAIL_PROVIDER_UNAVAILABLE");
  }
}

function disabledError() {
  return new EmailProviderError(
    "EMAIL_DELIVERY_DISABLED",
    "Email delivery is disabled.",
  );
}

function testDeliveryOnlyError() {
  return new EmailProviderError(
    "TEST_DELIVERY_ONLY",
    "This delivery mode permits only the dedicated directors test-send operation.",
  );
}

function fakeGateway(): EmailProviderGateway {
  const campaigns = new Map<number, FakeCampaign>();
  let nextId = 1;
  return {
    createCampaign(input) {
      const listId = nextId++;
      const campaignId = nextId++;
      campaigns.set(campaignId, {
        campaignId,
        recipients: [...input.recipientSnapshot],
      });
      return Promise.resolve({
        campaignId,
        listId,
        tag: `forge-send:${input.sendId}`,
      });
    },
    reconcileCampaign(campaignId) {
      const campaign = campaigns.get(campaignId);
      if (!campaign) {
        return Promise.reject(
          providerFailure("EMAIL_PROVIDER_INVALID_RESPONSE"),
        );
      }
      return Promise.resolve({
        bounceCount: 0,
        sentCount: campaign.recipients.length,
        status: "completed",
        totalCount: campaign.recipients.length,
      });
    },
    lookupSubscriberStates(emails) {
      return Promise.resolve(
        emails.map((email) => ({ email, status: "enabled" as const })),
      );
    },
    removeRecipientNamespace() {
      return Promise.resolve();
    },
    setCampaignStatus() {
      return Promise.resolve();
    },
    sendTest() {
      return Promise.resolve({
        providerId: nextId++,
        recipient: DIRECTORS_TEST_RECIPIENT,
      });
    },
    sendTransactional() {
      return Promise.resolve({ providerId: nextId++ });
    },
  };
}

function disabledGateway(): EmailProviderGateway {
  return {
    createCampaign() {
      return Promise.reject(disabledError());
    },
    reconcileCampaign() {
      return Promise.reject(disabledError());
    },
    lookupSubscriberStates() {
      return Promise.resolve([]);
    },
    removeRecipientNamespace() {
      return Promise.resolve();
    },
    setCampaignStatus() {
      return Promise.reject(disabledError());
    },
    sendTest() {
      return Promise.reject(disabledError());
    },
    sendTransactional() {
      return Promise.reject(disabledError());
    },
  };
}

function testGateway(
  transport: EmailHttpTransport | undefined,
  config: {
    fromEmail?: string;
  },
): EmailProviderGateway {
  return {
    createCampaign() {
      return Promise.reject(testDeliveryOnlyError());
    },
    reconcileCampaign() {
      return Promise.reject(testDeliveryOnlyError());
    },
    lookupSubscriberStates() {
      return Promise.resolve([]);
    },
    removeRecipientNamespace() {
      return Promise.reject(testDeliveryOnlyError());
    },
    setCampaignStatus() {
      return Promise.reject(testDeliveryOnlyError());
    },
    sendTest(input) {
      return sendDirectorsTransactionalTest(transport, config, input);
    },
    sendTransactional() {
      return Promise.reject(testDeliveryOnlyError());
    },
  };
}

function existingListId(value: unknown): number | undefined {
  const data = record(value);
  const results = data?.results;
  if (!Array.isArray(results)) return undefined;
  for (const result of results) {
    const candidate = record(result);
    if (typeof candidate?.id === "number") return candidate.id;
  }
  return undefined;
}

interface ListmonkSubscriber {
  attribs: Record<string, unknown>;
  email: string;
  id: number;
  lists: unknown[];
  status: string;
}

function parseSubscriber(value: unknown): ListmonkSubscriber | undefined {
  const subscriber = record(value);
  if (
    typeof subscriber?.id !== "number" ||
    typeof subscriber.email !== "string" ||
    typeof subscriber.status !== "string"
  ) {
    return undefined;
  }
  return {
    attribs: record(subscriber.attribs) ?? {},
    email: subscriber.email,
    id: subscriber.id,
    lists: Array.isArray(subscriber.lists) ? subscriber.lists : [],
    status: subscriber.status,
  };
}

function subscriberResults(value: unknown): ListmonkSubscriber[] {
  const data = record(value);
  if (!Array.isArray(data?.results)) {
    throw providerFailure("EMAIL_PROVIDER_INVALID_RESPONSE");
  }
  return data.results
    .map(parseSubscriber)
    .filter((subscriber) => subscriber !== undefined);
}

async function findSubscribersByEmails(
  client: EmailHttpTransport,
  emails: string[],
) {
  const targets = new Set(emails.map((email) => email.trim().toLowerCase()));
  if (targets.size === 0) return [];
  const onlyEmail = targets.size === 1 ? [...targets][0] : undefined;
  const response = await safeRequest(client, {
    method: "GET",
    path: onlyEmail
      ? `/api/subscribers?per_page=all&search=${encodeURIComponent(onlyEmail)}`
      : "/api/subscribers?per_page=all",
  });
  return subscriberResults(response.data).filter(({ email }) =>
    targets.has(email.trim().toLowerCase()),
  );
}

function recipientPayload(input: CampaignContent, email: string) {
  const normalized = email.trim().toLowerCase();
  const recipient = input.recipientData?.find(
    (item) => item.email.trim().toLowerCase() === normalized,
  );
  return {
    attributes: recipient?.attributes ?? {},
    email,
    name: recipient?.name ?? "",
  };
}

function responseRows(value: unknown): unknown[] {
  if (Array.isArray(value)) return value as unknown[];
  const data = record(value);
  return Array.isArray(data?.results) ? (data.results as unknown[]) : [];
}

function rawContentTemplateId(value: unknown): number | undefined {
  for (const result of responseRows(value)) {
    const candidate = record(result);
    if (
      candidate?.name === RAW_CONTENT_TEMPLATE_NAME &&
      candidate.type === "tx" &&
      typeof candidate.id === "number"
    ) {
      return candidate.id;
    }
  }
  return undefined;
}

function defaultCampaignTemplateId(value: unknown): number | undefined {
  for (const result of responseRows(value)) {
    const candidate = record(result);
    if (
      candidate?.type === "campaign" &&
      candidate.is_default === true &&
      typeof candidate.id === "number"
    ) {
      return candidate.id;
    }
  }
  return undefined;
}

async function resolveCampaignTemplateId(
  client: EmailHttpTransport,
  configuredId: number | undefined,
) {
  if (configuredId) return configuredId;
  const response = await safeRequest(client, {
    method: "GET",
    path: "/api/templates?per_page=all",
  });
  const templateId = defaultCampaignTemplateId(response.data);
  if (!templateId) {
    throw providerFailure("EMAIL_PROVIDER_INVALID_RESPONSE");
  }
  return templateId;
}

async function ensureRawContentTemplate(client: EmailHttpTransport) {
  const findExisting = async () => {
    const response = await safeRequest(client, {
      method: "GET",
      path: "/api/templates?per_page=all",
    });
    return rawContentTemplateId(response.data);
  };
  const existingId = await findExisting();
  if (existingId) return existingId;
  try {
    const created = await safeRequest(client, {
      body: {
        body: RAW_CONTENT_TEMPLATE_BODY,
        name: RAW_CONTENT_TEMPLATE_NAME,
        subject: "Forge email",
        type: "tx",
      },
      method: "POST",
      path: "/api/templates",
    });
    const createdId =
      rawContentTemplateId(created.data) ??
      (typeof record(created.data)?.id === "number"
        ? (record(created.data)?.id as number)
        : undefined);
    if (createdId) return createdId;
  } catch {
    // A concurrent request may have created the shared wrapper.
  }
  const adoptedId = await findExisting();
  if (!adoptedId) throw providerFailure("EMAIL_PROVIDER_UNAVAILABLE");
  return adoptedId;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function rawContentHtml(input: TestEmailContent) {
  if (input.html.trim()) return input.html;
  return `<pre style="white-space:pre-wrap;font-family:Arial,sans-serif">${escapeHtml(input.text)}</pre>`;
}

async function sendDirectorsTransactionalTest(
  transport: EmailHttpTransport | undefined,
  config: {
    fromEmail?: string;
  },
  input: TestEmailContent,
): Promise<{
  providerId: number;
  recipient: typeof DIRECTORS_TEST_RECIPIENT;
}> {
  const client = transportOrFail(transport);
  const templateId = await ensureRawContentTemplate(client);
  await safeRequest(client, {
    body: {
      content_type: "html",
      data: { body: rawContentHtml(input) },
      from_email: config.fromEmail,
      subscriber_email: DIRECTORS_TEST_RECIPIENT,
      subscriber_mode: "external",
      subject: input.subject,
      template_id: templateId,
    },
    method: "POST",
    path: "/api/tx",
  });
  return {
    providerId: templateId,
    recipient: DIRECTORS_TEST_RECIPIENT,
  };
}

function productionGateway(
  transport: EmailHttpTransport | undefined,
  config: {
    campaignTemplateId?: number;
    fromEmail?: string;
  },
): EmailProviderGateway {
  const getTransport = () => transportOrFail(transport);
  const lookupSubscriberStates = async (emails: string[]) => {
    if (emails.length === 0) return [];
    const results: {
      email: string;
      status: "blocklisted" | "enabled" | "unsubscribed";
    }[] = [];
    for (const subscriber of await findSubscribersByEmails(
      getTransport(),
      emails,
    )) {
      const unsubscribed = subscriber.lists.some((list) => {
        const subscription = record(list);
        return subscription?.subscription_status === "unsubscribed";
      });
      results.push({
        email: subscriber.email,
        status:
          subscriber.status === "blocklisted"
            ? "blocklisted"
            : unsubscribed
              ? "unsubscribed"
              : "enabled",
      });
    }
    return results;
  };
  return {
    async createCampaign(input) {
      const client = getTransport();
      const tag = `forge-send:${input.sendId}`;
      let listId: number | undefined;
      if (input.isRetry) {
        const existing = await safeRequest(client, {
          method: "GET",
          path: `/api/lists?query=${encodeURIComponent(tag)}`,
        });
        listId = existingListId(existing.data);
      }
      if (!listId) {
        try {
          const list = await client({
            body: {
              name: tag,
              optin: "single",
              tags: [tag],
              type: "private",
            },
            method: "POST",
            path: "/api/lists",
          });
          listId = numericId(list.data);
        } catch (error) {
          if (
            error instanceof EmailProviderError &&
            error.code === "EMAIL_PROVIDER_INVALID_RESPONSE"
          ) {
            throw error;
          }
          const existing = await safeRequest(client, {
            method: "GET",
            path: `/api/lists?query=${encodeURIComponent(tag)}`,
          });
          const adoptedId = existingListId(existing.data);
          if (!adoptedId) throw providerFailure("EMAIL_PROVIDER_UNAVAILABLE");
          listId = adoptedId;
        }
      }

      const syncRecipient = async (email: string) => {
        const recipient = recipientPayload(input, email);
        try {
          const created = await safeRequest(client, {
            body: {
              attribs: {
                forge: { [input.sendId]: recipient.attributes },
              },
              email: recipient.email,
              lists: [listId],
              name: recipient.name,
              preconfirm_subscriptions: true,
              status: "enabled",
            },
            method: "POST",
            path: "/api/subscribers",
          });
          numericId(created.data);
        } catch (error) {
          if (
            error instanceof EmailProviderError &&
            error.code === "EMAIL_PROVIDER_INVALID_RESPONSE"
          ) {
            throw error;
          }
          const existing = (await findSubscribersByEmails(client, [email]))[0];
          if (!existing) throw providerFailure("EMAIL_PROVIDER_UNAVAILABLE");
          const unsubscribed = existing.lists.some((list) => {
            const subscription = record(list);
            return subscription?.subscription_status === "unsubscribed";
          });
          if (existing.status === "blocklisted" || unsubscribed) {
            throw providerFailure("EMAIL_PROVIDER_UNAVAILABLE");
          }
          const existingForge = record(existing.attribs.forge) ?? {};
          await safeRequest(client, {
            body: {
              attribs: {
                ...existing.attribs,
                forge: {
                  ...existingForge,
                  [input.sendId]: recipient.attributes,
                },
              },
              name: recipient.name,
            },
            method: "PATCH",
            path: `/api/subscribers/${existing.id}`,
          });
          await safeRequest(client, {
            body: {
              action: "add",
              ids: [existing.id],
              status: "confirmed",
              target_list_ids: [listId],
            },
            method: "PUT",
            path: "/api/subscribers/lists",
          });
        }
      };
      for (let index = 0; index < input.recipientSnapshot.length; index += 20) {
        await Promise.all(
          input.recipientSnapshot.slice(index, index + 20).map(syncRecipient),
        );
      }

      const hasHtmlBody = input.html.trim().length > 0;
      const templateId = await resolveCampaignTemplateId(
        client,
        config.campaignTemplateId,
      );
      const body = {
        ...(hasHtmlBody ? { altbody: input.text } : {}),
        body: hasHtmlBody ? input.html : input.text,
        content_type: hasHtmlBody ? "html" : "plain",
        from_email: config.fromEmail,
        lists: [listId],
        name: tag,
        send_at: input.sendAt,
        status: "draft",
        subject: input.subject,
        tags: [tag],
        template_id: templateId,
        type: "regular",
      };
      let campaignId: number;
      if (input.isRetry) {
        const existing = await safeRequest(client, {
          method: "GET",
          path: `/api/campaigns?per_page=all&tags=${encodeURIComponent(tag)}`,
        });
        const adoptedId = existingListId(existing.data);
        if (adoptedId) return { campaignId: adoptedId, listId, tag };
      }
      try {
        const campaign = await safeRequest(client, {
          body,
          method: "POST",
          path: "/api/campaigns",
        });
        campaignId = numericId(campaign.data);
      } catch (error) {
        if (
          error instanceof EmailProviderError &&
          error.code === "EMAIL_PROVIDER_INVALID_RESPONSE"
        ) {
          throw error;
        }
        const existing = await safeRequest(client, {
          method: "GET",
          path: `/api/campaigns?per_page=all&tags=${encodeURIComponent(tag)}`,
        });
        const adoptedId = existingListId(existing.data);
        if (!adoptedId) throw providerFailure("EMAIL_PROVIDER_UNAVAILABLE");
        campaignId = adoptedId;
      }
      return { campaignId, listId, tag };
    },
    async reconcileCampaign(campaignId) {
      const response = await safeRequest(getTransport(), {
        method: "GET",
        path: `/api/campaigns/${campaignId}`,
      });
      const data = record(response.data);
      if (!data || typeof data.status !== "string") {
        throw providerFailure("EMAIL_PROVIDER_INVALID_RESPONSE");
      }
      return {
        bounceCount:
          typeof data.bounce_count === "number" ? data.bounce_count : 0,
        sentCount: typeof data.sent === "number" ? data.sent : 0,
        status: data.status,
        totalCount: typeof data.to_send === "number" ? data.to_send : 0,
      };
    },
    lookupSubscriberStates,
    async removeRecipientNamespace(sendId, emails) {
      for (const subscriber of await findSubscribersByEmails(
        getTransport(),
        emails,
      )) {
        const forge = record(subscriber.attribs.forge) ?? {};
        if (!(sendId in forge)) continue;
        const remainingForge = { ...forge };
        delete remainingForge[sendId];
        await safeRequest(getTransport(), {
          body: {
            attribs: {
              ...subscriber.attribs,
              forge: remainingForge,
            },
          },
          method: "PATCH",
          path: `/api/subscribers/${subscriber.id}`,
        });
      }
    },
    async setCampaignStatus(campaignId, status) {
      await safeRequest(getTransport(), {
        body: { status },
        method: "PUT",
        path: `/api/campaigns/${campaignId}/status`,
      });
    },
    sendTest(input) {
      return sendDirectorsTransactionalTest(transport, config, input);
    },
    async sendTransactional(input) {
      const client = getTransport();
      const templateId =
        input.templateId ?? (await ensureRawContentTemplate(client));
      await safeRequest(client, {
        body: {
          data: input.templateId
            ? (input.data ?? {})
            : { body: rawContentHtml(input) },
          from_email: input.from,
          subject: input.subject,
          subscriber_emails: input.recipients,
          subscriber_mode: "external",
          template_id: templateId,
        },
        method: "POST",
        path: "/api/tx",
      });
      return { providerId: templateId };
    },
  };
}

export function createEmailProviderGateway({
  campaignTemplateId,
  fromEmail,
  mode,
  transport,
}: {
  campaignTemplateId?: number;
  fromEmail?: string;
  mode: EmailDeliveryMode | undefined;
  transport?: EmailHttpTransport;
}): EmailProviderGateway {
  if (!mode) {
    throw new EmailProviderError(
      "EMAIL_DELIVERY_MODE_REQUIRED",
      "An explicit email delivery mode is required.",
    );
  }
  if (mode === "disabled") return disabledGateway();
  if (mode === "fake") return fakeGateway();
  if (mode === "test") {
    return testGateway(transport, { fromEmail });
  }
  return productionGateway(transport, { campaignTemplateId, fromEmail });
}
