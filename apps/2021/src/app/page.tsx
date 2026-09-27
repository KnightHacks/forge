import Image from "next/image";

import { ArchiveShell } from "~/components/archive-shell";

export default function HomePage() {
  return (
    <ArchiveShell>
      <div className="mt-auto flex w-full flex-col items-center justify-center sm:mt-36">
        <Image
          className="archive-logo-dark w-4/5 md:w-10/12"
          src="/assets/knight-hacks-white.png"
          alt="Knight Hacks"
          width={4070}
          height={1390}
          priority
        />
        <Image
          className="archive-logo-light w-4/5 md:w-10/12"
          src="/assets/knight-hacks-dark.png"
          alt="Knight Hacks"
          width={4070}
          height={1390}
          priority
        />
        <p className="font-palanquinbold mt-4 w-full text-center text-xl">
          November 12th - November 14th, 2021
        </p>
        <p className="font-palanquinbold w-full text-center text-lg">Virtual</p>
        <p className="text-md font-sansitaitalic archive-closed-copy mt-4 w-full text-center">
          Registration is now closed. We welcome our 600+ hackers, mentors, and
          judges to Knight Hacks!
        </p>
      </div>
    </ArchiveShell>
  );
}
