import { google } from "googleapis";

import { EVENTS } from "@forge/consts";

import { env } from "./env";

const GOOGLE_PRIVATE_KEY = Buffer.from(env.GOOGLE_PRIVATE_KEY_B64, "base64")
  .toString("utf-8")
  .replace(/\\n/g, "\n");

const gapiCalendar = "https://www.googleapis.com/auth/calendar";
const gapiGmailSend = "https://www.googleapis.com/auth/gmail.send";
const gapiGmailSettingsSharing =
  "https://www.googleapis.com/auth/gmail.settings.sharing";

const auth = new google.auth.JWT(
  env.GOOGLE_CLIENT_EMAIL,
  undefined,
  GOOGLE_PRIVATE_KEY,
  [gapiCalendar, gapiGmailSend, gapiGmailSettingsSharing],
  EVENTS.GOOGLE_PERSONIFY_EMAIL as string,
);

export const gmail = google.gmail({
  version: "v1",
  auth: auth,
});

export const calendar = google.calendar({
  version: "v3",
  auth: auth,
});
