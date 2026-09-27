import type { Metadata } from "next";

import { ArchiveShell } from "~/components/archive-shell";

export const metadata: Metadata = { title: "Attributions" };

const credits = [
  "River Current By Back Pocket Sound",
  "Chinese traditional free By dragonfly & River Current By Back Pocket Sound mix",
  "[Royalty Free Music] Atmospheric Relaxing Instrumental | Rainforest By ROYALTY FREE MUSIC - DJ PURPL3 & River Current By Back Pocket Sound mix",
  "Meditation (demo music) By ArchAngel & River Current By Back Pocket Sound mix",
  "Relaxing piano and Water Sound [ NO COPYRIGHT MUSIC] By PetroVenus",
  "Tokyo Chill Beats [Chilofi & Nostalgic vibe Music] Copyright Free By Tokyo Chill Beats & River Current By Back Pocket Sound mix",
  "The Tokyo Business Hotel By explodecreative & River Current By Back Pocket Sound mix",
  "Still Awake by Ghostrifter, Creative Commons Attribution-ShareAlike 3.0 Unported, & River Current By Back Pocket Sound mix",
  "On My Way by Ghostrifter, Creative Commons Attribution-ShareAlike 3.0 Unported, & River Current By Back Pocket Sound mix",
  "Mellow Out by Ghostrifter, Creative Commons Attribution-ShareAlike 3.0 Unported, & River Current By Back Pocket Sound mix",
] as const;

export default function AttributionsPage() {
  return (
    <ArchiveShell>
      <div className="my-4 flex w-full flex-col items-center justify-start md:my-12">
        <h1 className="font-sansita mt-20 text-center text-4xl sm:text-4xl md:text-6xl">
          Attributions
        </h1>
        <div className="my-2 flex w-2/3 flex-col items-center sm:text-base md:text-xl xl:text-xl">
          <section className="font-palanquin archive-attributions mb-2 mt-4 text-left">
            <h2 className="font-sansita mb-4 mt-16 text-left text-xl sm:text-xl md:text-3xl">
              Special Thanks
            </h2>
            <p>
              We want to extend a special thank you and provide credit to the
              artists who made the music we&apos;ve used for this website.
            </p>
            <p>-------------------------------</p>
            {credits.map((credit) => (
              <p key={credit}>{credit}</p>
            ))}
            <p>-------------------------------</p>
            <h2 className="font-sansita mb-4 mt-16 text-left text-xl sm:text-xl md:text-3xl">
              Thank you!
            </h2>
          </section>
        </div>
      </div>
    </ArchiveShell>
  );
}
