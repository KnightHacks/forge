type MemberProps = {
    member: {
        name: string;
        year: string;
        website: string;
        role: string;
    };
};

export default function Member( { member }: MemberProps) {
  return (
    <div className="w-full text-white text-sm border-b py-1 border-[#757575]">
        <div className="flex flex-row items-start justify-between w-full">
            <h1 className="w-3/12 break-words">{member.name}</h1>
            <h1 className="w-7/12 ">{member.role}</h1>
            <a
            href={member.website}
            target="_blank"
            rel="noopener noreferrer"
            className="w-2/12 justify-end flex"
            >
                <span className="flicker-text">{member.year}</span>
            </a>
        </div>
    </div>
  );
}
