"use client";

{
  /*
  CURRENT LOGO LAYOUT - DO NOT DELETE

  Larger than Mobile (6 columns):
  Google Google Google OneEthos OneEthos OneEthos
  Google Google Google OneEthos OneEthos OneEthos
  Pheratech Pheratech Pheratech Lockheed Lockheed Lockheed
  Pheratech Pheratech Pheratech GitHub NVIDIA NASA
  AMD AMD Statsig Statsig NextEra NextEra
  AMD AMD Statsig Statsig NextEra NextEra
  BNY BNY ServiceNow ServiceNow Auritas Auritas
  BNY BNY ServiceNow ServiceNow Auritas Auritas
  Morgan&Morgan Morgan&Morgan ImpressInk ImpressInk ImpressInk 
  Morgan&Morgan Morgan&Morgan Shinies Shinies Shinies None

   
  Mobile (4 columns):
  Google Google Google Google
  OneEthos OneEthos OneEthos OneEthos
  Pheratech Pheratech Pheratech Pheratech
  AMD AMD Statsig Statsig
  AMD AMD Statsig Statsig
  NextEra NextEra BNY BNY
  NextEra NextEra BNY BNY
  ServiceNow ServiceNow Auritas Auritas
  ServiceNow ServiceNow Auritas Auritas
  Morgan&Morgan Morgan&Morgan ImpressInk ImpressInk
  Morgan&Morgan Morgan&Morgan Shinies Shinies
  Lockheed Lockheed Lockheed
  GitHub NVIDIA NASA None
*/
}

import Image from "next/image";
import Link from "next/link";

import useStaggeredAnimation from "~/hooks/useStaggeredAnimation";

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
  ariaLabel: string;
}

const SPONSOR_TIERS = {
  Platinum: {
    hover:
      "hover:shadow-2xl hover:shadow-cyan-300/80 hover:ring-4 hover:ring-cyan-300/50 hover:scale-[1.02]",
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

// Sponsors arranged according to the layout in the docstring
const sponsors: Sponsor[] = [
  // Row 1-2: Google (left 3x2), OneEthos (right 3x2)
  {
    src: "/sponsorSectionSvgs/google.svg",
    alt: "GOOGLE",
    ariaLabel: "Google Logo",
    link: "https://cloud.google.com/developers?e=48754805&hl=en",
    category: "Platinum",
    gridPosition: "sm:row-start-1 sm:row-span-2 sm:col-start-1 sm:col-span-3",
    mobilePosition: "row-start-1 row-span-1 col-start-1 col-span-4",
  },
  {
    src: "/sponsorSectionSvgs/oneethos.svg",
    alt: "ONEETHOS",
    ariaLabel: "OneEthos Logo",
    link: "https://oneethos.com/",
    category: "Platinum",
    gridPosition: "sm:row-start-1 sm:row-span-2 sm:col-start-4 sm:col-span-3",
    mobilePosition: "row-start-2 row-span-1 col-start-1 col-span-4",
  },
  // Row 3-4: Pheratech (left 3x2), Lockheed (right 3x1), GitHub/NVIDIA/NASA (right 1x1 each)
  {
    src: "/sponsorSectionSvgs/pheratech.png",
    alt: "PHERATECH SYSTEMS",
    ariaLabel: "Pheratech Systems Logo",
    link: "https://pheratech.com/",
    category: "Platinum",
    gridPosition: "sm:row-start-3 sm:row-span-2 sm:col-start-1 sm:col-span-3",
    mobilePosition: "row-start-3 row-span-1 col-start-1 col-span-4",
  },
  {
    src: "/sponsorSectionSvgs/lockheed-martin.svg",
    alt: "LOCKHEED MARTIN",
    ariaLabel: "Lockheed Martin Logo",
    link: "https://www.lockheedmartin.com/",
    category: "Silver",
    gridPosition: "sm:row-start-3 sm:row-span-1 sm:col-start-4 sm:col-span-3",
    mobilePosition: "row-start-12 row-span-1 col-start-1 col-span-4",
  },
  {
    src: "/sponsorSectionSvgs/github.png",
    alt: "GITHUB",
    ariaLabel: "GitHub Logo",
    link: "https://github.com/",
    category: "Bronze",
    gridPosition: "sm:row-start-4 sm:row-span-1 sm:col-start-4 sm:col-span-1",
    mobilePosition: "row-start-13 row-span-1 col-start-1 col-span-2",
  },
  {
    src: "/sponsorSectionSvgs/nasa.svg",
    alt: "NASA",
    ariaLabel: "NASA Logo",
    link: "https://www.nasa.gov/",
    category: "Bronze",
    gridPosition: "sm:row-start-4 sm:row-span-1 sm:col-start-6 sm:col-span-1",
    mobilePosition: "row-start-13 row-span-1 col-start-3 col-span-2",
  },
  {
    src: "/sponsorSectionSvgs/nvidia.svg",
    alt: "NVIDIA",
    ariaLabel: "NVIDIA Logo",
    link: "https://www.nvidia.com/",
    category: "Bronze",
    gridPosition: "sm:row-start-4 sm:row-span-1 sm:col-start-5 sm:col-span-1",
    mobilePosition: "row-start-14 row-span-2 col-start-1 col-span-4",
  },
  // Row 5-6: AMD (2x2), Statsig (2x2), NextEra (2x2)
  {
    src: "/sponsorSectionSvgs/amd.svg",
    alt: "AMD",
    ariaLabel: "AMD Logo",
    link: "https://www.amd.com/",
    category: "Gold",
    gridPosition: "sm:row-start-5 sm:row-span-2 sm:col-start-1 sm:col-span-2",
    mobilePosition: "row-start-4 row-span-2 col-start-1 col-span-2",
  },
  {
    src: "/sponsorSectionSvgs/statsig.svg",
    alt: "STATSIG",
    ariaLabel: "Statsig Logo",
    link: "https://www.statsig.com/",
    category: "Gold",
    gridPosition: "sm:row-start-5 sm:row-span-2 sm:col-start-3 sm:col-span-2",
    mobilePosition: "row-start-4 row-span-2 col-start-3 col-span-2",
  },
  {
    src: "/sponsorSectionSvgs/nextera-energy.svg",
    alt: "NEXTERA",
    ariaLabel: "NextEra Logo",
    link: "https://www.nexteraenergy.com/",
    category: "Gold",
    gridPosition: "sm:row-start-5 sm:row-span-2 sm:col-start-5 sm:col-span-2",
    mobilePosition: "row-start-6 row-span-2 col-start-1 col-span-2",
  },
  // Row 7-8: BNY (2x2), ServiceNow (2x2), Auritas (2x2)
  {
    src: "/sponsorSectionSvgs/bny.svg",
    alt: "BNY",
    ariaLabel: "BNY Logo",
    link: "https://www.bnymellon.com/",
    category: "Gold",
    gridPosition: "sm:row-start-7 sm:row-span-2 sm:col-start-1 sm:col-span-2",
    mobilePosition: "row-start-6 row-span-2 col-start-3 col-span-2",
  },
  {
    src: "/sponsorSectionSvgs/servicenow.svg",
    alt: "SERVICENOW",
    ariaLabel: "ServiceNow Logo",
    link: "https://www.servicenow.com/",
    category: "Gold",
    gridPosition: "sm:row-start-7 sm:row-span-2 sm:col-start-3 sm:col-span-2",
    mobilePosition: "row-start-8 row-span-2 col-start-1 col-span-2",
  },
  {
    src: "/sponsorSectionSvgs/auritas.svg",
    alt: "AURITAS",
    ariaLabel: "Auritas Logo",
    link: "https://www.auritas.com/",
    category: "Gold",
    gridPosition: "sm:row-start-7 sm:row-span-2 sm:col-start-5 sm:col-span-2",
    mobilePosition: "row-start-8 row-span-2 col-start-3 col-span-2",
  },
  // Row 9-10: Morgan&Morgan (2x2), ImpressInk (4x1), Shinies (4x1), None (1x1)
  {
    src: "/sponsorSectionSvgs/morgan-and-morgan.svg",
    alt: "MORGAN&MORGAN",
    ariaLabel: "Morgan & Morgan Logo",
    link: "https://www.forthepeople.com/",
    category: "Gold",
    gridPosition: "sm:row-start-9 sm:row-span-2 sm:col-start-1 sm:col-span-2",
    mobilePosition: "row-start-10 row-span-2 col-start-1 col-span-2",
  },
  {
    src: "/sponsorSectionSvgs/impressink.png",
    alt: "IMPRESSINK",
    ariaLabel: "Impress Ink Logo",
    link: "https://impressink.com/",
    category: "Silver",
    gridPosition: "sm:row-start-9 sm:row-span-1 sm:col-start-3 sm:col-span-4",
    mobilePosition: "row-start-10 row-span-1 col-start-3 col-span-2",
  },
  {
    src: "/sponsorSectionSvgs/shinies.svg",
    alt: "SHINIES PROPS",
    ariaLabel: "Shinies Props Logo",
    link: "https://www.instagram.com/shiniesprops/",
    category: "Silver",
    gridPosition: "sm:row-start-10 sm:row-span-1 sm:col-start-3 sm:col-span-4",
    mobilePosition: "row-start-11 row-span-1 col-start-3 col-span-2",
  },
];

export default function SponsorPosters() {
  const sponsorsGridRef = useStaggeredAnimation(60);

  return (
    <div className="w-full px-4 py-4">
      <div className="mx-auto max-w-5xl">
        {/* Mobile: 4 cols, SM+: 6 cols */}
        <div
          ref={sponsorsGridRef}
          className="grid grid-cols-4 grid-rows-[repeat(13,70px)] gap-2 sm:grid-cols-6 sm:grid-rows-[repeat(10,90px)] sm:gap-3 md:grid-rows-[repeat(10,110px)] md:gap-4 lg:grid-rows-[repeat(10,130px)] lg:gap-5"
        >
          {sponsors.map((sponsor, idx) => {
            const tierConfig = SPONSOR_TIERS[sponsor.category];

            return (
              <div
                key={idx}
                className={`${sponsor.mobilePosition} ${sponsor.gridPosition} stagger-item`}
              >
                <Link
                  href={sponsor.link}
                  passHref
                  legacyBehavior
                  aria-label={sponsor.ariaLabel}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex h-full items-center justify-center rounded-none focus:outline-4 focus:outline-offset-2 focus:outline-[#1570AD]"
                  >
                    {/* Main card */}
                    <div
                      className={`relative flex h-full w-full items-center justify-center rounded-none bg-[#F7F0C6] outline-2 -outline-offset-3 outline-black transition-transform duration-100 group-hover:-translate-x-1 group-hover:-translate-y-1 ${tierConfig.hover}`}
                    >
                      {/* subtle dot pattern */}
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-size-[20px_20px] opacity-30" />

                      {/* logo container */}
                      <div className="relative flex h-full w-full items-center justify-center">
                        {sponsor.alt === "GOOGLE" ? (
                          <>
                            <Image
                              src="/sponsorSectionSvgs/google-mobile.svg"
                              alt={sponsor.alt}
                              fill
                              className="object-contain p-4 drop-shadow-sm sm:hidden"
                              sizes="45vw"
                              draggable={false}
                            />
                            <Image
                              src="/sponsorSectionSvgs/google.svg"
                              alt={sponsor.alt}
                              fill
                              className="hidden object-contain p-8 drop-shadow-sm sm:block"
                              sizes="(max-width: 1024px) 16vw, 12vw"
                              draggable={false}
                            />
                          </>
                        ) : (
                          <Image
                            src={sponsor.src}
                            alt={sponsor.alt}
                            fill
                            className={`object-contain drop-shadow-sm ${
                              sponsor.alt === "NVIDIA"
                                ? "p-2 sm:p-4 md:scale-125 md:p-6"
                                : "p-4 md:p-8"
                            } ${sponsor.alt === "GITHUB" ? "p-2 sm:p-4 md:scale-125 md:p-6" : ""} ${
                              sponsor.alt === "SHINIES PROPS"
                                ? "brightness-0"
                                : ""
                            }`}
                            sizes="(max-width: 640px) 45vw, (max-width: 1024px) 16vw, 12vw"
                            draggable={false}
                          />
                        )}
                      </div>
                    </div>

                    {/* Black drop shadow */}
                    <div className="absolute top-0 left-0 -z-10 h-full w-full rounded-none bg-black transition-transform duration-100 group-hover:translate-x-2 group-hover:translate-y-2" />
                  </a>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
