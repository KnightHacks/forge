
import type { InsertHacker } from "@forge/db/schemas/knight-hacks";

import AcceptButton from "./accept-button";
import DenyButton from "./deny-button";
import WaitlistButton from "./waitlist-button";

export default function HackerStatusToggle({ hacker }: { hacker: InsertHacker}) {
    return (
        <div className="flex flex-row items-center justify-center">
            <AcceptButton hacker={hacker} />
            <WaitlistButton hacker={hacker} />
            <DenyButton hacker={hacker} />
        </div>
    );
}