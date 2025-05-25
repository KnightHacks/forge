"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import NeonTkSVG from "./assets/neon-tk";
import SwordSVG from "./assets/sword";

import NeonTkSVG from "./assets/neon-tk";
import SwordSVG from "./assets/sword";
import Expandable from "./impact-assets/expandable";

export default function Impact() {
  gsap.registerPlugin(useGSAP, ScrollTrigger);

  const [inView, setInView] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const impactTextRef = useRef<HTMLHeadingElement | null>(null);
  const expandableRef = useRef<HTMLDivElement | null>(null);

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 80%",
        end: "bottom 20%",
        once: true,
        onEnter: () => setInView(true),
      },
    });

    tl.fromTo(
      headerRef.current,
      {
        opacity: 0,
        y: 50,
        scale: 0.8,
      },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        ease: "power2.out",
      },
    ).fromTo(
      impactTextRef.current,
      {
        opacity: 0,
        scale: 0.5,
      },
      {
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: "back.out(1.7)",
      },
    );
  });

  return (
    <div
      ref={containerRef}
      className="relative flex h-screen min-h-screen flex-col items-center justify-center"
    >
      <NeonTkSVG className="animate-float absolute bottom-[-151px] left-[-40px] hidden w-[300px] text-purple-400 opacity-50 md:block" />
      <SwordSVG className="animate-float absolute bottom-[-70px] right-20 hidden w-[300px] text-purple-500 opacity-50 md:block" />
      <div
        ref={headerRef}
        className="mb-3 flex items-center justify-center md:space-x-4"
      >
        <p className="font-pragati mr-3 text-xl font-bold tracking-wide text-white [text-shadow:0px_0px_40px_#6B21A8,0px_0px_20px_#6B21A8,0px_0px_10px_#6B21A8] md:text-3xl">
          How we make an
        </p>
        <h1
          ref={impactTextRef}
          className="animate-pulse bg-gradient-to-r from-white via-purple-300 to-purple-800 bg-clip-text text-4xl font-black text-transparent md:text-6xl"
        >
          IMPACT
        </h1>
      </div>
      <div
        ref={expandableRef}
        className="mt-32 flex h-[600px] w-full items-center justify-center md:w-2/3 xl:h-[700px]"
      >
        <Expandable autoPlay={inView} />
      </div>
    </div>
  );
}
