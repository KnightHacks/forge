import { logger } from "@forge/utils";

import type {
  EmailDeliveryMode,
  EmailHttpRequest,
  EmailHttpTransport,
} from "./provider";
import { env } from "./env";
import { createEmailProviderGateway } from "./provider";

function basicAuthorization(username: string, password: string) {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
}

function requireListmonkConfiguration() {
  if (
    !env.LISTMONK_URL ||
    !env.LISTMONK_USER ||
    !env.LISTMONK_TOKEN ||
    !env.LISTMONK_FROM_EMAIL
  ) {
    throw new Error(
      "Listmonk configuration is required for live email delivery.",
    );
  }
  return {
    fromEmail: env.LISTMONK_FROM_EMAIL,
    token: env.LISTMONK_TOKEN,
    url: env.LISTMONK_URL,
    user: env.LISTMONK_USER,
  };
}

export const listmonkHttpTransport: EmailHttpTransport = async (
  request: EmailHttpRequest,
) => {
  const config = requireListmonkConfiguration();
  const response = await fetch(new URL(request.path, config.url), {
    body: request.body ? JSON.stringify(request.body) : undefined,
    headers: {
      Accept: "application/json",
      Authorization: basicAuthorization(config.user, config.token),
      "Content-Type": "application/json",
    },
    method: request.method,
  });
  if (!response.ok) {
    let providerMessage: string | undefined;
    try {
      const payload: unknown = await response.clone().json();
      if (
        typeof payload === "object" &&
        payload !== null &&
        "message" in payload &&
        typeof payload.message === "string"
      ) {
        providerMessage = payload.message.slice(0, 500);
      }
    } catch {
      // The provider did not return a JSON error body.
    }
    logger.error("Listmonk request failed.", {
      method: request.method,
      path: request.path.split("?")[0],
      providerMessage,
      status: response.status,
    });
    throw new Error(`Email provider request failed with ${response.status}.`);
  }
  const payload: unknown = await response.json();
  if (typeof payload === "object" && payload !== null && "data" in payload) {
    return { data: (payload as { data: unknown }).data };
  }
  return { data: payload };
};

let defaultGateway: ReturnType<typeof createEmailProviderGateway> | undefined;

export function resolveEmailDeliveryPolicy(
  nodeEnv: "development" | "production" | "test",
  bladeE2E = false,
): {
  allowDevelopmentCampaigns: boolean;
  mode: EmailDeliveryMode;
} {
  return nodeEnv === "production"
    ? { allowDevelopmentCampaigns: false, mode: "production" }
    : nodeEnv === "test" || bladeE2E
      ? { allowDevelopmentCampaigns: false, mode: "fake" }
      : { allowDevelopmentCampaigns: true, mode: "test" };
}

export function getDefaultEmailProviderGateway() {
  const policy = resolveEmailDeliveryPolicy(
    env.NODE_ENV,
    env.BLADE_E2E_AUTH === "true",
  );
  defaultGateway ??= createEmailProviderGateway({
    allowDevelopmentCampaigns: policy.allowDevelopmentCampaigns,
    campaignTemplateId: env.LISTMONK_CAMPAIGN_TEMPLATE_ID,
    fromEmail: env.LISTMONK_FROM_EMAIL,
    mode: policy.mode,
    transport: policy.mode === "fake" ? undefined : listmonkHttpTransport,
  });
  return defaultGateway;
}

/**
 * Sends one already-rendered message.
 *
 * No `templateId`: the provider falls back to its raw-content wrapper and
 * delivers the HTML we hand it. That is what lets hackathon status mail be
 * authored in Blade's own email portal instead of Listmonk, which is what
 * removed the per-hackathon template-id table that used to live in this
 * package.
 */
export const sendEmail = async ({
  from,
  html,
  subject,
  text,
  to,
}: {
  from?: string;
  html: string;
  subject: string;
  text: string;
  to: string | string[];
}): Promise<{ success: true }> => {
  try {
    const fromEmail =
      from ?? env.LISTMONK_FROM_EMAIL ?? "disabled@knighthacks.org";
    await getDefaultEmailProviderGateway().sendTransactional({
      from: fromEmail,
      html,
      recipients: typeof to === "string" ? [to] : to,
      subject,
      text,
    });
    return { success: true };
  } catch (error) {
    logger.error("Transactional email delivery failed.", {
      code:
        typeof error === "object" && error !== null && "code" in error
          ? error.code
          : "EMAIL_PROVIDER_FAILURE",
    });
    throw new Error("Transactional email delivery failed.", { cause: error });
  }
};

export * from "./provider";
export * from "./templates";
