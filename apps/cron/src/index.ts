import { capybara, cat, duck, goat } from "./crons/animals";
import { roleSync } from "./crons/role-sync";

cat.schedule();
capybara.schedule();
duck.schedule();
goat.schedule();

roleSync.schedule();
