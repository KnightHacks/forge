type MemberProps = {
  member: {
    name: string;
    year: string;
    website: string;
    role: string;
  };
  isHighlighted?: boolean;
  dimmed?: boolean;
  onHover?: () => void;
  onLeave?: () => void;
};

export default function Member({
  member,
  isHighlighted = false,
  dimmed = false,
  onHover = () => {},
  onLeave = () => {},
}: MemberProps) {
  return (
    <div
      className={`w-full border-b py-1 text-sm text-white transition-all duration-300 ${
        isHighlighted
          ? "border-purple-500 bg-purple-500 bg-opacity-20"
          : "border-[#757575]"
      } ${
        dimmed ? "opacity-50" : "opacity-100"
      } hover:border-purple-500 hover:bg-purple-500 hover:bg-opacity-20`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div className="flex w-full flex-row items-start justify-between">
        <h1 className="w-3/12 break-words">{member.name}</h1>
        <h1 className="w-7/12">{member.role}</h1>
        <a
          href={member.website}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-2/12 justify-end"
        >
          <span className="flicker-text">{member.year}</span>
        </a>
      </div>
    </div>
  );
}
