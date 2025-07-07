import type { InsertHacker } from "@forge/db/schemas/knight-hacks";

import AcceptButton from "./accept-button";
import DenyButton from "./deny-button";
import WaitlistButton from "./waitlist-button";

export default function HackerStatusToggle({
  hacker,
  hackathonName,
}: {
  hacker: InsertHacker;
  hackathonName: string;
}) {
  return (
    <div className="flex flex-row items-center justify-center">
      <AcceptButton hacker={hacker} hackathonName={hackathonName} />
      <WaitlistButton hacker={hacker} hackathonName={hackathonName} />
      <DenyButton hacker={hacker} hackathonName={hackathonName} />
    </div>
  );
}
