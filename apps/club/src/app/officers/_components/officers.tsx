import { OFFICERS } from "@forge/consts/knight-hacks";

import OfficerCard from "./assets/officer-card";

export default function Officers() {
  return (
    <div className="flex items-center justify-center">
      {OFFICERS.map((officer) => (
        <OfficerCard
          image={officer.image}
          name={officer.name}
          linkedin={officer.linkedin}
          position={officer.position}
          major={officer.major}
        />
      ))}
    </div>
  );
}
