"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

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
      className="flex h-screen min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#1a0b2e] via-[#120624] to-[#0F172A]"
    >
      <div ref={headerRef} className="mb-3 flex items-center justify-center">
        <p className="font-pragati mr-3 text-xl font-bold tracking-wide text-white/80 md:text-3xl">
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
        className="flex h-[600px] w-full items-center justify-center md:w-2/3"
      >
        <Expandable autoPlay={inView} />
      </div>
    </div>
  );
}
