import { Listmonk } from "@maloma/listmonk";

import { logger } from "@forge/utils";

import { env } from "./env";

export const client = new Listmonk({
  url: env.LISTMONK_URL,
  auth: {
    username: env.LISTMONK_USER,
    password: env.LISTMONK_TOKEN,
  },
});

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
      template_id: template_id,
      from_email: from ?? env.LISTMONK_FROM_EMAIL,
      subscriber_mode: "external",
      subscriber_emails: typeof to === "string" ? [to] : to,
      subject: subject,
      data: data,
    });

    return { success: true };
  } catch (error) {
    logger.error("Error sending email:", error);
    throw new Error(
      `Failed to send email: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
};
