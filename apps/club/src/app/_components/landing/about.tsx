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
        start: "top 80%",
        end: "bottom 20%",
        once: true,
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
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-[#0F172A] via-[#1a0b2e] to-[#1a0b2e]"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 to-indigo-900/20 opacity-50 blur-3xl"></div>

      <div className="relative z-10 mx-auto w-full max-w-4xl text-center">
        <h1
          ref={headerRef}
          className="mb-4 bg-gradient-to-r from-white via-purple-300 to-purple-900 bg-clip-text text-4xl font-black text-transparent md:text-6xl"
        >
          ABOUT US
        </h1>

        <div className="relative">
          <p
            ref={textRef}
            className="font-poppins px-4 text-lg font-semibold leading-relaxed tracking-wide text-white/80 md:px-12 md:text-2xl"
          >
            Knight Hacks is the largest Software Development and only Hackathon
            organization at the University of Central Florida. Our mission is to
            serve the technologist community of Florida by running various
            workshops to sharpen technical skills, socials to help foster a
            passionate community, and projects/mentorship programs to help
            refine professional skills. Every October, we run our annual
            Hackathon, welcoming hundreds of passionate students from all
            throughout the nation to UCF for a weekend full of programming!
            Passion is contagious, and Knight Hacks is a super spreader.
          </p>
        </div>
      </div>

      <SwordSVG
        ref={swordRef}
        className="absolute -bottom-20 -right-1 hidden h-auto w-full max-w-[400px] transform text-purple-400 opacity-50 md:block"
      />
      <NeonTkSVG
        ref={neonRef}
        className="absolute left-10 top-16 hidden h-[200px] w-full max-w-[400px] transform text-purple-400 opacity-50 md:block"
      />
    </div>
  );
}
