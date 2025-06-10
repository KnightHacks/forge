"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { ArrowRight } from "lucide-react";

import { PERMANENT_DISCORD_INVITE } from "@forge/consts/knight-hacks";

gsap.registerPlugin(ScrollTrigger);

export default function DiscordCTAButton({
  label = "Join Our Discord Community!",
}: {
  label?: string;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!buttonRef.current || !containerRef.current) return;

    gsap.fromTo(
      buttonRef.current,
      { opacity: 0, x: -150 },
      {
        opacity: 1,
        x: 0,
        duration: 2,
        ease: "bounce.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 75%",
          once: true,
        },
      },
    );
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative flex items-center justify-center py-20"
    >
      <div
        ref={buttonRef}
        className="relative z-0 flex max-w-max items-center overflow-hidden rounded-full p-[3px]"
      >
        <div className="moving-border absolute inset-0 h-full w-full rounded-full bg-[conic-gradient(from_0deg,#ec38bc_20deg,#f8c255_140deg,transparent_240deg)]" />
        <div className="relative z-10 flex items-center">
          <button
            onClick={() =>
              window.open(
                PERMANENT_DISCORD_INVITE,
                "_blank",
                "noopener,noreferrer",
              )
            }
            className="group relative flex w-[300px] items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-semibold text-[#ec38bc] transition-all duration-300 ease-in-out hover:bg-gradient-to-r hover:from-[#ec38bc] hover:via-[#f8c255] hover:to-[#ec38bc] hover:text-white md:w-[450px] md:text-xl"
          >
            <div className="absolute left-0 top-0 flex h-full w-11 items-center justify-end rounded-full bg-gradient-to-r from-[#ec38bc] via-[#f8c255] to-[#ec38bc] transition-all duration-200 ease-in-out group-hover:w-full">
              <span className="mr-3 text-white transition-all duration-200 ease-in-out group-hover:text-white">
                <ArrowRight size={20} />
              </span>
            </div>
            <span className="relative left-4 z-10 whitespace-nowrap transition-all duration-200 ease-in-out group-hover:-left-3">
              {label}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
