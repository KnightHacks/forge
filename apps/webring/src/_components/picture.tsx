type MemberProps = {
  member: {
    name: string;
    year: string;
    website: string;
    role: string;
    image: string;
  };
  dimmed?: boolean;
  onHover?: () => void;
  onLeave?: () => void;
};

export default function Picture({
  member,
  dimmed = false,
  onHover,
  onLeave,
}: MemberProps) {
  return (
    <div
      className={`imagehvr relative flex aspect-[83/96] items-center justify-center border border-[#757575] text-4xl text-white transition-opacity duration-300 ${
        dimmed ? "opacity-50" : "flicker-text opacity-100"
      }`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      <div className="absolute left-0 top-0 h-0.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
      <div className="absolute right-0 top-0 h-0.5 w-0.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-white" />
      <div className="absolute bottom-0 left-0 h-0.5 w-0.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-white" />
      <div className="absolute bottom-0 right-0 h-0.5 w-0.5 translate-x-1/2 translate-y-1/2 rounded-full bg-white" />

      {member.image && (
        <a
          href={member.website}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-0 flex items-center justify-center"
        >
        <img
          src={member?.image}
          alt={member.name}
          className="h-full w-full object-cover"
        />
        </a>
      )}
    </div>
  );
}
