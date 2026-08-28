import type { Metadata } from "next";
import Image from "next/image";

import { ArchiveShell } from "~/components/archive-shell";

export const metadata: Metadata = { title: "Sponsors" };

const gold = [
  [
    "Microsoft",
    "microsoft.png",
    "https://www.microsoft.com/university",
    "h-20",
  ],
  ["ManTech", "Mantech.png", "https://www.mantech.com/careers", "h-32"],
  [
    "Facebook",
    "miniFB.png",
    "https://www.metacareers.com/careerprograms/students",
    "h-auto md:h-20",
  ],
  [
    "National Security Innovation Network",
    "NSIN.png",
    "https://www.nsin.us/",
    "p-2 mt-6 h-36",
  ],
] as const;

const silver = [
  [
    "Texas Instruments",
    "TexasInstruments.png",
    "https://careers.ti.com/",
    "w-72",
  ],
  [
    "Goldman Sachs",
    "GSPrimary.jpg",
    "https://www.goldmansachs.com/careers/",
    "h-36 mt-4",
  ],
] as const;

const bronze = [
  [
    "Google Cloud",
    "GoogleCloud.png",
    "https://careers.google.com/students/",
    "h-auto md:h-24",
  ],
  ["echo3D", "echo3Dwhite.png", "https://www.echo3d.com/", "w-60"],
  [
    "Synopsys",
    "synopsys.png",
    "https://www.synopsys.com/careers.html",
    "mt-8 h-16",
  ],
  [
    "Sticker Mule",
    "stickermule-stacked.png",
    "https://www.stickermule.com/",
    "h-28",
  ],
  ["Leading Learners", "Learner.png", "https://linktr.ee/leadinglearners", ""],
  ["Electronic Arts", "EA.png", "https://www.ea.com/careers/students", "h-24"],
] as const;

const logoDimensions: Record<string, readonly [number, number]> = {
  "microsoft.png": [1024, 227],
  "Mantech.png": [670, 372],
  "miniFB.png": [58, 58],
  "NSIN.png": [1397, 726],
  "TexasInstruments.png": [2301, 540],
  "GSPrimary.jpg": [300, 300],
  "GoogleCloud.png": [1947, 640],
  "echo3Dwhite.png": [609, 98],
  "synopsys.png": [1151, 251],
  "stickermule-stacked.png": [380, 225],
  "Learner.png": [1584, 396],
  "EA.png": [3238, 3206],
  "UCF.png": [279, 77],
  "CECS.png": [693, 77],
};

function SponsorLogo({
  sponsor,
}: {
  sponsor: readonly [string, string, string, string];
}) {
  const [name, file, href, className] = sponsor;
  const [width, height] = logoDimensions[file] ?? [800, 400];
  return (
    <a href={href} aria-label={name} className="archive-sponsor-link">
      <Image
        className={className}
        src={`/assets/sponsors/${file}`}
        alt={name}
        width={width}
        height={height}
        loading="eager"
      />
    </a>
  );
}

export default function SponsorsPage() {
  return (
    <ArchiveShell>
      <h1 className="font-sansita mt-10 w-full text-center text-4xl sm:text-4xl md:text-6xl lg:mt-20 xl:mt-20 xl:text-6xl 2xl:mt-20 2xl:text-7xl">
        Our Sponsors
      </h1>
      <div className="font-sansita archive-sponsors mt-14 divide-none text-center text-2xl">
        <section>
          <h2 className="text-lg md:text-2xl">━━━━━━━ Gold ━━━━━━━</h2>
          <div className="archive-sponsor-grid mx-4 mt-6 grid grid-cols-1 justify-items-center">
            {gold.map((sponsor) => (
              <SponsorLogo key={sponsor[0]} sponsor={sponsor} />
            ))}
          </div>
        </section>
        <section className="mt-6">
          <h2 className="text-lg md:text-2xl">━━━━━━━ Silver ━━━━━━━</h2>
          <div className="archive-sponsor-grid ml-12 mt-6 grid grid-cols-1 justify-items-center">
            {silver.map((sponsor) => (
              <SponsorLogo key={sponsor[0]} sponsor={sponsor} />
            ))}
          </div>
        </section>
        <section className="mt-6">
          <h2 className="text-lg md:text-2xl">━━━━━━ Bronze ━━━━━━</h2>
          <div className="archive-sponsor-grid ml-6 mt-6 grid grid-cols-1 justify-items-center">
            {bronze.map((sponsor) => (
              <SponsorLogo key={sponsor[0]} sponsor={sponsor} />
            ))}
          </div>
        </section>
        <section className="mb-20 mt-6">
          <h2 className="text-xl md:text-2xl">Partner Organizations</h2>
          <div className="archive-sponsor-grid ml-12 mt-6 grid grid-cols-1 justify-items-center">
            <SponsorLogo
              sponsor={[
                "UCF Career Services",
                "UCF.png",
                "https://career.ucf.edu/",
                "archive-ucf-logo",
              ]}
            />
            <SponsorLogo
              sponsor={[
                "UCF College of Engineering and Computer Science",
                "CECS.png",
                "https://www.cecs.ucf.edu/",
                "archive-cecs-logo",
              ]}
            />
          </div>
        </section>
      </div>
    </ArchiveShell>
  );
}
