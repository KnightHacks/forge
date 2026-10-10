import { z } from "zod";

import { db } from "@forge/db/client";
import { env as emailEnv } from "@forge/email/env";

import {
  listPrintCategoryReminderRecipients,
  sendPrintCategoryReminders,
} from "../src/utils/printing/category-reminders";

const hackathonId = z.string().uuid().parse(process.argv[2]);
try {
  if (process.argv.includes("--send")) {
    if (
      emailEnv.NODE_ENV !== "production" ||
      emailEnv.BLADE_E2E_AUTH === "true"
    ) {
      throw new Error("Live reminder sending requires production email mode.");
    }
    if (
      !emailEnv.LISTMONK_URL ||
      !emailEnv.LISTMONK_USER ||
      !emailEnv.LISTMONK_TOKEN ||
      !emailEnv.LISTMONK_FROM_EMAIL
    ) {
      throw new Error(
        "Configure the email provider before claiming reminder recipients.",
      );
    }
    process.stdout.write(
      JSON.stringify(await sendPrintCategoryReminders(hackathonId)) + "\n",
    );
  } else {
    const recipients = await listPrintCategoryReminderRecipients(hackathonId);
    process.stdout.write(
      JSON.stringify({
        mode: "preview",
        recipients: recipients.length,
        jobs: recipients.reduce(
          (count, recipient) => count + recipient.jobIds.length,
          0,
        ),
      }) + "\n",
    );
  }
} finally {
  await db.$client.end();
}
