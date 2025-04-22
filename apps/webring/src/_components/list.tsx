import { WEBRING_MEMBERS } from "@forge/consts/webring-members";
import Member from "./member";


export default function List() {

  const sites  = [...WEBRING_MEMBERS.sites].sort((a,b) => a.name.localeCompare(b.name));

  return (
    <div className="w-1/3 h-full text-white flex flex-col items-center justify-center p-4">
      <h1 className="h-24"></h1>
      <div className=" h-3/12 flex flex-row items-end justify-between w-full text-[#757575] font-semibold text-2xl border-[#757575] border-b">
          <h1 className="w-3/12">A-Z</h1>
          <h1 className="w-7/12">Role</h1>
          <h1 className="w-2/12"></h1>
      </div>
      <div className="w-full overflow-scroll">
      {sites.map((member) => (
        <Member key={member.name} member={member} />
      ))}
      </div>
    </div>
  );
}


