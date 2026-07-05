import { logger } from "@forge/utils";

import type { BuildHackathonEmailInput } from "./hackathons";
import { env } from "./env";
import { buildHackathonEmail } from "./hackathons";

interface TransactionalEmailPayload {
  template_id: number;
  subscriber_mode: "external";
  subscriber_emails: string[];
  from_email: string;
  subject: string;
  data: Record<string, string>;
}

const createBasicAuthHeader = ({
  username,
  password,
}: {
  username: string;
  password: string;
}) => {
  return `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
};

const createListmonkUrl = (path: string) => {
  const baseUrl = new URL(env.LISTMONK_URL);
  baseUrl.pathname = `${baseUrl.pathname.replace(/\/$/, "")}${path}`;
  return baseUrl;
};

const getListmonkResponseData = async (response: Response) => {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Listmonk transactional email failed with status ${response.status}: ${text}`,
    );
  }

  if (text.length === 0) {
    throw new Error("Listmonk transactional email returned an empty response");
  }

  const body: unknown = JSON.parse(text);

  if (typeof body === "object" && body !== null && "data" in body) {
    return body.data;
  }

  return body;
};

const sendTransactionalEmail = async (payload: TransactionalEmailPayload) => {
  const response = await fetch(createListmonkUrl("/api/tx"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: createBasicAuthHeader({
        username: env.LISTMONK_USER,
        password: env.LISTMONK_TOKEN,
      }),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await getListmonkResponseData(response);

  if (data !== true) {
    throw new Error(
      "Listmonk transactional email returned an invalid response",
    );
  }

  return true;
};

export const client = {
  tx: {
    send: sendTransactionalEmail,
  },
};

export const sendEmail = async ({
  to,
  subject,
  template_id,
  from,
  data,
}: {
  to: string | string[];
  subject: string;
  template_id: number;
  data: Record<string, string>;
  from?: string;
}): Promise<{ success: true }> => {
  try {
    await client.tx.send({
      template_id,
      from_email: from ?? env.LISTMONK_FROM_EMAIL,
      subscriber_mode: "external",
      subscriber_emails: typeof to === "string" ? [to] : to,
      subject,
      data,
    });

    return { success: true };
  } catch (error) {
    logger.error("Error sending email:", error);
    throw new Error(
      `Failed to send email: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      { cause: error },
    );
  }
};

export const sendHackathonEmail = async (
  input: BuildHackathonEmailInput,
): Promise<{ success: true }> => {
  return sendEmail(buildHackathonEmail(input));
};

export {
  buildHackathonEmail,
  getHackathonEmailTemplateId,
  type BuildHackathonEmailInput,
  type BuiltHackathonEmail,
  type HackathonEmailHackathonContext,
} from "./hackathons";
