"use client";

{
  /*
  CURRENT LOGO LAYOUT - DO NOT DELETE

  Larger than Mobile:
  MLH MLH MLH CECS CECS CECS
  GWC GWC GWC AI AI AI
  ACM ACM ACM IEEE IEEE IEEE
  SASE SASE SASE GDK GDK GDK

  Mobile:
  MLH MLH CECS CECS
  GWC GWC AI AI
  ACM ACM IEEE IEEE
  SASE SASE GDK GDK
*/
}

import Image from "next/image";
import Link from "next/link";

interface Partner {
  src: string;
  alt: string;
  link: string;
  // Grid positioning for sm+ screens (6-column layout)
  gridPosition: string;
  // Grid positioning for mobile (2-column layout)
  mobilePosition: string;
}

const partners: Partner[] = [
  // Row 1: MLH (cols 1-3), CECS (cols 4-6)
  {
    src: "/partnersSection/mlh.svg",
    alt: "MLH",
    link: "https://mlh.io/",
    gridPosition: "sm:row-start-1 sm:row-span-1 sm:col-start-1 sm:col-span-3",
    mobilePosition: "row-start-1 col-start-1 col-span-2",
  },
  {
    src: "/partnersSection/cecs.svg",
    alt: "UCF CECS",
    link: "https://www.cecs.ucf.edu/",
    gridPosition: "sm:row-start-1 sm:row-span-1 sm:col-start-4 sm:col-span-3",
    mobilePosition: "row-start-1 col-start-3 col-span-2",
  },
  // Row 2: GWC (cols 1-3), AI@UCF (cols 4-6)
  {
    src: "/partnersSection/gwc.svg",
    alt: "GWC@UCF",
    link: "https://www.instagram.com/girlswhocodeucf/",
    gridPosition: "sm:row-start-2 sm:row-span-1 sm:col-start-1 sm:col-span-3",
    mobilePosition: "row-start-2 col-start-1 col-span-2",
  },
  {
    src: "/partnersSection/ai.svg",
    alt: "AI@UCF",
    link: "https://www.instagram.com/_ucfai/",
    gridPosition: "sm:row-start-2 sm:row-span-1 sm:col-start-4 sm:col-span-3",
    mobilePosition: "row-start-2 col-start-3 col-span-2",
  },
  // Row 3: ACM (cols 1-3), IEEE (cols 4-6)
  {
    src: "/partnersSection/acm.svg",
    alt: "ACM@UCF",
    link: "https://www.instagram.com/ucfacm/",
    gridPosition: "sm:row-start-3 sm:row-span-1 sm:col-start-1 sm:col-span-3",
    mobilePosition: "row-start-3 col-start-1 col-span-2",
  },
  {
    src: "/partnersSection/ieee.svg",
    alt: "IEEE@UCF",
    link: "https://www.instagram.com/ieeeucf/",
    gridPosition: "sm:row-start-3 sm:row-span-1 sm:col-start-4 sm:col-span-3",
    mobilePosition: "row-start-3 col-start-3 col-span-2",
  },
  // Row 4: SASE (cols 1-3), GDK (cols 4-6)
  {
    src: "/partnersSection/sase.svg",
    alt: "SASE@UCF",
    link: "https://www.instagram.com/saseucf/",
    gridPosition: "sm:row-start-4 sm:row-span-1 sm:col-start-1 sm:col-span-3",
    mobilePosition: "row-start-4 col-start-1 col-span-2",
  },
  {
    src: "/partnersSection/gdk.svg",
    alt: "Game Dev Knights",
    link: "https://www.instagram.com/gamedevknights/",
    gridPosition: "sm:row-start-4 sm:row-span-1 sm:col-start-4 sm:col-span-3",
    mobilePosition: "row-start-4 col-start-3 col-span-2",
  },
];

import useStaggeredAnimation from "~/hooks/useStaggeredAnimation";

export default function PartnerPosters() {
  const partnersGridRef = useStaggeredAnimation(80);

  return (
    <div className="w-full px-4 py-4">
      <div className="mx-auto max-w-5xl">
        {/* Mobile: 4 cols, SM+: 6 cols */}
        <div
          ref={partnersGridRef}
          className="grid auto-rows-[120px] grid-cols-4 gap-2 sm:auto-rows-[120px] sm:grid-cols-6 sm:gap-3 md:auto-rows-[140px] md:gap-4 lg:auto-rows-[160px] lg:gap-5"
        >
          {partners.map((partner, idx) => (
            <div
              key={idx}
              className={`${partner.mobilePosition} ${partner.gridPosition} stagger-item`}
            >
              <Link href={partner.link} passHref legacyBehavior>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex h-full items-center justify-center rounded-none focus:outline-4 focus:outline-offset-2 focus:outline-[#FBB03B]"
                >
                  {/* Main card */}
                  <div className="relative flex h-full w-full items-center justify-center rounded-none bg-[#F7F0C6] outline-2 -outline-offset-3 outline-black transition-transform duration-100 group-hover:-translate-x-1 group-hover:-translate-y-1 hover:scale-[1.02] hover:shadow-2xl hover:ring-4 hover:shadow-[#FBB03B]/80 hover:ring-[#FBB03B]/50">
                    {/* subtle dot pattern */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[length:20px_20px] opacity-30" />

                    {/* logo container */}
                    <div className="relative flex h-full w-full items-center justify-center">
                      <Image
                        src={partner.src}
                        alt={partner.alt}
                        fill
                        className={`object-contain p-4 drop-shadow-sm md:p-8 ${partner.alt === "IEEE@UCF" ? "brightness-0 filter" : ""}`}
                        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 20vw"
                        draggable={false}
                      />
                    </div>
                  </div>

                  {/* Black drop shadow */}
                  <div className="absolute top-0 left-0 -z-10 h-full w-full rounded-none bg-black transition-transform duration-100 group-hover:translate-x-2 group-hover:translate-y-2" />
                </a>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
