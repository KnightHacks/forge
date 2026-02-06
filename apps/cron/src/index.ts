import { alumniAssign } from "./crons/alumni-assign";
import { capybara, cat, duck, goat } from "./crons/animals";
import { backupFilteredDb } from "./crons/backup-filtered-db";
import { leetcode } from "./crons/leetcode";
import { hackReminders, preReminders, reminders } from "./crons/reminder";
import { roleSync } from "./crons/role-sync";

alumniAssign.schedule();

cat.schedule();
capybara.schedule();
duck.schedule();
goat.schedule();

backupFilteredDb.schedule();

leetcode.schedule();

preReminders.schedule();
reminders.schedule();
hackReminders.schedule();

roleSync.schedule();
