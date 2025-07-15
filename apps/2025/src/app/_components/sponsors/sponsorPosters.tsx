{
  /*
  CURRENT LOGO LAYOUT - DO NOT DELETE

  Larger than Mobile:
  Google Google Google OneEthos OneEthos OneEthos
  Google Google Google  OneEthos OneEthos OneEthos
  AMD AMD ServiceNow ServiceNow NextEra NextEra
  AMD AMD ServiceNow ServiceNow NextEra NextEra
  BNY BNY Lockheed Martin Lockheed Martin Lockheed Martin NVIDIA
  BNY BNY GitHub GitHub GitHub NASA
  Impress Impress Impress Shinies Shinies Shinies

  Mobile:
  Google Google Google Google
  OneEthos OneEthos OneEthos OneEthos
  AMD AMD ServiceNow ServiceNow
  AMD AMD ServiceNow ServiceNow
  NextEra NextEra BNY BNY
  NextEra NextEra BNY BNY
  Lockheed Martin  Lockheed Martin Lockheed Martin NVIDIA
  GitHub GitHub GitHub NASA
  Impress Impress Shinies Shinies
*/
}

import Image from "next/image";
import Link from "next/link";

type Tier = "Platinum" | "Gold" | "Silver" | "Bronze";

interface Sponsor {
  src: string;
  alt: string;
  link: string;
  category: Tier;
  // Grid positioning for sm+ screens (6-column layout)
  gridPosition: string;
  // Grid positioning for mobile (4-column layout)
  mobilePosition: string;
}

const SPONSOR_TIERS = {
  Platinum: {
    hover:
      "hover:shadow-2xl hover:shadow-slate-300/80 hover:ring-4 hover:ring-slate-300/50 hover:scale-[1.02]",
  },
  Gold: {
    hover:
      "hover:shadow-2xl hover:shadow-yellow-400/80 hover:ring-4 hover:ring-yellow-400/50 hover:scale-[1.02]",
  },
  Silver: {
    hover:
      "hover:shadow-2xl hover:shadow-gray-400/80 hover:ring-4 hover:ring-gray-400/50 hover:scale-[1.02]",
  },
  Bronze: {
    hover:
      "hover:shadow-2xl hover:shadow-orange-400/80 hover:ring-4 hover:ring-orange-400/50 hover:scale-[1.02]",
  },
} as const;

const sponsors: Sponsor[] = [
  // Row 1-2: Google (cols 1-3), OneEthos (cols 4-6)
  {
    src: "/sponsorSectionSvgs/google.svg",
    alt: "GOOGLE",
    link: "https://google.github.io/adk-docs/",
    category: "Platinum",
    gridPosition: "sm:row-start-1 sm:row-span-2 sm:col-start-1 sm:col-span-3",
    mobilePosition: "row-start-1 row-span-1 col-start-1 col-span-4",
  },
  {
    src: "/sponsorSectionSvgs/oneethos.svg",
    alt: "ONEETHOS",
    link: "https://oneethos.com/",
    category: "Platinum",
    gridPosition: "sm:row-start-1 sm:row-span-2 sm:col-start-4 sm:col-span-3",
    mobilePosition: "row-start-2 row-span-1 col-start-1 col-span-4",
  },
  // Row 3-4: AMD (cols 1-2), ServiceNow (cols 3-4), NextEra (cols 5-6)
  {
    src: "/sponsorSectionSvgs/amd.svg",
    alt: "AMD",
    link: "https://www.amd.com/",
    category: "Gold",
    gridPosition: "sm:row-start-3 sm:row-span-2 sm:col-start-1 sm:col-span-2",
    mobilePosition: "row-start-3 row-span-2 col-start-1 col-span-2",
  },
  {
    src: "/sponsorSectionSvgs/servicenow.svg",
    alt: "SERVICENOW",
    link: "https://www.servicenow.com/",
    category: "Gold",
    gridPosition: "sm:row-start-3 sm:row-span-2 sm:col-start-3 sm:col-span-2",
    mobilePosition: "row-start-3 row-span-2 col-start-3 col-span-2",
  },
  {
    src: "/sponsorSectionSvgs/nextera-energy.svg",
    alt: "NEXTERA",
    link: "https://www.nexteraenergy.com/",
    category: "Gold",
    gridPosition: "sm:row-start-3 sm:row-span-2 sm:col-start-5 sm:col-span-2",
    mobilePosition: "row-start-5 row-span-2 col-start-1 col-span-2",
  },
  // Row 5-6: BNY (cols 1-2, spans 2 rows), Lockheed Martin (cols 3-5, row 5), NVIDIA (col 6, row 5), GitHub (cols 3-5, row 6), NASA (col 6, row 6)
  {
    src: "/sponsorSectionSvgs/bny.svg",
    alt: "BNY",
    link: "https://www.bnymellon.com/",
    category: "Gold",
    gridPosition: "sm:row-start-5 sm:row-span-2 sm:col-start-1 sm:col-span-2",
    mobilePosition: "row-start-5 row-span-2 col-start-3 col-span-2",
  },
  {
    src: "/sponsorSectionSvgs/lockheed-martin.svg",
    alt: "LOCKHEED MARTIN",
    link: "https://www.lockheedmartin.com/",
    category: "Silver",
    gridPosition: "sm:row-start-5 sm:row-span-1 sm:col-start-3 sm:col-span-3",
    mobilePosition: "row-start-7 row-span-1 col-start-1 col-span-3",
  },
  {
    src: "/sponsorSectionSvgs/nvidia.svg",
    alt: "NVIDIA",
    link: "https://www.nvidia.com/",
    category: "Bronze",
    gridPosition: "sm:row-start-5 sm:row-span-1 sm:col-start-6 sm:col-span-1",
    mobilePosition: "row-start-7 row-span-1 col-start-4 col-span-1",
  },
  {
    src: "/sponsorSectionSvgs/github.png",
    alt: "GITHUB",
    link: "https://github.com/",
    category: "Silver",
    gridPosition: "sm:row-start-6 sm:row-span-1 sm:col-start-3 sm:col-span-3",
    mobilePosition: "row-start-8 row-span-1 col-start-1 col-span-3",
  },
  {
    src: "/sponsorSectionSvgs/nasa.svg",
    alt: "NASA",
    link: "https://www.nasa.gov/",
    category: "Bronze",
    gridPosition: "sm:row-start-6 sm:row-span-1 sm:col-start-6 sm:col-span-1",
    mobilePosition: "row-start-8 row-span-1 col-start-4 col-span-1",
  },
  // Row 7: Impress (cols 1-3), Shinies (cols 4-6)
  {
    src: "/sponsorSectionSvgs/impressink.png",
    alt: "IMPRESSINK",
    link: "https://impressink.com/",
    category: "Silver",
    gridPosition: "sm:row-start-7 sm:row-span-1 sm:col-start-1 sm:col-span-3",
    mobilePosition: "row-start-9 row-span-1 col-start-1 col-span-2",
  },
  {
    src: "/sponsorSectionSvgs/shinies.png",
    alt: "SHINIES PROPS",
    link: "https://www.instagram.com/shiniesprops/",
    category: "Silver",
    gridPosition: "sm:row-start-7 sm:row-span-1 sm:col-start-4 sm:col-span-3",
    mobilePosition: "row-start-9 row-span-1 col-start-3 col-span-2",
  },
];

export default function SponsorPosters() {
  return (
    <div className="w-full px-2 py-4">
      <div className="mx-auto max-w-7xl">
        {/* Mobile: 4 cols, SM+: 6 cols */}
        <div className="grid auto-rows-[80px] grid-cols-4 gap-2 sm:auto-rows-[100px] sm:grid-cols-6 sm:gap-3 md:auto-rows-[120px] md:gap-4 lg:auto-rows-[140px] lg:gap-5">
          {sponsors.map((sponsor, idx) => {
            const tierConfig = SPONSOR_TIERS[sponsor.category];

            return (
              <Link key={idx} href={sponsor.link} passHref legacyBehavior>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${sponsor.mobilePosition} ${sponsor.gridPosition} group relative flex items-center justify-center`}
                >
                  {/* Main card */}
                  <div
                    className={`relative flex h-full w-full items-center justify-center rounded-none bg-[#F7F0C6] outline-2 -outline-offset-3 outline-black transition-transform duration-100 group-hover:-translate-x-1 group-hover:-translate-y-1 ${tierConfig.hover}`}
                  >
                    {/* subtle dot pattern */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[length:20px_20px] opacity-30" />

                    {/* logo container */}
                    <div className="relative flex h-full w-full items-center justify-center">
                      <Image
                        src={sponsor.src}
                        alt={sponsor.alt}
                        fill
                        className={`object-contain drop-shadow-sm ${sponsor.alt === "NVIDIA" ? "md:scale-125" : "p-4 md:p-8"} ${sponsor.alt === "GITHUB" ? "md:scale-125" : ""}`}
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 16vw, 12vw"
                      />
                    </div>
                  </div>

                  {/* Black drop shadow */}
                  <div className="absolute top-0 left-0 -z-10 h-full w-full rounded-none bg-black transition-transform duration-100 group-hover:translate-x-2 group-hover:translate-y-2" />
                </a>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
