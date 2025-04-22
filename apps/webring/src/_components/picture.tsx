type MemberProps = {
  member: {
    name: string;
    year: string;
    website: string;
    role: string;
  };
};

export default function Picture({ member }: MemberProps) {
  return (
    <div className="border border-white text-white aspect-[3/4] text-4xl flex items-center justify-center">
        {member.name.split(" ")[0][0] + member.name.split(" ")[1][0]}
    </div>
  );
}
