"use client";

import { useRef } from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

import { DISCORD } from "@forge/consts";

import CoolButton2 from "./assets/coolbutton2";
import NeonTkSVG from "./assets/neon-tk";
import Counter from "./discover-assets/counter";

export default function Discover({ memberCount }: { memberCount: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<SVGSVGElement>(null);

  gsap.registerPlugin(ScrollTrigger);

  useGSAP(() => {
    const container = containerRef.current;
    const counter = counterRef.current;
    const text = textRef.current;
    const button = buttonRef.current;
    const logo = logoRef.current;
    const group = groupRef.current;

    if (!container || !counter || !text || !button || !logo) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: container,
        start: "top 50%",
        end: "bottom 20%",
        once: true,
      },
    });

    tl.fromTo(
      group,
      { opacity: 0, y: 50 },
      { opacity: 100, y: 0, duration: 1 },
      0.2,
    )
      .fromTo(
        counter,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.8 },
        0.4,
      )
      .fromTo(
        text,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.8 },
        0.6,
      )
      .fromTo(
        logo,
        { opacity: 0, rotation: -10, scale: 0.8 },
        { opacity: 0.6, rotation: 0, scale: 1, duration: 0.7 },
        0.8,
      )
      .fromTo(
        button,
        { opacity: 0, x: -150 },
        { opacity: 1, x: 0, duration: 2.0, ease: "bounce.out" },
        1.3,
      );
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#1b112b] via-[#331d52] to-[#4c1d95] px-4"
    >
      <NeonTkSVG className="animate-float absolute left-20 top-20 hidden w-[250px] text-purple-500 opacity-50 md:block" />
      <div className="z-10 mb-48 flex flex-col items-center space-y-6 text-center md:mb-0">
        <div className="flex flex-col items-center space-y-4">
          <div ref={counterRef} className="flex items-baseline gap-3">
            <Counter
              targetValue={memberCount}
              className="font-pragati animate-shine bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-300 bg-clip-text text-[40px] font-extrabold leading-none tracking-wide text-transparent md:text-[70px]"
            />
            <span className="font-pragati text-[28px] font-bold tracking-wide text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] md:text-[44px]">
              Active Members
            </span>
          </div>
          <p
            ref={textRef}
            className="font-pragati max-w-2xl pb-16 text-[28px] font-bold tracking-wide text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] md:text-[48px]"
          >
            Your Journey Begins Here
          </p>
        </div>
        <div
          ref={buttonRef}
          className="relative z-0 flex max-w-max items-center overflow-hidden rounded-full p-[3px]"
        >
          <div className="moving-border absolute inset-0 h-full w-full rounded-full bg-[conic-gradient(from_0deg,#9722b6_20deg,#8b5cf6_140deg,transparent_240deg)]" />
          <div className="relative z-10 flex items-center">
            <CoolButton2
              label="Join the Community!"
              className="flex w-[300px] items-center justify-center md:w-[450px]"
              onClick={() =>
                window.open(
                  DISCORD.PERMANENT_INVITE as string,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            />
          </div>
        </div>
      </div>

      <div ref={logoRef} className="absolute bottom-0 right-0 opacity-60">
        <Image
          src="/tk.svg"
          alt="Community Logo"
          width={300}
          height={300}
          className="h-auto w-auto select-none"
        />
      </div>
    </div>
  );
}
