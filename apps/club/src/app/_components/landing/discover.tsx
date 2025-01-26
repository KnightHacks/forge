"use client";

import { useRef } from "react";
import Image from "next/image";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

import { PERMANENT_DISCORD_INVITE } from "@forge/consts/knight-hacks";

import GroupSVG from "./assets/group";
import Counter from "./discover-assets/counter";
import DiscoverButton from "./discover-assets/discover-button";

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
        start: "top 60%",
        end: "bottom 20%",
        toggleActions: "play none none reverse",
      },
    });

    tl.fromTo(
      container,
      { backgroundColor: "rgba(15, 23, 42, 0)" }, // Changed color to match #0F172A
      { backgroundColor: "rgba(15, 23, 42, 1)", duration: 1 },
    )
      .fromTo(
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
      className="bg-custom-radial relative flex h-screen flex-col items-center justify-center overflow-hidden px-4"
    >
      <div className="z-10 flex flex-col items-center space-y-6 text-center">
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
            className="font-pragati max-w-2xl text-[28px] font-bold tracking-wide text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] md:text-[48px]"
          >
            Your Journey Begins Here
          </p>
        </div>
        <div ref={buttonRef}>
          <DiscoverButton
            text="Join the Community!"
            className="w-[300px] transform transition-all duration-300 hover:scale-105 hover:shadow-xl md:w-[450px]"
            onClick={() =>
              window.open(
                PERMANENT_DISCORD_INVITE as string,
                "_blank",
                "noopener,noreferrer",
              )
            }
          />
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

      <GroupSVG
        ref={groupRef}
        className="absolute top-10 hidden h-auto w-auto md:block"
      />
    </div>
  );
}
