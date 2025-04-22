type MemberProps = {
  member: {
    name: string;
    year: string;
    website: string;
    role: string;
    image: string;
  };
};

export default function Picture({ member }: MemberProps) {
  return (
    <div className="relative flex aspect-[83/96] items-center justify-center border border-[#757575] text-4xl text-white imagehvr">
      <div className="absolute left-0 top-0 h-0.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
      <div className="absolute right-0 top-0 h-0.5 w-0.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-white" />
      <div className="absolute bottom-0 left-0 h-0.5 w-0.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-white" />
      <div className="absolute bottom-0 right-0 h-0.5 w-0.5 translate-x-1/2 translate-y-1/2 rounded-full bg-white" />

      {member.image && (<img
        src={member?.image}
        alt={member.name}
        className="h-full w-full object-cover"
      />)}
    </div>
  );
}
