import { alumniAssign } from "./crons/alumni-assign";
import { capybara, cat, duck, goat } from "./crons/animals";
import { backupFilteredDb } from "./crons/backup-filtered-db";
import { roleSync } from "./crons/role-sync";

cat.schedule();
capybara.schedule();
duck.schedule();
goat.schedule();

roleSync.schedule();

alumniAssign.schedule();

backupFilteredDb.schedule();
