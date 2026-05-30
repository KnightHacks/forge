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
              "conic-gradient(from 0deg, #a8c490 0deg, #b8d4e8 120deg, #c9b8d8 240deg, #a8c490 360deg)",
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
            className="wc-btn group relative flex w-[280px] items-center px-8 py-3 text-sm md:w-[460px] md:text-xl"
          >
            <div className="absolute left-0 top-0 flex h-full w-11 items-center justify-end rounded-full bg-gradient-to-r from-[#a8c490] via-[#c4a882] to-[#c9b8d8] transition-all duration-500 ease-in-out group-hover:w-full">
              <span className="mr-3 text-white transition-all duration-500 ease-in-out">
                <ArrowRight size={20} />
              </span>
            </div>
            <span className="relative left-4 z-10 whitespace-nowrap transition-all duration-500 ease-in-out group-hover:-left-3 group-hover:text-white">
              {label}
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}
