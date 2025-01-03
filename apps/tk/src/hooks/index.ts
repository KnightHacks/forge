// import { execute as beep } from "./beep";
import { execute as animals } from "./animals";
import { execute as daily } from "./daily";
import { execute as reminder } from "./reminder";

// Export all commands
export const hooks = {
  //beep,
  daily,
  animals,
  reminder,
};
