import { useState } from "react";

import Board from "./_components/board";
import List from "./_components/list";
import Nav from "./_components/nav";
import { useIsMedium, useIsSmall } from "./_hooks/window";

function App() {
  const [hoveredMember, setHoveredMember] = useState<string | null>(null);
  const isSmall = useIsSmall();
  const isMedium = useIsMedium();

  return (
    <div className="flex min-h-screen flex-col bg-black">
      {/* Mobile view */}
      {isSmall && (
        <div className="flex h-screen w-full flex-col items-center justify-center p-4">
          <h1 className="mb-8 text-2xl font-bold text-white">The Collective</h1>
          <div className="border border-[#757575] p-6 text-center text-xl font-bold text-white">
            Please use this application on desktop for the best experience
          </div>
          <div className="mt-8 h-32 w-full">
            <div className="diagonal-stripes flex items-center justify-center bg-black text-sm text-white">
              <a
                href="https://github.com/KnightHacks/forge/blob/main/apps/webring/README.md"
                target="_blank"
                rel="noopener noreferrer"
                className="flex justify-center"
              >
                <span className="flicker-text bg-black">
                  Join The Collective -&gt;
                </span>
              </a>
            </div>
          </div>
        </div>
      )}
      {/* Medium view */}
      {isMedium && (
        <>
          <Nav />
          // make it vertically listed
          <div className="flex flex-col">
            <List
              hoveredMember={hoveredMember}
              onMemberHover={(name) => setHoveredMember(name)}
              onMemberLeave={() => setHoveredMember(null)}
            />
            <div className="relative w-full">
              <Board
                hoveredMember={hoveredMember}
                onMemberHover={(name) => setHoveredMember(name)}
                onMemberLeave={() => setHoveredMember(null)}
              />
            </div>
          </div>
        </>
      )}

      {!isSmall && !isMedium && (
        <>
          <Nav />
          <div className="flex flex-grow flex-row">
            <List
              hoveredMember={hoveredMember}
              onMemberHover={(name) => setHoveredMember(name)}
              onMemberLeave={() => setHoveredMember(null)}
            />
            <div className="relative w-2/3">
              <Board
                hoveredMember={hoveredMember}
                onMemberHover={(name) => setHoveredMember(name)}
                onMemberLeave={() => setHoveredMember(null)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
