"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import NeonTkSVG from "./assets/neon-tk";
import SwordSVG from "./assets/sword";

export default function About() {
  gsap.registerPlugin(ScrollTrigger);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const swordRef = useRef<SVGSVGElement | null>(null);
  const neonRef = useRef<SVGSVGElement | null>(null);

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top 60%",
        end: "bottom 20%",
        toggleActions: "play none none reverse",
      },
    });

    tl.fromTo(
      headerRef.current,
      { opacity: 0, y: -50, scale: 0.8 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.8,
        ease: "power2.out",
      },
    )
      .fromTo(
        textRef.current,
        { opacity: 0, y: 50, scale: 0.9 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          ease: "power2.out",
        },
        "-=0.4",
      )
      .fromTo(
        swordRef.current,
        { opacity: 0, x: 100, rotation: 15 },
        {
          opacity: 0.3,
          x: -30,
          rotation: 0,
          duration: 0.6,
          ease: "power2.in",
        },
        "-=0.2",
      )
      .fromTo(
        neonRef.current,
        { opacity: 0, x: -100, rotation: -15 },
        {
          opacity: 0.2,
          x: 0,
          rotation: 0,
          duration: 0.6,
          ease: "power2.in",
        },
        "-=0.4",
      );
  });

  return (
    <div
      ref={containerRef}
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-[#0F172A] to-[#1a0b2e]"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 opacity-50 blur-3xl"></div>

      <div className="relative z-10 mx-auto w-full max-w-4xl text-center">
        <h1
          ref={headerRef}
          className="font-pragati mb-6 text-2xl font-bold leading-tight tracking-tight text-white [text-shadow:0px_0px_40px_#6B21A8,0px_0px_20px_#6B21A8,0px_0px_10px_#6B21A8] md:text-5xl lg:text-6xl"
        >
          ABOUT US
        </h1>

        <div className="relative">
          <p
            ref={textRef}
            className="px-4 text-lg font-medium leading-relaxed tracking-wide text-white/80 md:px-12 md:text-2xl"
          >
            The FitnessGram™ Pacer Test is a multistage aerobic capacity test
            that progressively gets more difficult as it continues. The 20 meter
            pacer test will begin in 30 seconds. Line up at the start. The
            running speed starts slowly, but gets faster each minute after you
            hear this signal. [beep] A single lap should be completed each time
            you hear this sound. [ding] Remember to run in a straight line, and
            run as long as possible. The second time you fail to complete a lap
            before the sound, your test is over. The test will begin on the word
            start. On your mark, get ready, start.
          </p>
        </div>
      </div>

      <SwordSVG
        ref={swordRef}
        className="absolute -bottom-20 -right-6 hidden h-auto w-full max-w-[400px] transform text-purple-400 opacity-50 md:block"
      />
      <NeonTkSVG
        ref={neonRef}
        className="absolute -left-20 -top-20 hidden h-auto w-full max-w-[400px] transform text-purple-400 opacity-50 md:block"
      />
    </div>
  );
}
