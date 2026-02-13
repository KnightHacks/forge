"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/dist/ScrollTrigger";

import { OFFICERS } from "@forge/consts/knight-hacks";

import OfficerCard from "./assets/officer-card";

export default function Officers() {
  gsap.registerPlugin(useGSAP, ScrollTrigger);
  const officersRef = useRef<(HTMLDivElement | null)[]>([]);

  useGSAP(() => {
    officersRef.current.forEach((card, index) => {
      if (!card) return;

      const commonToProps = {
        duration: 1,
        opacity: 1,
        ease: "power2.out",
      };

      gsap.fromTo(
        card,
        {
          x: index % 2 === 0 ? -50 : 50,
          opacity: 0,
        },
        {
          x: 0,
          ...commonToProps,
          scrollTrigger: {
            trigger: card,
            start: "top 85%",
            end: "bottom 25%",
            once: true,
          },
        },
      );
    });
  });

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 py-14 md:grid-cols-2">
      {OFFICERS.map((officer, index) => (
        <div
          key={index}
          ref={(el) => {
            officersRef.current[index] = el;
          }}
        >
          <OfficerCard
            image={officer.image}
            name={officer.name}
            linkedin={officer.linkedin}
            position={officer.position}
            major={officer.major}
          />
        </div>
      ))}
    </div>
  );
}
