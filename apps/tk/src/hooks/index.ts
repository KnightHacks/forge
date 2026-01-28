// import { execute as beep } from "./beep";
import { execute as alumniSync } from "./alumni-assign";
import { execute as animals } from "./animals";
import { execute as prodBackup } from "./backup-filtered-db";
import { execute as daily } from "./daily";
import { execute as reminder } from "./reminder";
import { execute as roleSync } from "./role-sync";

// Export all commands
export const hooks = {
  //beep,
  daily,
  animals,
  reminder,
  alumniSync,
  roleSync,
  prodBackup,
};
