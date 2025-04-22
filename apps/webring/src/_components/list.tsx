import { WEBRING_MEMBERS } from "@forge/consts/webring-members";

import Member from "./member";

type ListProps = {
  hoveredMember: string | null;
};

export default function List({ hoveredMember }: ListProps) {
  const sites = [...WEBRING_MEMBERS.sites].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <div className="flex h-full w-1/3 flex-col items-center justify-center p-4 text-white">
      <h1 className="h-24"></h1>
      <div className="h-3/12 flex w-full flex-row items-end justify-between border-b border-[#757575] text-2xl font-semibold text-[#757575]">
        <h1 className="w-3/12">A-Z</h1>
        <h1 className="w-7/12">Role</h1>
        <h1 className="w-2/12"></h1>
      </div>
      <div className="w-full overflow-scroll">
        {sites.map((member) => (
          <Member
            key={member.name}
            member={member}
            isHighlighted={hoveredMember === member.name}
          />
        ))}
      </div>
    </div>
  );
}
