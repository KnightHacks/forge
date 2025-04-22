import { WEBRING_MEMBERS } from "@forge/consts/webring-members";
import Picture from "./picture";

export default function Board() {

  const sites  = [...WEBRING_MEMBERS.sites].sort((a,b) => a.name.localeCompare(b.name));

  return (
    <div className="sticky w-full p-4 h-screen">
      <div className="w-full h-2/12 flex flex-row justify-between items-end">
        <h1 className="text-white text-7xl font-bold items-end flex">The Collective</h1>
        <h1 className="text-[#757575] text-7xl font-bold">{sites.length}</h1>
      </div>
      <div className="w-full h-10/12 grid grid-cols-8 gap-2 sticky ">
        {sites.map((member) => (
          <Picture key={member.name} member={member} />  
        ))}
      </div>
      <div className="h-3/12 bg-black text-sm text-white flex items-center justify-center diagonal-stripes my-4">
        <a 
        href='https://github.com/knighthacks/forge'
        target="_blank"
        rel="noopener noreferrer"
        className="justify-end flex"
        >
          <span className="bg-black flicker-text">Join The Collective -&gt;</span>
        </a>
      </div>
    </div>
  );
}
