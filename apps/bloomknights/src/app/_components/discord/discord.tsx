"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";
import { ArrowRight } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export default function DiscordCTAButton({
  label = "Join Our Discord Community! 🌷",
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
        <div
          className="moving-border absolute inset-0 h-full w-full rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, #a8d471 0deg, #fcbc4e 120deg, #fe73fe 240deg, #a8d471 360deg)",
          }}
        />
        <div className="relative z-10 flex items-center">
          <button
            onClick={() =>
              window.open(
                "https://discord.com/invite/Kv5g9vf",
                "_blank",
                "noopener,noreferrer",
              )
            }
            className="font-fredoka group relative flex w-[280px] items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-semibold uppercase tracking-wide text-[#a8d471] transition-all duration-500 ease-in-out hover:scale-105 hover:bg-gradient-to-r hover:from-[#a8d471] hover:via-[#fcbc4e] hover:to-[#fe73fe] hover:text-white md:w-[460px] md:text-xl"
          >
            <div className="absolute left-0 top-0 flex h-full w-11 items-center justify-end rounded-full bg-gradient-to-r from-[#a8d471] via-[#fcbc4e] to-[#fe73fe] transition-all duration-500 ease-in-out group-hover:w-full">
              <span className="mr-3 text-white transition-all duration-500 ease-in-out group-hover:text-white">
                <ArrowRight size={20} />
              </span>
            </div>
            <span className="relative left-4 z-10 whitespace-nowrap transition-all duration-500 ease-in-out group-hover:-left-3">
              {label}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
