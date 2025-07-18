"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

import SponsorCard from "./sponsors-assets/sponsor-card";

const companies = [
  { name: "American Express", logo: "/logos/amex.svg" },
  { name: "AWS", logo: "/logos/aws.svg" },
  { name: "BNY Mellon", logo: "/logos/bny.svg" },
  { name: "Capital One", logo: "/logos/c1.svg" },
  { name: "EA", logo: "/logos/ea.svg" },
  { name: "Facebook", logo: "/logos/facebook.svg" },
  { name: "Geico", logo: "/logos/geico.svg" },
  { name: "GitHub", logo: "/logos/github.svg" },
  { name: "Goldman Sachs", logo: "/logos/goldman.svg" },
  { name: "Google Cloud", logo: "/logos/googlecloud.svg" },
  { name: "IBM", logo: "/logos/ibm.svg" },
  { name: "JPMorgan", logo: "/logos/chase.svg" },
  { name: "Lockheed Martin", logo: "/logos/lockheed.svg" },
  { name: "Microsoft", logo: "/logos/microsoft.svg" },
  { name: "NextEra", logo: "/logos/nextera.svg" },
  { name: "RBC", logo: "/logos/rbc.svg" },
  { name: "ServiceNow", logo: "/logos/ServiceNow.svg" },
  { name: "Synopsys", logo: "/logos/synopsys.svg" },
  { name: "Texas Instruments", logo: "/logos/texasinstruments.svg" },
];

export default function Sponsors() {
  gsap.registerPlugin(ScrollTrigger);

  const headerRef = useRef<HTMLDivElement>(null);
  const sponsorContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <section
      ref={containerRef}
      className="relative flex flex-col items-center justify-center overflow-hidden py-16 md:h-screen"
    >
      <h2
        ref={headerRef}
        className="font-pragati z-10 pb-12 pt-32 text-2xl font-bold leading-tight tracking-tight text-white [text-shadow:0px_0px_40px_#6B21A8,0px_0px_20px_#6B21A8,0px_0px_10px_#6B21A8] md:pb-32 md:pt-12 md:text-5xl lg:text-6xl"
      >
        Previously Sponsored By
      </h2>
      <div
        ref={sponsorContainerRef}
        className="z-10 mx-auto flex w-full max-w-[50%] flex-wrap justify-center gap-6 px-4"
      >
        {companies.map((company, index) => (
          <SponsorCard
            key={company.name}
            sponsor={company.name}
            imgUrl={company.logo}
            index={index}
          />
        ))}
      </div>
    </section>
  );
}
