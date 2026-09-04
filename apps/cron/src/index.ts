import { alumniAssign } from "./crons/alumni-assign";
import { capybara, cat, duck, goat } from "./crons/animals";
import { backupFilteredDb } from "./crons/backup-filtered-db";
import { discordArchive } from "./crons/discord-archive";
import { emailDelivery } from "./crons/email-delivery";
import { eventPublication } from "./crons/event-publication";
import { formAttachmentCleanup } from "./crons/form-attachment-cleanup";
import { formCallbacks } from "./crons/form-callbacks";
import { hackCheckInCleanup } from "./crons/hack-check-in-cleanup";
import { hackerPortalAuthCleanup } from "./crons/hacker-portal-auth-cleanup";
import { issueAttachmentCleanup } from "./crons/issue-attachment-cleanup";
import { issueReminders } from "./crons/issue-reminders";
import { leetcode } from "./crons/leetcode";
import { hackReminders, preReminders, reminders } from "./crons/reminder";
import { roleSync } from "./crons/role-sync";

alumniAssign.schedule();

cat.schedule();
capybara.schedule();
duck.schedule();
goat.schedule();

backupFilteredDb.schedule();
discordArchive.schedule();

leetcode.schedule();

preReminders.schedule();
reminders.schedule();
hackReminders.schedule();
hackCheckInCleanup.schedule();
hackerPortalAuthCleanup.schedule();

roleSync.schedule();

issueReminders.schedule();
issueAttachmentCleanup.schedule();
formCallbacks.schedule();
formAttachmentCleanup.schedule();
emailDelivery.schedule();
eventPublication.schedule();
