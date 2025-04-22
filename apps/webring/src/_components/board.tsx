import { WEBRING_MEMBERS } from "@forge/consts/webring-members";

import Picture from "./picture";

type BoardProps = {
  hoveredMember: string | null;
  onMemberHover: (name: string) => void;
  onMemberLeave: () => void;
};

export default function Board({
  hoveredMember,
  onMemberHover,
  onMemberLeave,
}: BoardProps) {
  const sites = [...WEBRING_MEMBERS.sites].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <div className="-top-33 sticky flex h-screen w-full flex-col p-4">
      <div className="mb-4 flex w-full flex-row items-end justify-between">
        <h1 className="flex h-28 items-end text-7xl font-bold text-white">
          The Collective
        </h1>
        <h1 className="text-7xl font-bold text-[#757575]">{sites.length}</h1>
      </div>

      {/* Container with fixed height and scrolling */}
      <div className="mb-4 h-[900vh] w-full flex-grow overflow-y-auto">
        <div className="grid grid-cols-8 gap-2">
          {sites.map((member) => (
            <Picture
              key={member.name}
              member={member}
              onHover={() => onMemberHover(member.name)}
              onLeave={onMemberLeave}
              dimmed={hoveredMember !== null && hoveredMember !== member.name}
            />
          ))}
        </div>
      </div>

      <div className="diagonal-stripes flex items-center justify-center bg-black text-sm text-white">
        <a
          href="https://github.com/knighthacks/forge"
          target="_blank"
          rel="noopener noreferrer"
          className="flex justify-end"
        >
          <span className="flicker-text bg-black">
            Join The Collective -&gt;
          </span>
        </a>
      </div>
    </div>
  );
}
