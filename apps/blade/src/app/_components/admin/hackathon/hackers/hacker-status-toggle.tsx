import type { InsertHacker } from "@forge/db/schemas/knight-hacks";

import AcceptButton from "./accept-button";
import AcceptanceReminderButton from "./acceptance-reminder-button";
import BlacklistButton from "./blacklist-button";
import DenyButton from "./deny-button";
import WaitlistButton from "./waitlist-button";

export default function HackerStatusToggle({
  hacker,
  hackathonRouteName,
}: {
  hacker: InsertHacker & { status: string };
  hackathonRouteName: string;
}) {
  return (
    <div className="flex flex-row items-center justify-center">
      <AcceptButton hacker={hacker} hackathonRouteName={hackathonRouteName} />
      <AcceptanceReminderButton
        hacker={hacker}
        hackathonRouteName={hackathonRouteName}
      />
      <WaitlistButton hacker={hacker} hackathonRouteName={hackathonRouteName} />
      <DenyButton hacker={hacker} hackathonRouteName={hackathonRouteName} />
      <BlacklistButton
        hacker={hacker}
        hackathonRouteName={hackathonRouteName}
      />
    </div>
  );
}
