import { useState } from "react";

import Board from "./_components/board";
import List from "./_components/list";
import Nav from "./_components/nav";

function App() {
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <Nav />
      <div className="flex flex-grow flex-row">
        <List hoveredMember={hoveredMember} />
        <div className="relative w-2/3">
          <Board
            onMemberHover={(name) => setHoveredMember(name)}
            onMemberLeave={() => setHoveredMember(null)}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
